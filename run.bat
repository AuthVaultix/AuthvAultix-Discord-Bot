@echo off
title Discord Bot Runner

echo Checking MySQL database connection...
netstat -ano | findstr :3306 >nul
if %errorlevel% neq 0 (
    echo [INFO] MySQL is not running. Starting MySQL from XAMPP...
    start "" /min "C:\xampp\mysql_start.bat"
    echo [INFO] Waiting 5 seconds for MySQL to start...
    timeout /t 5 >nul
) else (
    echo [INFO] MySQL is already running on port 3306.
)

echo.
echo Starting Discord Bot...
cd /d "%~dp0bot"
node index.js
pause
