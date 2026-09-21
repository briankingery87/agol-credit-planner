@echo off
REM Commit and push the AGOL Credit Planner to GitHub Pages.
REM Usage:  publish.bat "commit message"

setlocal
set MSG=%~1
if "%MSG%"=="" set MSG=Update credit planner

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
echo Done. Pages will redeploy in about a minute:
echo   https://briankingery87.github.io/agol-credit-planner/
goto :end

:fail
echo.
echo FAILED. Nothing was pushed. Fix the error above and run again.
exit /b 1

:end
endlocal
