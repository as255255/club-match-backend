import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List
import crud, schemas, models
from database import get_db
from passlib.context import CryptContext

router = APIRouter(prefix="/api/users", tags=["Users (用户模块)"])

# ==========================================
# 🔐 安全配置
# ==========================================
SECRET_KEY = "club_match_super_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


# ==========================================
# 1. 核心保安：解析 Token 并验证身份
# ==========================================
def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录，请先登录！")

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="无效凭证")

        # 🌟 关键：直接从数据库取出完整的用户对象，方便后续检查 role
        user = db.query(models.User).filter(models.User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail="用户不存在")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登录已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="非法凭证")
def get_current_user_id(authorization: str = Header(None), db: Session = Depends(get_db)):
    user = get_current_user(authorization, db)
    return user.id
def get_current_user_id(authorization: str = Header(None), db: Session = Depends(get_db)):
    """
    这是一个兼容层，为了不让 club.py 等文件报错。
    它调用新的 get_current_user 并只返回 ID。
    """
    user = get_current_user(authorization, db)
    return user.id
# ==========================================
# 2. 注册接口 (支持角色区分)
# ==========================================
@router.post("/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_student_id(db, student_id=user.student_id)
    if db_user:
        raise HTTPException(status_code=400, detail="该学号已被注册！")

    hashed_pw = get_password_hash(user.password)

    # 🌟 修复点：确保 user.role 被传给数据库
    new_user = models.User(
        student_id=user.student_id,
        name=user.name,
        hashed_password=hashed_pw,
        role=user.role  # 存储角色：student 或 admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "注册成功！", "role": new_user.role}


# ==========================================
# 3. 登录接口 (返回 Role 供前端跳转)
# ==========================================
@router.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_student_id(db, student_id=user.student_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="学号不存在！")

    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="密码错误！")

    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(db_user.id), "exp": expire}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # 🌟 核心修复：返回 role 字段，前端才能根据它判断谁是部长
    return {
        "id": db_user.id,
        "name": db_user.name,
        "role": db_user.role,
        "token": token
    }


# ==========================================
# 4. 标签/画像相关 (保持精简)
# ==========================================
@router.get("/tags", response_model=List[schemas.TagResponse])
def get_all_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).filter(models.Tag.is_active == True).all()


@router.post("/{user_id}/tags")
def update_user_tags(user_id: int, tag_ids: List[int], db: Session = Depends(get_db)):
    db.query(models.UserTag).filter(models.UserTag.user_id == user_id).delete()
    for tid in tag_ids:
        db.add(models.UserTag(user_id=user_id, tag_id=tid))
    db.commit()
    return {"message": "画像更新成功"}