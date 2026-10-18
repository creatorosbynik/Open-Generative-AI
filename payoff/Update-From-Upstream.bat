@echo off
REM Pull the original author's latest changes into our Payoff Studio fork.
cd /d "%~dp0.."
git remote get-url upstream >nul 2>nul || git remote add upstream https://github.com/Anil-matcha/Open-Generative-AI.git
git fetch upstream || (pause & exit /b 1)
git merge upstream/main
echo.
echo If there were conflicts, open GitHub Desktop to resolve them, then commit.
echo After a clean merge, delete the .next folder and run Start-Payoff-Web.bat to rebuild.
pause
