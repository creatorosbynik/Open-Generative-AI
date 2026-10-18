@echo off
REM Payoff Studio - web app (all 14 studios, cloud models via MuAPI key)
REM Runs on http://127.0.0.1:3000 - reachable only from this PC.
cd /d "%~dp0.."
where node >nul 2>nul || (echo Node.js not found. Install Node.js 22 LTS from nodejs.org, then run this again. & pause & exit /b 1)
if not exist "packages\Vibe-Workflow\packages" (
  echo Pulling sub-packages...
  git submodule update --init --recursive || (echo Git for Windows is required. & pause & exit /b 1)
)
if not exist "node_modules" (
  echo First run: installing dependencies, this takes a few minutes...
  call npm install || (pause & exit /b 1)
  call npm run build:packages || (pause & exit /b 1)
)
if not exist ".next\BUILD_ID" (
  echo Building the web app...
  call npm run build || (pause & exit /b 1)
)
start "" http://127.0.0.1:3000
call npm run start
