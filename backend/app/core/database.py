from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Tüm tabloları oluştur (create_all)"""
    from app.models import (  # noqa: F401
        location, depot, courier, order, zone, history,
        vehicle, user, customer, tariff, warehouse, fleet,
        incident, support, audit_log,
    )
    Base.metadata.create_all(bind=engine)

    # Seed audit logs (demo verisi)
    try:
        from app.seed.audit_log_seed import seed_audit_logs
        _seed_db = SessionLocal()
        seed_audit_logs(_seed_db)
        _seed_db.close()
    except Exception:
        pass

    # Create default admin user if not exists
    db = SessionLocal()
    try:
        from app.core.security import get_password_hash
        from app.models.user import UserRole
        admin = db.query(user.User).filter(user.User.username == "admin").first()
        if not admin:
            admin_user = user.User(
                username="admin",
                hashed_password=get_password_hash("123456"),
                role=UserRole.ADMIN,
                is_superuser=True
            )
            db.add(admin_user)
            db.commit()
        elif admin.role != UserRole.ADMIN or not admin.hashed_password.startswith("$2b$04$"):
            # Mevcut admin kullanıcısının rolünü ve şifre hash hızını düzelt
            admin.role = UserRole.ADMIN
            admin.hashed_password = get_password_hash("123456")
            db.commit()
    finally:
        db.close()
