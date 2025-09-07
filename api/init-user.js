/**
 * Vercel Serverless Function for User Initialization
 * Creates new users in the PostgreSQL database
 */

const { 
  testConnection, 
  initializeDatabase, 
  getUser, 
  upsertUser 
} = require('./db-connection');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, name, level = 'Beginner' } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: 'User ID and name are required' });
    }

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Initialize database if needed
    await initializeDatabase();

    // Check if user already exists
    const existingUser = await getUser(userId);
    if (existingUser) {
      return res.status(200).json({
        success: true,
        message: 'User already exists',
        data: existingUser
      });
    }

    // Create new user
    const newUser = await upsertUser({
      user_id: userId,
      name: name,
      level: level,
      total_lessons: 0,
      completed_lessons: 0,
      current_streak: 0,
      longest_streak: 0,
      last_lesson_date: new Date().toISOString(),
      vocabulary_learned: [],
      grammar_points: [],
      pronunciation_score: 0,
      conversation_score: 0
    });

    if (!newUser) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });

  } catch (error) {
    console.error('User initialization error:', error);
    return res.status(500).json({ 
      error: 'Failed to initialize user',
      details: error.message 
    });
  }
}
