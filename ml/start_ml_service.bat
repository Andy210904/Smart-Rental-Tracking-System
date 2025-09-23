@echo off
echo ===================================================
echo Starting Smart Rental Tracking ML Service
echo ===================================================

:: Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

:: Check requirements
echo Checking and installing required Python packages...
pip install -r requirements.txt

:: Set environment variables
set ML_SERVICE_PORT=8001
set ML_SERVICE_HOST=0.0.0.0

echo Starting ML service on %ML_SERVICE_HOST%:%ML_SERVICE_PORT%
echo Press Ctrl+C to stop the service

:: Start the service
python fastapi_ml_service.py

:: If we get here, something went wrong
echo ML service has stopped
pause