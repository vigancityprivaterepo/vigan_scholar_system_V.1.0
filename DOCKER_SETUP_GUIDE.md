# Vigan Scholarship Management System — Docker Setup Guide

## Prerequisites

Install the following on your Windows Server before proceeding:

| Software | Download |
|----------|----------|
| Docker Desktop | https://www.docker.com/products/docker-desktop |
| Git | https://git-scm.com/download/win |
| ngrok | https://ngrok.com/download |

---

## Step 1 — Clone the Repository

Open **PowerShell as Administrator** and run:

```powershell
cd C:\Users\Administrator\Desktop
git clone https://github.com/vigancityprivaterepo/vigan_scholar_system_V.1.0.git scholarship
cd scholarship
```

---

## Step 2 — Create the `.env` File

In the `scholarship` folder, create a file named `.env` (no extension):

```powershell
notepad .env
```

Paste the following and fill in your values:

```env
# Database
DB_PASSWORD=YourStrongPasswordHere

# JWT Secrets
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# URLs
# CLIENT_URL is used in email links sent to applicants
CLIENT_URL=http://YOUR_PUBLIC_IP
# API calls are proxied through Nginx — do not include :5000 here
# VITE_API_BASE_URL and VITE_API_URL are hardcoded to /api in docker-compose.yml

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
EMAIL_FROM=your_gmail@gmail.com

# Primary administrator — only this email can manage and invite admin users.
PRIMARY_ADMIN_EMAIL=data@vigancity.gov.ph

# Environment
NODE_ENV=production
```

> **Important:** `SMTP_PASS` must be a Gmail **App Password** (16 characters), not your regular Gmail password.
> Get one at: Google Account → Security → 2-Step Verification → App Passwords

---

## Step 3 — Start Docker Desktop

1. Open **Docker Desktop** from the Start menu
2. Wait until the Docker whale icon in the taskbar stops animating
3. Confirm it shows **"Docker Desktop is running"**

---

## Step 4 — Build and Start All Containers

```powershell
cd C:\Users\Administrator\Desktop\scholarship
docker compose up -d --build
```

This will build and start 3 containers:
- `scholarship-db-1` — PostgreSQL database
- `scholarship-server-1` — Node.js backend API (port 5000)
- `scholarship-client-1` — Nginx frontend (port 80)

Wait 2–3 minutes for the build to complete.

---

## Step 5 — Verify Migrations Ran

Database migrations run **automatically** when the server container starts.
To confirm they applied successfully, check the server logs:

```powershell
docker compose logs server --tail=30
```

You should see a line like:
```
All migrations have been successfully applied.
```

If you ever need to apply migrations manually:

```powershell
docker compose exec server npx prisma migrate deploy
```

---

## Step 6 — Seed the Admin Account

```powershell
docker compose exec server node src/db/seed.js
```

Expected output:
```
Admin user created: data@vigancity.gov.ph
Seed complete!
```

Default admin credentials:
- **Email:** `data@vigancity.gov.ph`
- **Password:** `4gR7B5gmJ<Z36rG<12345`

---

## Step 7 — Open Windows Firewall Ports

```powershell
netsh advfirewall firewall add rule name="Scholarship Frontend" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Scholarship API" dir=in action=allow protocol=TCP localport=5000
```

---

## Step 8 — Set Up Port Forwarding on Router

Log in to your router admin page (usually `192.168.1.1`) and add these port forwarding rules:

| Rule Name | External Port | Internal IP | Internal Port | Protocol |
|-----------|--------------|-------------|---------------|----------|
| Scholarship Frontend | 80 | Your server's local IP | 80 | TCP |
| Scholarship API | 5000 | Your server's local IP | 5000 | TCP |

> To find your server's local IP run: `ipconfig` and look for **IPv4 Address**

---

## Step 9 — Get Your Public IP

```powershell
(Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
```

Update the `.env` file with this IP, then rebuild the client:

```powershell
docker compose up -d --build client
```

---

## Step 10 — Verify Everything is Running

```powershell
docker compose ps
```

All three containers should show **Up** status:

```
NAME                   STATUS
scholarship-db-1       Up
scholarship-server-1   Up
scholarship-client-1   Up
```

Test the API:
```
http://YOUR_PUBLIC_IP:5000/api/settings
```
Should return JSON.

Test the frontend:
```
http://YOUR_PUBLIC_IP
```
Should show the scholarship portal landing page.

---

## Auto-Start on Server Reboot

Docker containers are already configured to restart automatically (`restart: unless-stopped`).

To make Docker Desktop start on boot:
1. Open Docker Desktop → Settings (gear icon)
2. **General** tab → Enable **"Start Docker Desktop when you log in"**

---

## Useful Commands

| Task | Command |
|------|---------|
| Start all containers | `docker compose up -d` |
| Stop all containers | `docker compose down` |
| Rebuild everything | `docker compose up -d --build` |
| View server logs | `docker compose logs server --tail=50` |
| View all logs | `docker compose logs --tail=50` |
| Check container status | `docker compose ps` |
| Run DB migrations manually | `docker compose exec server npx prisma migrate deploy` |
| Seed admin account | `docker compose exec server node src/db/seed.js` |
| Pull latest code | `git pull origin main` |

---

## Updating the Application

When new code is pushed to the repository:

```powershell
cd C:\Users\Administrator\Desktop\scholarship
git pull origin main
docker compose down
docker compose up -d --build
```

---

## Troubleshooting

### Port already in use
```powershell
netstat -ano | findstr :5000
taskkill /PID <pid_number> /F
```

### Server can't reach database
```powershell
docker compose down
docker compose up -d
# Wait 30 seconds then retry migrations
```

### Container not in Docker network
```powershell
docker network connect scholarship_default scholarship-server-1
```

### Check container logs for errors
```powershell
docker compose logs server
docker compose logs db
docker compose logs client
```

### IIS conflict on port 80
If IIS is using port 80, disable it:
```powershell
Stop-Service -Name W3SVC
Set-Service -Name W3SVC -StartupType Disabled
docker compose down
docker compose up -d
```

---

## File Structure

```
scholarship/
├── .env                    ← Your environment variables (create this)
├── docker-compose.yml      ← Docker services configuration
├── client/
│   ├── Dockerfile          ← Frontend build instructions
│   ├── nginx.conf          ← Nginx web server config
│   └── src/                ← React frontend source
└── server/
    ├── Dockerfile          ← Backend build instructions
    ├── prisma/
│   │   └── schema.prisma   ← Database schema
    └── src/                ← Node.js backend source
```

---

## Support

For issues, check the container logs first:
```powershell
docker compose logs --tail=100
```
