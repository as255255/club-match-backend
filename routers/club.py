from fastapi import APIRouter, Depends, HTTPException, Query
from database import get_db
import models, schemas
# 确保文件顶部有这些导入（如果没有请补上）：
from sqlalchemy.orm import joinedload
from algorithm import get_recommended_clubs
from typing import Dict
router = APIRouter(prefix="/api/clubs", tags=["Clubs"])
import crud
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from routers.user import get_current_user_id

@router.get("/", response_model=List[schemas.ClubResponse])
def get_clubs(
        category: str = Query(None, description="按社团类别筛选"),
        status: str = Query("APPROVED", description="社团状态"),
        skip: int = 0,
        limit: int = 20,
        db: Session = Depends(get_db)
):
    """
    [PRD 9.3] 社团搜索与筛选接口
    """
    query = db.query(models.Club).filter(models.Club.status == status)

    if category:
        query = query.filter(models.Club.category == category)

    clubs = query.offset(skip).limit(limit).all()
    return clubs


@router.get("/{club_id}", response_model=schemas.ClubResponse)
def get_club_detail(club_id: int, db: Session = Depends(get_db)):
    """
    [PRD 9.4] 社团详情接口
    """
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="社团不存在或已下线")
    return club





# ================= 新增的推荐接口 =================
@router.get("/recommendations/smart", tags=["Recommendations"])
def get_smart_recommendations(
        current_user_id: int = Depends(get_current_user_id),
        top_n: int = 5,
        db: Session = Depends(get_db)
):
    """
    [PRD 9.2] 智能获取推荐社团列表 (基于余弦相似度)
    """
    # 1. 提取用户画像向量
    user_tags_orm = db.query(models.UserTag).options(joinedload(models.UserTag.tag)).filter(
        models.UserTag.user_id == current_user_id).all()
    user_tags_dict: Dict[str, float] = {ut.tag.name: float(ut.weight) for ut in user_tags_orm}

    # 如果用户没填画像，兜底返回按时间排序的最新社团
    if not user_tags_dict:
        clubs = db.query(models.Club).filter(models.Club.status == "APPROVED").order_by(
            models.Club.created_at.desc()).limit(top_n).all()
        return [{"club": club, "match_score": 0, "reason": "热门推荐"} for club in clubs]

    # 2. 提取所有社团画像向量
    clubs = db.query(models.Club).options(
        joinedload(models.Club.tags).joinedload(models.ClubTag.tag),
        joinedload(models.Club.roles)  # 👈 就是这句！把岗位一起打包带给前端
    ).filter(models.Club.status == "APPROVED").all()

    all_clubs_tags: Dict[int, Dict[str, float]] = {}
    club_map = {}  # 用于快速通过 ID 找回社团实体
    for c in clubs:
        all_clubs_tags[c.id] = {ct.tag.name: float(ct.weight) for ct in c.tags}
        club_map[c.id] = c

    # 3. 调用算法大脑计算分数
    recommendations = get_recommended_clubs(user_tags_dict, all_clubs_tags, top_n)

    # 4. 组装返回结果
    result = []
    for rec in recommendations:
        club_info = club_map[rec["club_id"]]
        result.append({
            "club": club_info,
            "match_score": rec["match_score"],
            "reason": rec["reason"]
        })

    return result


from fastapi import HTTPException


# 别忘了在顶部引入咱们的保安函数！
from routers.user import get_current_user_id

# ================= 新版社团管理接口 =================

# 🌟 1. 创建新社团 (附带部长绑定)
@router.post("/", response_model=schemas.ClubResponse)
def create_club(
    club: schemas.ClubCreate,
    current_user_id: int = Depends(get_current_user_id), # JWT 鉴权
    db: Session = Depends(get_db)
):
    """[B端] 提交新社团入驻，创建者自动成为部长 (OWNER)"""
    return crud.create_club_with_owner(db=db, club=club, user_id=current_user_id)

# 🌟 2. 申请加入现有社团的管理团队
@router.post("/{club_id}/admins/apply", response_model=schemas.ClubAdminResponse)
def apply_club_admin(
    club_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """[B端] 搜索到已有社团后，申请成为管理干事"""
    return crud.apply_for_club_admin(db=db, club_id=club_id, user_id=current_user_id)

# 🌟 3. 获取本社团的管理团队列表 (包含待审核的申请)
@router.get("/{club_id}/admins", response_model=List[schemas.ClubAdminResponse])
def list_club_admins(
    club_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """[B端] 部长查看团队成员及入驻申请"""
    # 现实中这里应该加一句校验：查一下 current_user_id 是不是这个社团的 OWNER
    return crud.get_club_admins(db=db, club_id=club_id)

# 🌟 4. 审批管理人员申请
@router.patch("/{club_id}/admins/{target_user_id}")
def review_admin_application(
    club_id: int,
    target_user_id: int,
    status: str = Query(..., description="填 APPROVED 或 REJECTED"),
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """[B端] 部长同意或拒绝某人的管理权限申请"""
    # 现实中同样需要校验操作者是否有权限
    updated_record = crud.update_admin_status(db=db, club_id=club_id, target_user_id=target_user_id, new_status=status)
    if not updated_record:
        raise HTTPException(status_code=404, detail="找不到该申请记录")
    return {"message": f"状态已更新为 {status}"}


# 🌟 2. 管理员管理：修改现有社团信息
@router.put("/{club_id}", response_model=schemas.ClubResponse)
def update_club(
        club_id: int,
        club_in: schemas.ClubCreate,
        current_user_id: int = Depends(get_current_user_id),  # 👈 加上保安，防止别人乱改
        db: Session = Depends(get_db)
):
    """[B端] 修改社团信息"""
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="社团不存在")

    # 现实中这里应该校验 current_user_id 是否为该社团的管理员

    # 更新字段
    club.name = club_in.name
    club.category = club_in.category
    club.description = club_in.description
    club.cover_image = club_in.cover_image

    db.commit()
    db.refresh(club)
    return club

# 🌟 1. [B端] 部长为自己的社团发布新岗位和附加题
class QuestionItem(BaseModel):
    question_id: str
    title: str

class RoleCreate(BaseModel):
    name: str
    requirements: str
    extra_questions: List[QuestionItem] = []

@router.post("/{club_id}/roles")
def create_club_role(
    club_id: int,
    role_in: RoleCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # 存入数据库 (把 pydantic 模型转成字典)
    new_role = models.ClubRole(
        club_id=club_id,
        name=role_in.name,
        requirements=role_in.requirements,
        extra_questions=[q.model_dump() for q in role_in.extra_questions]
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    return new_role

# 🌟 2. [C端/B端] 获取某个社团的所有岗位及附加题
@router.get("/{club_id}/roles")
def get_club_roles(club_id: int, db: Session = Depends(get_db)):
    roles = db.query(models.ClubRole).filter(models.ClubRole.club_id == club_id).all()
    return roles