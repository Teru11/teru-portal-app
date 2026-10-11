@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\.bin\next.cmd" (
  echo Next.js dependencies are missing. Run "pnpm install" first.
  pause
  exit /b 1
)

if not exist ".next\BUILD_ID" (
  echo Production build not found. Run "pnpm build" first.
  pause
  exit /b 1
)

echo Starting the production server at http://localhost:3000
call pnpm start
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo The production server exited with code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
