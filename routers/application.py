from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
import crud, schemas
from database import get_db
from fastapi import APIRouter, Depends, Query, HTTPException
# 🌟 核心：引入咱们写的 JWT 保安函数
from routers.user import get_current_user_id

router = APIRouter(prefix="/api/applications", tags=["Applications (报名模块)"])

# 1. 提交报名
@router.post("/", response_model=schemas.ApplicationResponse)
def create_application(
    application: schemas.ApplicationCreate,
    current_user_id: int = Depends(get_current_user_id), # 👈 经过保安核实身份
    db: Session = Depends(get_db)
):
    return crud.create_application(db=db, application=application, user_id=current_user_id)

# 2. 我的报名记录
@router.get("/", response_model=List[schemas.ApplicationResponse])
def get_my_applications(
    current_user_id: int = Depends(get_current_user_id), # 👈 经过保安核实身份
    db: Session = Depends(get_db)
):
    return crud.get_user_applications(db=db, user_id=current_user_id)

# 3. 社团后台查看收到的报名 (这个保持不变)
@router.get("/club/{club_id}", response_model=List[schemas.ApplicationResponse])
def get_club_applications_list(
    club_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    return crud.get_club_applications(db=db, club_id=club_id, skip=skip, limit=limit)


# 1. 确保文件顶部有这个引入
from pydantic import BaseModel

# 2. 定义前端传过来的 JSON 数据结构
class StatusUpdate(BaseModel):
    status: str

# 3. 替换掉你原来的 @router.patch 接口
@router.put("/{application_id}/status", response_model=schemas.ApplicationResponse)
def change_application_status(
        application_id: int,
        payload: StatusUpdate, # 🌟 接收 JSON Body 而不是 Query
        current_user_id: int = Depends(get_current_user_id),
        db: Session = Depends(get_db)
):
    """
    [B端] 社团管理员更改某个申请的状态
    """
    updated_app = crud.update_application_status(db=db, application_id=application_id, new_status=payload.status)
    if not updated_app:
        raise HTTPException(status_code=404, detail="找不到该报名记录")

    return updated_app