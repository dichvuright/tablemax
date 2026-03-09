@echo off
REM Build script for TableMax C++ engine (Windows/MSVC)
REM Usage: scripts\build-core.bat

setlocal enabledelayedexpansion

REM ─── Find vcvarsall.bat ───────────────────────────────────
set "VCVARS="

for %%d in (
    "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"
    "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat"
    "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvarsall.bat"
    "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat"
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"
) do (
    if exist %%d (
        set "VCVARS=%%~d"
        goto :found_vcvars
    )
)

echo ERROR: Could not find vcvarsall.bat. Install Visual Studio Build Tools 2022.
exit /b 1

:found_vcvars
echo Found MSVC: %VCVARS%
call "%VCVARS%" x64

REM ─── Build core engine ────────────────────────────────────
echo.
echo Building TableMax Core Engine...
cd /d "%~dp0..\core"

if not exist build mkdir build
cd build

cmake .. -G "NMake Makefiles" -DCMAKE_BUILD_TYPE=Release
if errorlevel 1 (
    echo CMake configuration failed!
    exit /b 1
)

cmake --build . --config Release
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo.
echo ========================================
echo  TableMax Core Engine built successfully
echo ========================================

REM ─── Copy to Tauri target ─────────────────────────────────
set "OUTPUT_DIR=%~dp0..\src-tauri\lib"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

copy /Y tablemax_engine.dll "%OUTPUT_DIR%\" 2>nul
copy /Y tablemax_engine.lib "%OUTPUT_DIR%\" 2>nul

echo DLLs copied to src-tauri\lib\
