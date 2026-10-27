import bcrypt
from datetime import datetime, timedelta, timezone
from jose import jwt

SECRET_KEY = "PTIT_SECRET_KEY_RAT_BAO_MAT"  # Bạn có thể đổi chuỗi bí mật này
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """
    Sử dụng trực tiếp thư viện bcrypt chuẩn (thay vì qua passlib đã lỗi thời):
    - Cắt an toàn 72 bytes nếu mật khẩu quá dài
    - Sinh salt ngẫu nhiên và băm mật khẩu
    - Trả về chuỗi hash lưu vào Database
    """
    if not password:
        password = ""
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    So sánh mật khẩu người dùng gõ với mật khẩu băm trong Database
    """
    try:
        if not plain_password or not hashed_password:
            return False
        password_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=1)) -> str:
    """
    Tạo JWT Access Token cho người dùng
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)