from sqlalchemy import Column, BigInteger, String, Text, Enum, DECIMAL, JSON, TIMESTAMP, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base

# ==========================================
# 1. 核心实体表
# ==========================================
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


# 新增：社团与管理员的关联表
class ClubAdmin(Base):
    __tablename__ = "club_admins"

    id = Column(Integer, primary_key=True, index=True)

    # 🌟 核心修复 1：把 ForeignKey 删掉！取消 MySQL 底层的物理强校验
    user_id = Column(Integer)
    club_id = Column(Integer)

    role = Column(String(50), default="ADMIN")
    status = Column(String(50), default="PENDING")

    # 🌟 核心修复 2：在 Python (SQLAlchemy) 层面指定逻辑关联
    user = relationship(
        "User",
        foreign_keys=[user_id],
        primaryjoin="ClubAdmin.user_id == User.id",
        backref="managed_clubs"
    )
    club = relationship(
        "Club",
        foreign_keys=[club_id],
        primaryjoin="ClubAdmin.club_id == Club.id",
        backref="admin_members"
    )
class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)
    student_id = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(64), nullable=False)
    hashed_password = Column(String(255))
    major = Column(String(128))
    grade = Column(String(32))
    academy = Column(String(128))
    avatar = Column(String(255))
    bio = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    role = Column(String(20), default="student")
    # 关联关系
    applications = relationship("Application", back_populates="user")
    favorite_clubs = relationship("FavoriteClub", back_populates="user")
    tags = relationship("UserTag", back_populates="user")


class Club(Base):
    __tablename__ = "clubs"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False, index=True)
    description = Column(Text)
    cover_image = Column(String(255))
    status = Column(Enum('DRAFT', 'APPROVED', 'REJECTED'), default='DRAFT', index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # 关联关系
    roles = relationship("RecruitmentRole", back_populates="club")
    tags = relationship("ClubTag", back_populates="club")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(64), unique=True, nullable=False)
    type = Column(String(50), nullable=True)
    # type = Column(Enum('INTEREST', 'SKILL', 'CHARACTER', 'REQUIREMENT'), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


# ==========================================
# 2. 关系与中间表
# ==========================================

class UserTag(Base):
    __tablename__ = "user_tags"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(BigInteger, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    weight = Column(DECIMAL(5, 2), default=1.00)

    user = relationship("User", back_populates="tags")
    tag = relationship("Tag")


class ClubTag(Base):
    __tablename__ = "club_tags"

    id = Column(BigInteger, primary_key=True, index=True)
    club_id = Column(BigInteger, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    tag_id = Column(BigInteger, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    weight = Column(DECIMAL(5, 2), default=1.00)

    club = relationship("Club", back_populates="tags")
    tag = relationship("Tag")


class RecruitmentRole(Base):
    __tablename__ = "recruitment_roles"

    id = Column(BigInteger, primary_key=True, index=True)
    club_id = Column(BigInteger, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    role_name = Column(String(128), nullable=False)
    requirements = Column(Text)
    quota = Column(BigInteger, default=0)
    extra_questions = Column(JSON) # 存储社团自定义的补充问题
    status = Column(Enum('OPEN', 'CLOSED', 'NOT_STARTED'), default='NOT_STARTED')
    created_at = Column(TIMESTAMP, server_default=func.now())

    club = relationship("Club", back_populates="roles")
    applications = relationship("Application", back_populates="role")


class Application(Base):
    __tablename__ = "applications"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    club_id = Column(BigInteger, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(BigInteger, ForeignKey("recruitment_roles.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum('DRAFT', 'PENDING', 'INTERVIEWING', 'ACCEPTED', 'REJECTED', 'CANCELED'), default='PENDING')
    submitted_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="applications")
    club = relationship("Club")
    role = relationship("RecruitmentRole", back_populates="applications")
    answers = relationship("ApplicationAnswer", back_populates="application")


class ApplicationAnswer(Base):
    __tablename__ = "application_answers"

    id = Column(BigInteger, primary_key=True, index=True)
    application_id = Column(BigInteger, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(String(64), nullable=False)
    answer = Column(Text, nullable=False)

    application = relationship("Application", back_populates="answers")


class FavoriteClub(Base):
    __tablename__ = "favorite_clubs"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    club_id = Column(BigInteger, ForeignKey("clubs.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="favorite_clubs")
    club = relationship("Club")


from sqlalchemy import JSON  # 记得在文件顶部加上这句，如果有了就不用加


# ==========================================
# 新增：社团招新岗位表 (ClubRole)
# ==========================================
class ClubRole(Base):
    __tablename__ = "club_roles"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer)
    name = Column(String(50))  # 岗位名称，比如 "新媒体部干事"
    requirements = Column(String(255))  # 岗位要求

    # 🌟 核心大招：用 JSON 直接存附加题数组！
    # 格式大概是: [{"question_id": "q1", "title": "你会用PS吗？"}]
    extra_questions = Column(JSON, default=list)

    club = relationship("Club", foreign_keys=[club_id], primaryjoin="ClubRole.club_id == Club.id", backref="recruitment_roles")