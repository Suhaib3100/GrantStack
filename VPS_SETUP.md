# ============================================
# VPS Setup Guide
# ============================================

## Prerequisites

1. **Ubuntu/Debian VPS** with root or sudo access
2. **Domain name** (optional but recommended)
3. **Vercel account** for frontend deployment

## Step 1: Install Node.js on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
sudo npm install -g pm2
```

## Step 2: Clone and Setup Project

```bash
# Create app directory
mkdir -p /var/www
cd /var/www

# Clone your repository (or upload files via SFTP)
git clone https://github.com/YOUR_USERNAME/tg-bot-track.git
cd tg-bot-track

# Or upload via SFTP/SCP to /var/www/tg-bot-track
```

## Step 3: Configure Environment Variables

```bash
# Server environment
cp server/.env.production server/.env
nano server/.env

# Update these values:
# - CORS_ORIGIN=https://your-app.vercel.app

# Telegram bot environment
cp telegram-bot/.env.production telegram-bot/.env
nano telegram-bot/.env

# Update these values:
# - WEB_CLIENT_URL=https://your-app.vercel.app
# - API_BASE_URL=http://localhost:3001  (or your domain if using nginx)
```

## Step 4: Run Database Migration

```bash
cd /var/www/tg-bot-track/server
npm install
node db/run-migration.js
```

## Step 5: Deploy with PM2

```bash
cd /var/www/tg-bot-track
chmod +x deploy.sh
./deploy.sh
```

## Step 6: Setup Nginx Reverse Proxy (Recommended)

```bash
# Install nginx
sudo apt install nginx -y

# Create nginx config
sudo nano /etc/nginx/sites-available/tg-bot-track
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or your VPS IP

    # API endpoints
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for long uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Allow large file uploads
        client_max_body_size 100M;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/tg-bot-track /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Setup SSL with Let's Encrypt (If using domain)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## Step 8: Configure Firewall

```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable
```

## Vercel Frontend Deployment

See `web/VERCEL_DEPLOY.md` for frontend deployment instructions.

---

## Useful Commands

```bash
# View PM2 status
pm2 status

# View logs
pm2 logs
pm2 logs server
pm2 logs telegram-bot

# Restart services
pm2 restart all
pm2 restart server
pm2 restart telegram-bot

# Stop services
pm2 stop all

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Bot not responding
```bash
pm2 logs telegram-bot
# Check if BOT_TOKEN is correct in .env
```

### API errors
```bash
pm2 logs server
# Check DATABASE_URL connection
```

### CORS errors on frontend
- Make sure CORS_ORIGIN in server/.env matches your Vercel URL exactly
- Include https:// in the URL
