# Smart Rental Tracking ML Service Starter
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "Starting Smart Rental Tracking ML Service" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "Found $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.8 or higher" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check and install requirements
Write-Host "Checking and installing required Python packages..." -ForegroundColor Yellow
pip install -r requirements.txt

# Set environment variables
$env:ML_SERVICE_PORT = 8001
$env:ML_SERVICE_HOST = "0.0.0.0"

Write-Host "Starting ML service on $env:ML_SERVICE_HOST`:$env:ML_SERVICE_PORT" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Yellow

# Start the service
python fastapi_ml_service.py

# If we get here, something went wrong
Write-Host "ML service has stopped" -ForegroundColor Red
Read-Host "Press Enter to exit"