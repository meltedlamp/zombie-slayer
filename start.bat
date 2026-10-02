@echo off
cd /d "%~dp0"
echo.
echo  Zombie Slayer
echo  Open http://localhost:8123 if the browser does not.
echo  Close this window to stop the game.
echo.
start "" "http://localhost:8123"
python -m http.server 8123
