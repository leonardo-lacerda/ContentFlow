@echo off
set DATABASE_URL=postgresql://contentflow-local:contentflow-local-pwd@localhost:5433/contentflow-db-local
set REDIS_URL=redis://localhost:6380
set TEMPORAL_ADDRESS=localhost:7233
set NEXT_PUBLIC_BACKEND_URL=http://localhost:3100
set FRONTEND_URL=http://localhost:4200
set PORT=3100
set DISABLE_TEMPORAL=true
set DISABLE_MCP=true
set NOT_SECURED=true
set STORAGE_PROVIDER=local
set UPLOAD_DIRECTORY=C:\Users\Leo\Documents\ContentFlow\.local-uploads
set DOTENV_CONFIG_PATH=C:\Users\Leo\Documents\ContentFlow\.env
node -r dotenv/config "C:\Users\Leo\Documents\ContentFlow\apps\backend\dist\apps\backend\src\main.js"
