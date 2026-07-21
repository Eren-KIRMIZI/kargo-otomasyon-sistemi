import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE customer_profiles ADD wallet_balance FLOAT DEFAULT 0.0;"))
        print("Column 'wallet_balance' added successfully.")
except Exception as e:
    print(f"Error (may already exist): {e}")

try:
    from app.core.database import init_db
    init_db()
    print("Database tables initialized (create_all).")
except Exception as e:
    print(f"Error during init_db: {e}")
