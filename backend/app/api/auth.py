from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.db.session import get_db
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: UserRegister, db: Session = Depends(get_db)):
    clean_username = user.username.strip()
    clean_email = user.email.strip().lower()

    if not clean_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên đăng nhập không được để trống")

    if db.query(User).filter(User.username == clean_username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên đăng nhập đã tồn tại")

    if db.query(User).filter(User.email == clean_email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email này đã được sử dụng")

    try:
        new_user = User(
            username=clean_username,
            email=clean_email,
            hashed_password=hash_password(user.password),
            full_name=user.full_name.strip() if user.full_name else None,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "message": "Đăng ký tài khoản thành công!",
            "user_id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
        }
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tài khoản hoặc email đã tồn tại")
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi hệ thống: {str(exc)}")

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    db_user = db.query(User).filter(User.email == clean_email).first()
    if not db_user or not verify_password(payload.password, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email hoặc mật khẩu không đúng")  
    
    access_token = create_access_token(
        data={"sub": str(db_user.id), "email": db_user.email}
    )    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email,
            "full_name": db_user.full_name,
        }
    }

