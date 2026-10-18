@echo off
REM Payoff Studio - desktop app (Image, Video, Cinema, Lip Sync, Workflow, Agent + LOCAL GPU models)
REM Produces an installer in .\release\
cd /d "%~dp0.."
where node >nul 2>nul || (echo Node.js not found. Install Node.js 22 LTS from nodejs.org, then run this again. & pause & exit /b 1)
if not exist "node_modules" (
  if not exist "packages\Vibe-Workflow\packages" git submodule update --init --recursive
  call npm install || (pause & exit /b 1)
)
call npm run electron:build:win || (pause & exit /b 1)
echo.
echo Done. Run the installer in the "release" folder: Open Generative AI Setup 2.0.0.exe
explorer release
pause
