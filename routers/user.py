import jwt
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List
import crud, schemas, models
from database import get_db
from passlib.context import CryptContext # 引入密码加密工具
router = APIRouter(prefix="/api/users", tags=["Users (用户模块)"])

# ==========================================
# 🔐 JWT 安全配置 (生产环境建议写在 .env 文件里)
# ==========================================
SECRET_KEY = "club_match_super_secret_key"  # 你的专属加密密钥
ALGORITHM = "HS256"  # 加密算法
ACCESS_TOKEN_EXPIRE_DAYS = 7  # Token 有效期 (7天免登录)


# ==========================================
# 1. 核心保安：解析前端传来的 Token (供其他路由调用)
# ==========================================
def get_current_user_id(authorization: str = Header(None)):
    """
    这是一个全局依赖函数 (保安)。
    前端每次发请求，必须在请求头 (Headers) 里带上: Authorization: Bearer <token>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录或 Token 缺失，请先登录！")

    # 把 "Bearer xxxxx.yyyyy.zzzzz" 切割，只取后面的 token 部分
    token = authorization.split(" ")[1]
    try:
        # 尝试用我们的专属密钥解开这个 token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # 把里面藏着的 user_id (也就是 sub 字段) 拿出来
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="无效的凭证")
        return int(user_id)

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="非法的 Token 凭证")


# ==========================================
# 2. 登录/注册接口：核对身份并颁发 Token
# ==========================================
@router.post("/profile")
def create_or_login_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """处理新生/管理员的登录请求，并下发通行证 (Token)"""
    # 1. 去数据库里查这个学号注册过没有
    db_user = crud.get_user_by_student_id(db, student_id=user.student_id)

    # 2. 如果没注册过，就当场给他建一个新账号
    if not db_user:
        db_user = crud.create_user(db=db, user=user)

    # 3. 制作一张有时效的“数字身份牌” (Token)
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    # sub (subject) 通常用来存用户的唯一标识
    payload = {
        "sub": str(db_user.id),
        "exp": expire
    }
    # 使用密钥进行签名加密
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    # 4. 把用户信息和签发好的 Token 一起扔回给前端
    return {
        "id": db_user.id,
        "name": db_user.name,
        "token": token
    }


# ==========================================
# 3. 标签相关接口 (之前写好的，保持不变)
# ==========================================
@router.get("/tags", response_model=List[schemas.TagResponse])
def get_all_tags(db: Session = Depends(get_db)):
    """获取所有启用的兴趣/技能标签"""
    return db.query(models.Tag).filter(models.Tag.is_active == True).all()


# 接收前端传来的标签 ID 列表的简易校验模型
from pydantic import BaseModel


class UserTagUpdate(BaseModel):
    tag_ids: List[int]


@router.post("/{user_id}/tags")
def update_user_tags(
        user_id: int,
        tags_in: UserTagUpdate,
        db: Session = Depends(get_db)
):
    """保存或更新用户的画像标签"""
    db.query(models.UserTag).filter(models.UserTag.user_id == user_id).delete()

    new_tags = [
        models.UserTag(user_id=user_id, tag_id=tag_id, weight=1.0)
        for tag_id in tags_in.tag_ids
    ]
    db.add_all(new_tags)
    db.commit()

    return {"message": "兴趣画像保存成功！"}


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


# ==========================================
# 1. 注册接口
# ==========================================
@router.post("/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 先检查学号有没有被注册过
    db_user = crud.get_user_by_student_id(db, student_id=user.student_id)
    if db_user:
        raise HTTPException(status_code=400, detail="该学号已被注册！请直接登录。")

    # 密码加密后存入数据库
    hashed_pw = get_password_hash(user.password)
    new_user = crud.create_user(db=db, user=user, hashed_password=hashed_pw)

    return {"message": "注册成功，请去登录吧！"}


# ==========================================
# 2. 登录接口 (核对密码并颁发 Token)
# ==========================================
@router.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    # 1. 查有没有这个人
    db_user = crud.get_user_by_student_id(db, student_id=user.student_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="学号不存在，请先注册！")

    # 2. 核对密码对不对
    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="密码错误！")

    # 3. 密码正确，颁发 Token
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(db_user.id), "exp": expire}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "id": db_user.id,
        "name": db_user.name,
        "token": token
    }