import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from jose import jwt
import traceback

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.user import User

class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Önce isteği işletelim
        response = await call_next(request)
        
        # Sadece başarılı POST, PUT, DELETE isteklerini ve Login'i logla
        if response.status_code >= 400:
            return response
            
        method = request.method
        path = request.url.path
        
        # Sadece /api ile başlayan yolları logla (docs, vb. hariç)
        if not path.startswith("/api/"):
            return response
            
        # GET isteklerini loglamayız (okuma işlemleri)
        if method == "GET":
            return response

        # Hangi action?
        action = "UPDATE"
        if method == "POST":
            action = "CREATE"
        elif method == "DELETE":
            action = "DELETE"
            
        if "login" in path.lower():
            action = "LOGIN"
        elif "assign" in path.lower():
            action = "ASSIGN"
            
        # Eğer GET ama loglanması gereken bir şey değilse dön
        if method == "GET" and action not in ["LOGIN"]:
            return response

        # Hangi modül?
        module = "Sistem"
        if "order" in path.lower(): module = "Siparişler"
        elif "courier" in path.lower(): module = "Kuryeler"
        elif "vehicle" in path.lower(): module = "Araçlar"
        elif "depot" in path.lower(): module = "Depolar"
        elif "tariff" in path.lower(): module = "Tarifeler"
        elif "customer" in path.lower(): module = "Müşteriler"
        elif "location" in path.lower() or "zone" in path.lower(): module = "Bölgeler"
        elif "auth" in path.lower() or "login" in path.lower(): module = "Auth"

        # Kullanıcıyı bul
        user_id = None
        username = "Sistem"
        
        # 1. Login işleminden dönen token'dan kullanıcıyı alma
        if action == "LOGIN":
            # Login post işlemidir, ama body'yi middleware'de okumak stream'i bozar.
            # Şimdilik username bilinmiyor diyebiliriz veya 'Kullanıcı'
            username = "admin" # Varsayılan demo login
            user_id = 1
        else:
            # 2. Authorization header'dan okuma
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                try:
                    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                    sub = payload.get("sub")
                    if sub:
                        username = sub
                except Exception:
                    pass

        # Arka planda DB'ye yaz (senkron db session)
        if action != "GET": # Extra check
            try:
                db = SessionLocal()
                # Eğer username JWT'den geldiyse ID'sini bul
                if username and username != "Sistem" and action != "LOGIN":
                    user = db.query(User).filter(User.username == username).first()
                    if user:
                        user_id = user.id
                
                # Detay oluştur
                detail = f"{method} {path} işlemi gerçekleştirildi"
                
                log = AuditLog(
                    username=username,
                    user_id=user_id,
                    action=action,
                    module=module,
                    detail=detail,
                    ip_address=request.client.host if request.client else "127.0.0.1"
                )
                db.add(log)
                db.commit()
                db.close()
            except Exception as e:
                print("Audit log kaydedilemedi:", e)
                traceback.print_exc()

        return response
