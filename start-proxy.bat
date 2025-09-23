@echo off
echo 🚀 Starting AI Cover Letter ^& Resume Generator Server...
echo.
echo ✅ Server will run on http://localhost:8787
echo ✅ Keep this window open while using the extension
echo ✅ Press Ctrl+C to stop the server when done
echo.

cd proxy

REM Check if .env exists
if not exist .env (
    echo ❌ ERROR: .env file not found!
    echo Please rename 'env.example' to '.env' and add your OpenAI API key
    echo See README.md for detailed instructions
    pause
    exit /b 1
)

npm start
