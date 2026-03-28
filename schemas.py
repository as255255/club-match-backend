from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

# ==========================================
# 1. 通用配置 (Pydantic V2 风格)
# ==========================================
class ORMBaseModel(BaseModel):
    class Config:
        from_attributes = True  # 允许直接从 SQLAlchemy 的 ORM 对象转换过来

# ==========================================
# 2. 标签模块 (Tag)
# ==========================================
class TagResponse(ORMBaseModel):
    id: int
    name: str
    type: str

# ==========================================
# 3. 用户模块 (User)
# ==========================================
class UserBase(BaseModel):
    student_id: str = Field(..., description="学号")
    name: str = Field(..., description="姓名")
    major: Optional[str] = None
    grade: Optional[str] = None
    academy: Optional[str] = None
    bio: Optional[str] = None

class UserCreate(BaseModel):
    student_id: str
    name: str
    password: str  # 注册时必须传密码

# 🌟 新增一个专门用来登录的 Schema
class UserLogin(BaseModel):
    student_id: str
    password: str

class UserResponse(UserBase, ORMBaseModel):
    id: int
    avatar: Optional[str] = None
    created_at: datetime
    # 可选：如果需要一并返回用户的标签，可以取消下面这行的注释
    # tags: List[TagResponse] = []

# ==========================================
# 4. 招新岗位模块 (RecruitmentRole)
# ==========================================
class RoleBase(BaseModel):
    role_name: str
    requirements: Optional[str] = None
    quota: int = 0
    extra_questions: Optional[Any] = None # 兼容 JSON 格式的补充问题
    status: str

class RoleResponse(RoleBase, ORMBaseModel):
    id: int
    club_id: int
    created_at: datetime

# ==========================================
# 5. 社团模块 (Club)
# ==========================================
class ClubBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    cover_image: Optional[str] = None

class ClubCreate(ClubBase):
    pass # 平台管理员创建社团时的入参

class ClubResponse(ClubBase, ORMBaseModel):
    id: int
    status: str
    created_at: datetime
    # 嵌套返回该社团下属的招新岗位
    roles: List[RoleResponse] = []

# ==========================================
# 6. 报名模块 (Application)
# ==========================================
class AnswerCreate(BaseModel):
    question_id: str
    answer: str

class ApplicationCreate(BaseModel):
    club_id: int
    role_id: int
    answers: Optional[List[AnswerCreate]] = [] # 接收前端传来的补充问题答案数组

class ApplicationResponse(ORMBaseModel):
    id: int
    user_id: int
    club_id: int
    role_id: int
    status: str
    submitted_at: datetime

    # ==========================================
    # 6. 报名模块 (Application)
    # ==========================================
class AnswerBase(BaseModel):
    question_id: str
    answer: str

class AnswerCreate(AnswerBase):
    pass

class AnswerResponse(AnswerBase, ORMBaseModel):
    id: int

class ApplicationCreate(BaseModel):
    club_id: int
    role_id: int
    answers: Optional[List[AnswerCreate]] = []  # 接收前端传来的补充问题答案数组

class ApplicationResponse(ORMBaseModel):
    id: int
    user_id: int
    club_id: int
    role_id: int
    status: str
    submitted_at: datetime

    # 🌟 补全嵌套关联信息 🌟
    # 只要 SQLAlchemy 查询时带上了这些关系，Pydantic 就会自动把它们解析成 JSON 对象
    user: Optional[UserResponse] = None
    club: Optional[ClubResponse] = None
    role: Optional[RoleResponse] = None
    answers: List[AnswerResponse] = []


# ==========================================
# 7. 社团管理员关系模块 (ClubAdmin)
# ==========================================
class ClubAdminBase(BaseModel):
    role: str = "ADMIN"      # 默认角色是普通管理员
    status: str = "PENDING"  # 默认状态是待审核

class ClubAdminResponse(ClubAdminBase, ORMBaseModel):
    id: int
    user_id: int
    club_id: int
    # 嵌套返回申请人的简要信息，方便部长审核时看是谁申请的
    user: Optional['UserResponse'] = None

# 解决循环引用问题 (如果前面没加的话)
ClubAdminResponse.model_rebuild()