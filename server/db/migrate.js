#!/usr/bin/env node
/**
 * ============================================
 * Database Migration Runner
 * ============================================
 * Runs all pending migrations in order.
 * Usage: node server/db/migrate.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI;

if (!connectionString) {
    console.error('❌ DATABASE_URL or DATABASE_URI environment variable is required');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

// Admin telegram ID
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '6737328498';

async function runMigrations() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Starting database migrations...\n');
        
        // Create migrations tracking table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Get already executed migrations
        const executed = await client.query('SELECT name FROM _migrations');
        const executedNames = executed.rows.map(r => r.name);
        
        // Read all migration files
        const migrationsDir = path.join(__dirname, 'migrations');
        
        if (!fs.existsSync(migrationsDir)) {
            fs.mkdirSync(migrationsDir, { recursive: true });
        }
        
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
        
        console.log(`📁 Found ${migrationFiles.length} migration files\n`);
        
        let migrationsRun = 0;
        
        for (const file of migrationFiles) {
            if (executedNames.includes(file)) {
                console.log(`⏭️  Skipping ${file} (already executed)`);
                continue;
            }
            
            console.log(`🔄 Running ${file}...`);
            
            const filePath = path.join(migrationsDir, file);
            let sql = fs.readFileSync(filePath, 'utf8');
            
            // Replace placeholder with actual admin ID
            sql = sql.replace(/\$ADMIN_TELEGRAM_ID/g, ADMIN_TELEGRAM_ID);
            sql = sql.replace(/'6737328498'/g, `'${ADMIN_TELEGRAM_ID}'`);
            
            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query(
                    'INSERT INTO _migrations (name) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
                console.log(`✅ ${file} completed`);
                migrationsRun++;
            } catch (error) {
                await client.query('ROLLBACK');
                console.error(`❌ ${file} failed: ${error.message}`);
                throw error;
            }
        }
        
        // Run inline migrations for essential columns
        console.log('\n🔄 Checking essential columns...\n');
        
        // Ensure all essential columns exist
        const essentialMigrations = [
            {
                name: 'is_approved column',
                sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`
            },
            {
                name: 'access_requested column',
                sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS access_requested BOOLEAN DEFAULT FALSE`
            },
            {
                name: 'approved_at column',
                sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE`
            },
            {
                name: 'approved_by column',
                sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by BIGINT`
            },
            {
                name: 'role column',
                sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`
            },
            {
                name: 'role index',
                sql: `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`
            },
            {
                name: 'admin user approval',
                sql: `UPDATE users SET is_approved = TRUE, role = 'admin' WHERE telegram_id = ${ADMIN_TELEGRAM_ID}`
            }
        ];
        
        for (const migration of essentialMigrations) {
            try {
                await client.query(migration.sql);
                console.log(`✅ ${migration.name}`);
            } catch (error) {
                console.log(`⚠️  ${migration.name}: ${error.message}`);
            }
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`✅ Migrations complete! (${migrationsRun} new migrations run)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migrations
runMigrations().catch(console.error);
