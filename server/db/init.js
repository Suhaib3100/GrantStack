/**
 * ============================================
 * Database Initialization Script
 * ============================================
 * Run this script to initialize the database schema.
 * Usage: npm run db:init
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const logger = console;

// Check if using DATABASE_URI (cloud database like Neon)
const useConnectionString = !!process.env.DATABASE_URI;

// Database configuration for local PostgreSQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    // Connect to postgres database first to create the target database
    database: 'postgres'
};

const targetDatabase = process.env.DB_NAME || 'tg_bot_track';

async function initDatabase() {
    logger.log('Starting database initialization...');
    
    let targetPool;
    
    if (useConnectionString) {
        // Using DATABASE_URI (e.g., Neon) - database already exists
        logger.log('Using DATABASE_URI connection string...');
        targetPool = new Pool({
            connectionString: process.env.DATABASE_URI,
            ssl: { rejectUnauthorized: false }
        });
    } else {
        // Local PostgreSQL - need to create database first
        const adminPool = new Pool(dbConfig);
        
        try {
            // Check if database exists
            const dbCheckResult = await adminPool.query(
                `SELECT 1 FROM pg_database WHERE datname = $1`,
                [targetDatabase]
            );
            
            if (dbCheckResult.rows.length === 0) {
                logger.log(`Creating database: ${targetDatabase}`);
                await adminPool.query(`CREATE DATABASE ${targetDatabase}`);
                logger.log('Database created successfully');
            } else {
                logger.log(`Database ${targetDatabase} already exists`);
            }
        } catch (error) {
            logger.error('Error checking/creating database:', error.message);
            throw error;
        } finally {
            await adminPool.end();
        }
        
        // Connect to the target database
        targetPool = new Pool({
            ...dbConfig,
            database: targetDatabase
        });
    }
    
    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        logger.log('Executing schema...');
        await targetPool.query(schema);
        logger.log('Schema executed successfully');
        
        // Verify tables were created
        const tablesResult = await targetPool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        
        logger.log('Created tables:', tablesResult.rows.map(r => r.table_name));
        
    } catch (error) {
        if (error.message.includes('already exists')) {
            logger.log('Some objects already exist, skipping...');
        } else {
            logger.error('Error executing schema:', error.message);
            throw error;
        }
    } finally {
        await targetPool.end();
    }
    
    logger.log('Database initialization complete!');
}

// Run initialization
initDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
        logger.error('Initialization failed:', error);
        process.exit(1);
    });
