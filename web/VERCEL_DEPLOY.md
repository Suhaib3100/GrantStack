# ============================================
# Vercel Deployment Guide
# ============================================

## Step 1: Push to GitHub

Make sure your code is in a GitHub repository.

## Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set the **Root Directory** to `web`
5. Framework Preset will auto-detect Next.js

## Step 3: Configure Environment Variables

In Vercel project settings, add these environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-vps-domain.com` | Your VPS API URL (with nginx) |
| `NEXT_PUBLIC_API_URL` | `http://YOUR_VPS_IP:3001` | Or direct IP if no domain |

**Important:** Use HTTPS if you have SSL configured on your VPS.

## Step 4: Deploy

Click "Deploy" and wait for the build to complete.

## Step 5: Update VPS Configuration

After deployment, update your VPS environment files with the Vercel URL:

```bash
# On your VPS
nano /var/www/tg-bot-track/server/.env
# Update: CORS_ORIGIN=https://your-app.vercel.app

nano /var/www/tg-bot-track/telegram-bot/.env
# Update: WEB_CLIENT_URL=https://your-app.vercel.app

# Restart services
pm2 restart all
```

## Environment Variables Reference

### For Vercel (web/.env.local or Vercel Dashboard)

```env
NEXT_PUBLIC_API_URL=https://your-vps-domain.com
```

### For VPS Server (server/.env)

```env
CORS_ORIGIN=https://your-app.vercel.app
```

### For VPS Telegram Bot (telegram-bot/.env)

```env
WEB_CLIENT_URL=https://your-app.vercel.app
```

---

## Custom Domain (Optional)

1. In Vercel project settings, go to "Domains"
2. Add your custom domain
3. Update DNS records as instructed
4. Update all environment variables with the new domain

---

## Troubleshooting

### CORS Errors
- Ensure `CORS_ORIGIN` on VPS exactly matches Vercel URL (including https://)
- Check nginx is proxying correctly
- Clear browser cache

### API Connection Failed
- Verify VPS is running: `pm2 status`
- Check firewall allows port 80/443
- Test API directly: `curl http://YOUR_VPS_IP:3001/health`

### Session Links Not Working
- Ensure `WEB_CLIENT_URL` in telegram-bot/.env is your Vercel URL
- Restart bot after changes: `pm2 restart telegram-bot`
