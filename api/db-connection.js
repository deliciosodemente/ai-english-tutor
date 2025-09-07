/**
 * Database connection utility for PostgreSQL AWS RDS
 */

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'ls-691c8588ddc925c70345b1fe910345089b0401c1.ck9s044yeolb.us-east-1.rds.amazonaws.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_english_tutor',
  user: process.env.DB_USER || 'dbmasteruser',
  password: process.env.DB_PASSWORD || '_BU9hjwW7eqj&P7A|x+.l?r?wxSCEk,q',
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
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
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

// Create or update user
async function upsertUser(userData) {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO users (user_id, name, level, total_lessons, completed_lessons, current_streak, longest_streak, last_lesson_date, vocabulary_learned, grammar_points, pronunciation_score, conversation_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        level = EXCLUDED.level,
        total_lessons = EXCLUDED.total_lessons,
        completed_lessons = EXCLUDED.completed_lessons,
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_lesson_date = EXCLUDED.last_lesson_date,
        vocabulary_learned = EXCLUDED.vocabulary_learned,
        grammar_points = EXCLUDED.grammar_points,
        pronunciation_score = EXCLUDED.pronunciation_score,
        conversation_score = EXCLUDED.conversation_score,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      userData.user_id,
      userData.name,
      userData.level,
      userData.total_lessons,
      userData.completed_lessons,
      userData.current_streak,
      userData.longest_streak,
      userData.last_lesson_date,
      userData.vocabulary_learned,
      userData.grammar_points,
      userData.pronunciation_score,
      userData.conversation_score
    ]);
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
  upsertUser,
  addLesson,
  getUserLessons,
  logSync
};
