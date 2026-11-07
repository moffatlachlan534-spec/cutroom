@echo off
title Cutroom Web - logins
cd /d "%~dp0"
:menu
cls
echo ==========================================
echo   Cutroom Web - who can log in
echo ==========================================
python users.py list
echo.
echo   1  Add a person (makes them a personal code)
echo   2  Remove a person
echo   3  Publish changes to the live site
echo   4  Close
echo.
set /p c=Pick 1-4: 
if "%c%"=="1" (set /p n=Their name: & python users.py add "%n%" & pause & goto menu)
if "%c%"=="2" (set /p n=Name to remove: & python users.py remove "%n%" & pause & goto menu)
if "%c%"=="3" (python users.py publish & pause & goto menu)
exit /b
