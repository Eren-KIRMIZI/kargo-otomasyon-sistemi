import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        res = conn.execute(text("SELECT resource_type, request_mode, request_status FROM sys.dm_tran_locks"))
        print([dict(r._mapping) for r in res])
except Exception as e:
    print("Error:", e)
