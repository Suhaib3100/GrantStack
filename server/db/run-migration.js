/**
 * Run database migration for user approval system
 */
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_mwexS6CMN3Xo@ep-still-voice-a4tsektj-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        console.log('Running migration...');
        
        // Add columns
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE
        `);
        console.log('✓ Added is_approved column');
        
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS access_requested BOOLEAN DEFAULT FALSE
        `);
        console.log('✓ Added access_requested column');
        
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE
        `);
        console.log('✓ Added approved_at column');
        
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS approved_by BIGINT
        `);
        console.log('✓ Added approved_by column');
        
        // Set admin as approved
        const result = await pool.query(`
            UPDATE users SET is_approved = TRUE WHERE telegram_id = 6737328498
            RETURNING *
        `);
        
        if (result.rowCount > 0) {
            console.log('✓ Admin user set as approved');
        } else {
            console.log('ℹ Admin user not found yet (will be approved on first use)');
        }
        
        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_is_approved ON users(is_approved)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_access_requested ON users(access_requested)
        `);
        console.log('✓ Created indexes');
        
        console.log('\n✅ Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    } finally {
        await pool.end();
    }
}

runMigration();
