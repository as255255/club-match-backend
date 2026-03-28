
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal # 👈 确保引入了 SessionLocal
import models
from routers import user, club, application
# 导入所有的路由模块
from routers import club, user, application
# 在数据库中创建表 (如果还没通过 SQL 脚本创建的话)
# models.Base.metadata.create_all(bind=engine)
# models.Base.metadata.drop_all(bind=engine)   # 🌟 第一秒：炸掉云端所有不合规的旧表
models.Base.metadata.create_all(bind=engine) # 🌟 第二秒：按照刚才修改好的大容量重新建表！
def init_seed_data():
    db = SessionLocal()
    try:
        if db.query(models.Tag).count() == 0:
            default_tags = ["🎵 音乐与乐器", "💃 舞蹈与形体", "🏀 体育与电竞", "💻 极客与技术", "🤝 公益与志愿", "📸 摄影与影视", "📝 文学与辩论"]
            for tag_name in default_tags:
                # 👇 核心修复：加上 type="interest" ，满足 MySQL 的非空要求
                db.add(models.Tag(name=tag_name, type="interest", is_active=True))
            db.commit()
            print("✅ 系统检测到新数据库，已自动为你补齐了所有默认兴趣标签！")
    finally:
        db.close()

init_seed_data()
app = FastAPI(title="社团招新智能匹配平台 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== 挂载路由 ======
app.include_router(user.router)         # 用户模块
app.include_router(club.router)         # 社团模块
app.include_router(application.router)  # 报名模块

@app.get("/")
def read_root():
    return {"message": "API is running smooth!"}