/**
 * Database connection utility for PostgreSQL AWS RDS
 */

const { Pool } = require('pg');

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    
    // Create users table with authentication support
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        level VARCHAR(50) NOT NULL DEFAULT 'Beginner',
        total_lessons INTEGER DEFAULT 0,
        completed_lessons INTEGER DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_lesson_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        vocabulary_learned TEXT[] DEFAULT '{}',
        grammar_points TEXT[] DEFAULT '{}',
        pronunciation_score DECIMAL(3,1) DEFAULT 0,
        conversation_score DECIMAL(3,1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create lessons table
    await client.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        level VARCHAR(50) NOT NULL,
        duration INTEGER DEFAULT 5,
        topics TEXT[] DEFAULT '{}',
        score DECIMAL(3,1) NOT NULL,
        feedback TEXT,
        audio_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    // Create sync_logs table for DeAcademy synchronization
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        sync_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        data JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
      CREATE INDEX IF NOT EXISTS idx_lessons_user_id ON lessons(user_id);
      CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date);
      CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
    `);

    client.release();
    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

// Get user by user_id
async function getUser(userId) {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
    client.release();
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

// Get user by email
async function getUserByEmail(email) {
  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    client.release();
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

// Create or update user
async function upsertUser(userData) {
  try {
    const client = await pool.connect();
    
    // Build query dynamically based on provided fields
    const fields = [];
    const values = [];
    const setClauses = [];
    let paramCount = 1;

    // Define all possible fields with their parameter positions
    const fieldMappings = {
      user_id: { value: userData.user_id, required: true },
      email: { value: userData.email, required: false },
      name: { value: userData.name, required: true },
      password_hash: { value: userData.password_hash, required: false },
      level: { value: userData.level, required: false },
      total_lessons: { value: userData.total_lessons, required: false },
      completed_lessons: { value: userData.completed_lessons, required: false },
      current_streak: { value: userData.current_streak, required: false },
      longest_streak: { value: userData.longest_streak, required: false },
      last_lesson_date: { value: userData.last_lesson_date, required: false },
      vocabulary_learned: { value: userData.vocabulary_learned, required: false },
      grammar_points: { value: userData.grammar_points, required: false },
      pronunciation_score: { value: userData.pronunciation_score, required: false },
      conversation_score: { value: userData.conversation_score, required: false }
    };

    // Build INSERT part
    for (const [field, config] of Object.entries(fieldMappings)) {
      if (config.value !== undefined) {
        fields.push(field);
        values.push(config.value);
        paramCount++;
      } else if (config.required) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Build UPDATE part
    const updateParts = [];
    for (const [field, config] of Object.entries(fieldMappings)) {
      if (field !== 'user_id' && config.value !== undefined) {
        updateParts.push(`${field} = EXCLUDED.${field}`);
      }
    }
    updateParts.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      INSERT INTO users (${fields.join(', ')})
      VALUES (${fields.map((_, i) => `$${i + 1}`).join(', ')})
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        ${updateParts.join(', ')}
      RETURNING *
    `;

    const result = await client.query(query, values);
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error upserting user:', error);
    return null;
  }
}

// Add lesson
async function addLesson(lessonData) {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO lessons (user_id, date, level, duration, topics, score, feedback, audio_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      lessonData.user_id,
      lessonData.date,
      lessonData.level,
      lessonData.duration,
      lessonData.topics,
      lessonData.score,
      lessonData.feedback,
      lessonData.audio_url
    ]);
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error adding lesson:', error);
    return null;
  }
}

// Get user lessons
async function getUserLessons(userId, limit = 10) {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM lessons 
      WHERE user_id = $1 
      ORDER BY date DESC 
      LIMIT $2
    `, [userId, limit]);
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error getting user lessons:', error);
    return [];
  }
}

// Log sync activity
async function logSync(userId, syncType, status, data = null, errorMessage = null) {
  try {
    const client = await pool.connect();
    await client.query(`
      INSERT INTO sync_logs (user_id, sync_type, status, data, error_message)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, syncType, status, data ? JSON.stringify(data) : null, errorMessage]);
    client.release();
  } catch (error) {
    console.error('Error logging sync:', error);
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
  getUser,
  getUserByEmail,
  upsertUser,
  addLesson,
  getUserLessons,
  logSync
};
