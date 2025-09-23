@echo off
echo 🚀 Setting up AI Cover Letter ^& Resume Generator...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/
    echo Then restart Command Prompt and run this script again.
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Navigate to proxy directory and install dependencies
cd proxy
if not exist package.json (
    echo ❌ ERROR: package.json not found in proxy directory
    pause
    exit /b 1
)

echo.
echo 📦 Installing dependencies...
npm install
if errorlevel 1 (
    echo ❌ ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo 🔑 NEXT STEPS - API Key Setup:
echo 1. Get your OpenAI API key from https://platform.openai.com/api-keys
echo 2. Rename 'proxy\env.example' to 'proxy\.env'
echo 3. Edit 'proxy\.env' and add your API key
echo 4. Run 'start-proxy.bat' to start the server
echo 5. Load the Chrome extension from the 'extension' folder
echo.
echo 📖 See README.md for detailed instructions!
echo.
pause
