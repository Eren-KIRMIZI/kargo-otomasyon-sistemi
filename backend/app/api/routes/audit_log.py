from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date

from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/audit-logs", tags=["Audit Log"])


# ─── Pydantic schemas ───────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id:         int
    timestamp:  datetime
    username:   str
    action:     str
    module:     str
    detail:     Optional[str]
    ip_address: Optional[str]
    user_id:    Optional[int]

    class Config:
        from_attributes = True


class AuditLogCreate(BaseModel):
    username:   str
    action:     str
    module:     str
    detail:     Optional[str] = None
    ip_address: Optional[str] = None
    user_id:    Optional[int] = None


# ─── Routes ─────────────────────────────────────────────────────────────────

@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    username:   Optional[str]  = Query(None),
    action:     Optional[str]  = Query(None),
    module:     Optional[str]  = Query(None),
    date_from:  Optional[date] = Query(None),
    date_to:    Optional[date] = Query(None),
    search:     Optional[str]  = Query(None),
    limit:      int            = Query(100, le=500),
    offset:     int            = Query(0),
    db:         Session        = Depends(get_db),
    _current_user              = Depends(get_current_active_user),
):
    q = db.query(AuditLog)

    if username:
        q = q.filter(AuditLog.username.ilike(f"%{username}%"))
    if action:
        q = q.filter(AuditLog.action == action)
    if module:
        q = q.filter(AuditLog.module == module)
    if date_from:
        q = q.filter(AuditLog.timestamp >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.filter(AuditLog.timestamp <= datetime.combine(date_to, datetime.max.time()))
    if search:
        q = q.filter(AuditLog.detail.ilike(f"%{search}%"))

    return (
        q.order_by(desc(AuditLog.timestamp))
         .offset(offset)
         .limit(limit)
         .all()
    )


@router.get("/stats")
def audit_log_stats(
    db: Session = Depends(get_db),
    _current_user = Depends(get_current_active_user),
):
    total = db.query(AuditLog).count()

    by_action = {}
    for action in ["CREATE", "UPDATE", "DELETE", "ASSIGN", "LOGIN", "LOGOUT"]:
        by_action[action] = db.query(AuditLog).filter(AuditLog.action == action).count()


    from sqlalchemy import func
    module_counts = (
        db.query(AuditLog.module, func.count(AuditLog.id).label("cnt"))
          .group_by(AuditLog.module)
          .order_by(desc("cnt"))
          .limit(10)
          .all()
    )
    by_module = {row.module: row.cnt for row in module_counts}

    return {
        "total": total,
        "by_action": by_action,
        "by_module": by_module,
    }


@router.post("", response_model=AuditLogOut, status_code=201)
def create_audit_log(
    payload: AuditLogCreate,
    db: Session = Depends(get_db),
):
    """Internal endpoint — backend servisler bu endpoint'i çağırır."""
    log = AuditLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
