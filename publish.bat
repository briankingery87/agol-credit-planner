@echo off
REM Commit and push the AGOL Credit Planner to GitHub Pages.
REM Double-click it and type a message when prompted, or run it with one:
REM   publish.bat "commit message"

setlocal
cd /d "%~dp0"

set "MSG=%~1"

if not defined MSG (
  echo.
  echo  AGOL Credit Planner - publish
  echo  -----------------------------
  echo.
  echo  Pending changes:
  echo.
  git status --short
  echo.
  set /p "MSG=  Commit message: "
)

if not defined MSG set "MSG=Update credit planner"

echo.
echo === Staging ===
git add -A
if errorlevel 1 goto :fail

git diff --cached --quiet
if not errorlevel 1 (
  echo Nothing to commit. Working tree is clean.
  goto :end
)

echo.
echo === Committing: %MSG% ===
git commit -m "%MSG%"
if errorlevel 1 goto :fail

echo.
echo === Pushing ===
git push
if errorlevel 1 goto :fail

echo.
echo Done. Pages redeploys in about a minute:
echo   https://briankingery87.github.io/agol-credit-planner/
goto :end

:fail
echo.
echo FAILED. Nothing was pushed. Read the error above and run again.
echo.
pause
endlocal
exit /b 1

:end
echo.
pause
endlocal
