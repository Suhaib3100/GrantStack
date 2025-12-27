#!/bin/bash
# ============================================
# VPS Deployment Script
# ============================================
# Run this script on your VPS to deploy the application
#
# Prerequisites:
#   - Node.js 18+ installed
#   - PM2 installed globally (npm install -g pm2)
#   - Git installed
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}PM2 is not installed. Installing...${NC}"
    npm install -g pm2
fi

# Create logs directory
echo -e "${YELLOW}Creating logs directory...${NC}"
mkdir -p logs

# Install server dependencies
echo -e "${YELLOW}Installing server dependencies...${NC}"
cd server
npm install --production
cd ..

# Install telegram-bot dependencies
echo -e "${YELLOW}Installing telegram-bot dependencies...${NC}"
cd telegram-bot
npm install --production
cd ..

# Check if .env files exist
if [ ! -f "server/.env" ]; then
    echo -e "${RED}Warning: server/.env not found!${NC}"
    echo "Please copy server/.env.production to server/.env and update values"
fi

if [ ! -f "telegram-bot/.env" ]; then
    echo -e "${RED}Warning: telegram-bot/.env not found!${NC}"
    echo "Please copy telegram-bot/.env.production to telegram-bot/.env and update values"
fi

# Stop existing PM2 processes
echo -e "${YELLOW}Stopping existing processes...${NC}"
pm2 stop ecosystem.config.js 2>/dev/null || true

# Start applications with PM2
echo -e "${YELLOW}Starting applications...${NC}"
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
echo -e "${YELLOW}Setting up PM2 startup...${NC}"
pm2 startup 2>/dev/null || echo "Run the command above with sudo if needed"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check process status"
echo "  pm2 logs            - View logs"
echo "  pm2 logs server     - View server logs only"
echo "  pm2 logs telegram-bot - View bot logs only"
echo "  pm2 restart all     - Restart all processes"
echo "  pm2 stop all        - Stop all processes"
