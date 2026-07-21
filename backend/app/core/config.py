from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Türkiye Kargo Optimizasyon Sistemi"
    DEBUG: bool = True
    DB_SERVER: str = "localhost"
    DB_NAME: str = "KargoEnterprise"
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"
    DB_TRUSTED_CONNECTION: str = "yes"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def database_url(self) -> str:
        import urllib.parse
        params = urllib.parse.quote_plus(
            f"DRIVER={{{self.DB_DRIVER}}};"
            f"SERVER={self.DB_SERVER};"
            f"DATABASE={self.DB_NAME};"
            f"Trusted_Connection={self.DB_TRUSTED_CONNECTION};"
            f"TrustServerCertificate=yes;"
        )
        return f"mssql+pyodbc:///?odbc_connect={params}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
