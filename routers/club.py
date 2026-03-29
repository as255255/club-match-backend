from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict
from pydantic import BaseModel

import models, schemas, crud
from database import get_db
from algorithm import get_recommended_clubs
# 🌟 统一从这里引入，不再重复导入
from routers.user import get_current_user_id, get_current_user

router = APIRouter(prefix="/api/clubs", tags=["Clubs"])

# --- 岗位管理相关的模型 ---
class QuestionItem(BaseModel):
    question_id: str
    title: str

class RoleCreate(BaseModel):
    name: str
    requirements: str
    extra_questions: List[QuestionItem] = []

# ================= 核心接口 =================

@router.get("/", response_model=List[schemas.ClubResponse])
def get_clubs(category: str = Query(None), db: Session = Depends(get_db)):
    query = db.query(models.Club).filter(models.Club.status == "APPROVED")
    if category:
        query = query.filter(models.Club.category == category)
    return query.all()

# 🌟 核心修复 1：将静态路由（推荐接口）提到动态路由上方，并修正路径与前端彻底对齐
@router.get("/recommendations/smart", tags=["Recommendations"])
def get_smart_recommendations(
        top_n: int = 10,
        user: models.User = Depends(get_current_user), # 获取当前登录的这个学生
        db: Session = Depends(get_db)
):
    """[C端] 智能获取推荐社团列表 (基于余弦相似度)"""
    # 1. 提取当前学生的画像标签
    user_tags_orm = db.query(models.UserTag).options(joinedload(models.UserTag.tag)).filter(
        models.UserTag.user_id == user.id).all()
    user_tags_dict: Dict[str, float] = {ut.tag.name: float(ut.weight) for ut in user_tags_orm}

    # 如果这个学生是个纯小白（还没填画像），直接推荐最新成立的社团
    if not user_tags_dict:
        clubs = db.query(models.Club).filter(models.Club.status == "APPROVED").order_by(
            models.Club.created_at.desc()).limit(top_n).all()
        return [{"club": club, "match_score": 0, "reason": "热门推荐"} for club in clubs]

    # 2. 提取全校所有社团的画像特征
    clubs = db.query(models.Club).options(
        joinedload(models.Club.tags).joinedload(models.ClubTag.tag),
        joinedload(models.Club.roles)
    ).filter(models.Club.status == "APPROVED").all()

    all_clubs_tags: Dict[int, Dict[str, float]] = {}
    club_map = {}
    for c in clubs:
        all_clubs_tags[c.id] = {ct.tag.name: float(ct.weight) for ct in c.tags}
        club_map[c.id] = c

    # 3. 呼叫算法大脑，计算匹配度
    recommendations = get_recommended_clubs(user_tags_dict, all_clubs_tags, top_n)

    # 4. 把计算结果打包发给前端
    result = []
    for rec in recommendations:
        club_info = club_map[rec["club_id"]]
        result.append({
            "club": club_info,
            "match_score": rec["match_score"],
            "reason": rec["reason"]
        })

    return result

# 🌟 核心修复 2：带有参数的动态路由老老实实放在静态路由下面，防止拦截
@router.get("/{club_id}", response_model=schemas.ClubResponse)
def get_club_detail(club_id: int, db: Session = Depends(get_db)):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="社团不存在")
    return club

@router.post("/", response_model=schemas.ClubResponse)
def create_club(
        club: schemas.ClubCreate,
        user_id: int = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """[B端] 创建社团"""
    return crud.create_club_with_owner(db=db, club=club, user_id=user_id)

@router.put("/{club_id}", response_model=schemas.ClubResponse)
def update_club(
        club_id: int,
        club_in: schemas.ClubCreate,
        user: models.User = Depends(get_current_user),  # 🌟 这里改用 get_current_user，方便校验权限
        db: Session = Depends(get_db)
):
    """[B端] 修改社团信息"""
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club: raise HTTPException(status_code=404, detail="社团不存在")

    # 以后可以在这里加: if club.owner_id != user.id: raise ...

    club.name, club.category = club_in.name, club_in.category
    club.description, club.cover_image = club_in.description, club_in.cover_image
    db.commit()
    return club


@router.post("/{club_id}/roles")
def create_club_role(club_id: int, role_in: RoleCreate, db: Session = Depends(get_db)):
    """[B端] 发布岗位"""
    # 🌟 修复点 1：使用正统的 RecruitmentRole 表，并将前端的 name 映射到后端的 role_name
    new_role = models.RecruitmentRole(
        club_id=club_id,
        role_name=role_in.name,
        requirements=role_in.requirements,
        extra_questions=[q.model_dump() for q in role_in.extra_questions],
        status="OPEN"
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    return new_role


@router.get("/{club_id}/roles")
def get_club_roles(club_id: int, db: Session = Depends(get_db)):
    """[C端] 获取岗位列表"""
    # 🌟 修复点 2：从正统的 RecruitmentRole 表里去查询
    roles = db.query(models.RecruitmentRole).filter(models.RecruitmentRole.club_id == club_id).all()

    # 🌟 修复点 3：为了不让前端大改代码，这里手动把 role_name 包装成前端期望的 name 字段
    return [
        {
            "id": r.id,
            "name": r.role_name,
            "requirements": r.requirements,
            "extra_questions": r.extra_questions
        }
        for r in roles
    ]

@router.post("/{club_id}/admins/apply")
def apply_club_admin(
    club_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """[B端] 申请成为已有社团的管理干事"""
    # 这里做个简单的占位成功响应，保障前端流程能走通
    return {"message": "申请已发送，等待现任部长审批", "status": "PENDING"}