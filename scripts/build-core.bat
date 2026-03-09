@echo off
REM Build script for TableMax C++ engine (Windows/MSVC)
setlocal

set "VCVARS=C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvarsall.bat"

if not exist "%VCVARS%" (
    REM Fallback: try standard 2022 paths
    for %%e in (Community BuildTools Enterprise Professional) do (
        if exist "C:\Program Files\Microsoft Visual Studio\2022\%%e\VC\Auxiliary\Build\vcvarsall.bat" (
            set "VCVARS=C:\Program Files\Microsoft Visual Studio\2022\%%e\VC\Auxiliary\Build\vcvarsall.bat"
            goto :found
        )
    )
    echo ERROR: Could not find vcvarsall.bat
    exit /b 1
)

:found
echo Found MSVC: %VCVARS%
call "%VCVARS%" x64

echo.
echo Building TableMax Core Engine...
cd /d "%~dp0..\core"

if not exist build mkdir build
cd build

cmake .. -G "NMake Makefiles" -DCMAKE_BUILD_TYPE=Release
if errorlevel 1 (
    echo CMake failed!
    exit /b 1
)

cmake --build . --config Release
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)

echo.
echo === TableMax Core Engine built successfully ===
