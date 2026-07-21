from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import Token
from app.api.deps import get_current_active_user

router = APIRouter(tags=["auth"])

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 uyumlu token girişi.
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.username, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.get("/me")
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Mevcut giriş yapmış kullanıcının profil ve rol bilgisini döner.
    customer_profile eager load ile alınır — DetachedInstanceError önlenir.
    """
    # customer_profile ilişkisini joinedload ile tek sorguda çek
    user_with_profile = (
        db.query(User)
        .options(joinedload(User.customer_profile))
        .filter(User.id == current_user.id)
        .first()
    )
    if not user_with_profile:
        raise HTTPException(status_code=404, detail="User not found")

    # role enum ya da string olabilir — her iki durumu da normalize et
    role_value = user_with_profile.role
    if hasattr(role_value, "value"):
        role_value = role_value.value

    # customer_profile erişimi güvenli şekilde yap
    customer_profile_id = None
    try:
        if user_with_profile.customer_profile:
            customer_profile_id = user_with_profile.customer_profile.id
    except Exception:
        customer_profile_id = None

    return {
        "id": user_with_profile.id,
        "username": user_with_profile.username,
        "role": role_value,
        "customer_profile_id": customer_profile_id,
    }
