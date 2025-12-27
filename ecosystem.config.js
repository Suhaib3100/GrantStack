/**
 * PM2 Ecosystem Configuration
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --only server
 *   pm2 start ecosystem.config.js --only telegram-bot
 *   pm2 logs
 *   pm2 status
 *   pm2 restart all
 */

module.exports = {
    apps: [
        {
            name: 'server',
            cwd: './server',
            script: 'app.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: 'production',
                PORT: 3001
            },
            env_file: './server/.env',
            error_file: './logs/server-error.log',
            out_file: './logs/server-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        },
        {
            name: 'telegram-bot',
            cwd: './telegram-bot',
            script: 'index.js',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '300M',
            env: {
                NODE_ENV: 'production'
            },
            env_file: './telegram-bot/.env',
            error_file: './logs/bot-error.log',
            out_file: './logs/bot-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true
        }
    ]
};
