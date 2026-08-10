@echo off
set NEXT_PUBLIC_BACKEND_URL=http://localhost:3100
set BACKEND_URL=http://localhost:3100
set FRONTEND_URL=http://localhost:4200
set UPLOAD_DIRECTORY=C:\Users\Leo\Documents\ContentFlow\.local-uploads
pnpm.cmd --filter ./apps/frontend start
