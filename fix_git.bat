@echo off
echo ===================================================
echo Auto-Heal Git & IDE Watcher Protection
echo ===================================================
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\auto_heal_git.ps1"
pause
