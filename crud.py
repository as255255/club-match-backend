from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
import models
import schemas
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
# ==========================================
# 1. 用户模块 (User)
# ==========================================
def get_user_by_student_id(db: Session, student_id: str):
    """根据学号查询用户（用于登录/注册校验）"""
    return db.query(models.User).filter(models.User.student_id == student_id).first()

# 把原来的 create_user 替换成下面这个：
def create_user(db: Session, user: schemas.UserCreate, hashed_password: str):
    # 把加密后的密码存进数据库
    db_user = models.User(
        student_id=user.student_id,
        name=user.name,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ==========================================
# 2. 社团与岗位模块 (Club & Role)
# ==========================================
def get_clubs(db: Session, category: str = None, status: str = "APPROVED", skip: int = 0, limit: int = 20):
    """获取社团列表（支持条件筛选与分页）"""
    query = db.query(models.Club).filter(models.Club.status == status)
    if category:
        query = query.filter(models.Club.category == category)
    # 按创建时间倒序排
    return query.order_by(desc(models.Club.created_at)).offset(skip).limit(limit).all()

def get_club_by_id(db: Session, club_id: int):
    """获取社团详情（包含下属招新岗位）"""
    # 使用 joinedload 提前把 roles 查出来，防止 N+1 查询问题
    return db.query(models.Club).options(joinedload(models.Club.roles)).filter(models.Club.id == club_id).first()

# ==========================================
# 3. 报名模块 (Application) - 核心难点
# ==========================================
def create_application(db: Session, user_id: int, application: schemas.ApplicationCreate):
    """
    提交报名：需要同时写入 applications 表和 application_answers 表
    """
    try:
        # 1. 创建报名主记录
        db_app = models.Application(
            user_id=user_id,
            club_id=application.club_id,
            role_id=application.role_id,
            status="PENDING"
        )
        db.add(db_app)
        db.flush()  # flush 获取到自增的 db_app.id，但不真正提交到数据库

        # 2. 如果有补充问题，批量写入答案
        if application.answers:
            db_answers = [
                models.ApplicationAnswer(
                    application_id=db_app.id,
                    question_id=ans.question_id,
                    answer=ans.answer
                ) for ans in application.answers
            ]
            db.add_all(db_answers)

        # 3. 全部成功后统一提交事务
        db.commit()
        db.refresh(db_app)
        return db_app

    except IntegrityError:
        # 🌟 核心修复：捕获数据库唯一索引冲突，体面地返回 400 错误，彻底解决 CORS 幽灵报错！
        db.rollback()
        raise HTTPException(status_code=400, detail="您已经报过这个岗位啦，请勿重复提交！")

    except Exception as e:
        # 捕获其他未知错误
        db.rollback()
        print(f"报名接口发生未知错误: {e}")  # 在服务器后台打印具体错误
        raise HTTPException(status_code=500, detail="服务器内部错误，请稍后再试")
def get_user_applications(db: Session, user_id: int, skip: int = 0, limit: int = 20):
    """查询学生的报名记录（联合查询社团和岗位信息）"""
    return db.query(models.Application)\
        .options(
            joinedload(models.Application.club),
            joinedload(models.Application.role),
            joinedload(models.Application.answers)
        )\
        .filter(models.Application.user_id == user_id)\
        .order_by(desc(models.Application.submitted_at))\
        .offset(skip).limit(limit).all()

def update_application_status(db: Session, application_id: int, new_status: str):
    """社团管理员更新报名状态"""
    db_app = db.query(models.Application).filter(models.Application.id == application_id).first()
    if db_app:
        db_app.status = new_status
        db.commit()
        db.refresh(db_app)
    return db_app
def get_club_applications(db: Session, club_id: int, skip: int = 0, limit: int = 50):
    """[B端] 查询某个社团收到的所有报名记录"""
    return db.query(models.Application)\
        .options(
            joinedload(models.Application.user),    # 联表带出学生信息
            joinedload(models.Application.role),    # 联表带出申请的岗位
            joinedload(models.Application.answers)  # 联表带出补充问题的回答
        )\
        .filter(models.Application.club_id == club_id)\
        .order_by(desc(models.Application.submitted_at))\
        .offset(skip).limit(limit).all()

def update_application_status(db: Session, application_id: int, new_status: str):
    """[B端] 部长修改新生简历的录取状态"""
    app_record = db.query(models.Application).filter(models.Application.id == application_id).first()
    if app_record:
        app_record.status = new_status
        db.commit()
        db.refresh(app_record)
    return app_record
# ==========================================
# [新增] B端：社团多账号与权限管理逻辑
# ==========================================

# 1. 升级版创建社团：谁创建，谁就是部长 (OWNER)
def create_club_with_owner(db: Session, club: schemas.ClubCreate, user_id: int):
    # 第一步：先创建社团主体
    new_club = models.Club(**club.model_dump(), status="APPROVED")
    db.add(new_club)
    db.flush()  # flush 能让我们立刻拿到 new_club.id，但先不正式提交事务

    # 第二步：将当前创建者绑定为该社团的部长 (OWNER)，且直接通过审核
    club_admin = models.ClubAdmin(
        user_id=user_id,
        club_id=new_club.id,
        role="OWNER",
        status="APPROVED"
    )
    db.add(club_admin)
    db.commit()
    db.refresh(new_club)
    return new_club


# 2. 申请加入已有社团的管理团队
def apply_for_club_admin(db: Session, club_id: int, user_id: int):
    # 检查是否已经申请过，防止重复提交
    existing = db.query(models.ClubAdmin).filter(
        models.ClubAdmin.club_id == club_id,
        models.ClubAdmin.user_id == user_id
    ).first()
    if existing:
        return existing

    new_admin = models.ClubAdmin(
        user_id=user_id,
        club_id=club_id,
        role="ADMIN",  # 申请的都是普通管理
        status="PENDING"  # 等待部长审核
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    return new_admin


# 3. 部长获取本社团所有的管理员和申请列表
def get_club_admins(db: Session, club_id: int):
    return db.query(models.ClubAdmin).options(
        joinedload(models.ClubAdmin.user)
    ).filter(models.ClubAdmin.club_id == club_id).all()


# 4. 部长审批别人的申请 (同意/拒绝)
def update_admin_status(db: Session, club_id: int, target_user_id: int, new_status: str):
    admin_record = db.query(models.ClubAdmin).filter(
        models.ClubAdmin.club_id == club_id,
        models.ClubAdmin.user_id == target_user_id
    ).first()

    if admin_record:
        admin_record.status = new_status
        db.commit()
        db.refresh(admin_record)
    return admin_record