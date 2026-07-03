@echo off
title Residence Manager
cd /d "%~dp0"

echo ================================================
echo    Residence Manager - Demarrage en cours...
echo ================================================

:: Demarrer le serveur Vite dans une fenetre minimisee
start "Residence Manager Server" /min cmd /c "npm run dev"

:: Attendre que le port 5173 soit disponible
echo Connexion au serveur en cours...
:wait
powershell -NoProfile -Command "try { $null = New-Object System.Net.Sockets.TcpClient('localhost', 5173); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait
)

:: Ouvrir le navigateur
echo Ouverture du navigateur...
start "" "http://localhost:5173"

echo.
echo Application demarree sur http://localhost:5173
echo Fermer la fenetre serveur "Residence Manager Server" pour arreter l'application.
timeout /t 3 /nobreak >nul
exit
