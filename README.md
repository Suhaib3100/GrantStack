# GrantStack 🔐

A Telegram bot for managing device permissions and capturing media/location data with instant notifications. Built with Node.js, Next.js, and PostgreSQL.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ Features

- 📍 **Location Tracking** - Capture GPS coordinates with high accuracy
- 📷 **Photo Capture** - Take photos using device camera
- 🎥 **Video Recording** - Record videos with audio
- 🎤 **Audio Recording** - Capture microphone audio
- 👻 **Ghost Mode** - Capture all permissions at once
- 🔔 **Instant Notifications** - Real-time alerts to Telegram
- 📊 **Results Dashboard** - View all captured data categorized
- 🔐 **User Approval System** - Admin controls who can use the bot
- 🌐 **Permanent Links** - Same user always gets the same capture link

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Telegram Bot  │────▶│   Express API   │────▶│   PostgreSQL    │
│    (Telegraf)   │     │    (Node.js)    │     │    Database     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   Next.js Web   │
                        │    (Vercel)     │
                        └─────────────────┘
```

## 📁 Project Structure

```
├── server/                 # Express.js Backend API
│   ├── controllers/        # Request handlers
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── db/                 # Database setup & migrations
│   ├── middleware/         # Express middleware
│   └── storage/            # Media file storage
│
├── telegram-bot/           # Telegram Bot (Telegraf)
│   ├── bot.js              # Main bot logic
│   ├── keyboard.js         # Telegram keyboards
│   ├── api.js              # API client
│   └── config.js           # Bot configuration
│
├── web/                    # Next.js Frontend (Vercel)
│   ├── app/                # App router pages
│   │   └── [type]/[userId] # Dynamic capture pages
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utilities
│
└── ecosystem.config.js     # PM2 configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### 1. Clone the Repository

```bash
git clone https://github.com/suhaib3100/grantstack.git
cd grantstack
```

### 2. Setup Environment Variables

**Server (.env in `/server`):**
```env
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/grantstack

# Telegram
BOT_TOKEN=your_bot_token_here
ADMIN_TELEGRAM_ID=your_telegram_id

# Web Client
WEB_CLIENT_URL=https://your-domain.vercel.app
```

**Telegram Bot (.env in `/telegram-bot`):**
```env
BOT_TOKEN=your_bot_token_here
API_BASE_URL=http://localhost:3001
WEB_CLIENT_URL=https://your-domain.vercel.app
```

**Web (.env.local in `/web`):**
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### 3. Install Dependencies

```bash
# Server
cd server && npm install

# Telegram Bot
cd ../telegram-bot && npm install

# Web
cd ../web && npm install
```

### 4. Setup Database

```bash
cd server
npm run db:init
```

### 5. Start Services

**Development:**
```bash
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Bot
cd telegram-bot && npm run dev

# Terminal 3 - Web
cd web && npm run dev
```

**Production (with PM2):**
```bash
pm2 start ecosystem.config.js
```

## 🌐 Deployment

### VPS (Server + Bot)

1. Clone repo on VPS
2. Install Node.js 18+, PostgreSQL, PM2
3. Setup environment variables
4. Run `pm2 start ecosystem.config.js`

See [VPS_SETUP.md](VPS_SETUP.md) for detailed instructions.

### Vercel (Web Frontend)

1. Import repo to Vercel
2. Set environment variable: `NEXT_PUBLIC_API_URL`
3. Deploy

See [web/VERCEL_DEPLOY.md](web/VERCEL_DEPLOY.md) for detailed instructions.

## 📱 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and show menu |
| `/help` | Show help message |
| `/status` | Check bot status |

### Menu Options

- 📍 **Location** - Generate location capture link
- 📷 **Single Photo** - Generate photo capture link
- 🎥 **Video** - Generate video capture link
- 🎤 **Microphone** - Generate audio capture link
- 👻 **Ghost Mode** - Generate all-in-one capture link
- 📊 **View All Results** - View all captured data
- 🔐 **Admin Panel** - Manage users (admin only)

## 🔧 API Endpoints

### Capture Routes (`/api/capture`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/:userId/location` | Upload location data |
| POST | `/:userId/photo` | Upload photo |
| POST | `/:userId/video` | Upload video |
| POST | `/:userId/audio` | Upload audio |
| POST | `/:userId/event` | Permission events |
| GET | `/:userId/data` | Get user's captured data |

### Session Routes (`/api/sessions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new session |
| GET | `/:id` | Get session details |
| PUT | `/:id/end` | End session |

### Admin Routes (`/api/admin`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List all users |
| GET | `/requests` | Get pending access requests |
| POST | `/approve/:id` | Approve user |
| POST | `/deny/:id` | Deny user |

## 🛡️ Security

- User approval system - only approved users can generate links
- Rate limiting on API endpoints
- CORS protection
- Helmet.js security headers
- Input validation and sanitization

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- Create an issue on GitHub
- Contact: TG: SuhaibKIng01
---

Made with ❤️ by Suhaib
