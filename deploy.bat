@echo off
echo Building and starting Enterprise One...
docker-compose down
docker-compose up --build -d
echo.
echo Deployment complete!
echo Frontend: http://localhost
echo Backend: http://localhost:8000
echo.
pause
