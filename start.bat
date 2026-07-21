@echo off
echo ==============================================
echo KargoEnterprise - Baslatiliyor...
echo ==============================================
echo.

echo [+] Backend baslatiliyor (Port 8000)
start "Backend" cmd /k "cd backend && ..\venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

echo [+] Frontend baslatiliyor (Port 5173)
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Islem tamam! Uygulama pencereleri ayri ayri acildi.
echo Frontend: http://localhost:5173
echo Backend : http://localhost:8000
echo ==============================================
