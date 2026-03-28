from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 替换为你的实际 MySQL 账号密码
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://2zobaHGDSQzydqm.root:tSwkHj3JT9BTAS72@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/test?ssl_verify_cert=true&ssl_verify_identity=true"

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 依赖注入，供路由使用
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()