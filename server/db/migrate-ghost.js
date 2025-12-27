/**
 * Migration: Add 'ghost' permission type
 * Run: node db/migrate-ghost.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URI;

if (!connectionString) {
    console.error('ERROR: DATABASE_URL or DATABASE_URI is required');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Starting migration: Add ghost permission type...');
    
    try {
        // Drop old constraint
        await pool.query('ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_permission_type_check');
        console.log('✓ Dropped old constraint');
        
        // Add new constraint with ghost
        await pool.query(`
            ALTER TABLE sessions 
            ADD CONSTRAINT sessions_permission_type_check 
            CHECK (permission_type IN ('location', 'single_photo', 'continuous_photo', 'video', 'microphone', 'ghost'))
        `);
        console.log('✓ Added new constraint with ghost permission type');
        
        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
