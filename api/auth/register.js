/**
 * Vercel Serverless Function for User Registration
 * Handles new user registration with password hashing
 */

const { pool, testConnection, initializeDatabase, getUserByEmail, upsertUser } = require('../db-connection');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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
    const { email, password, name, level = 'Beginner' } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Initialize database if needed
    await initializeDatabase();

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in database
    const newUser = await upsertUser({
      user_id: generateUserId(),
      email: email,
      name: name,
      level: level,
      password_hash: passwordHash,
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

    // Validate JWT secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser.user_id,
        email: newUser.email
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    // Remove sensitive data from user object
    const { password_hash, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function to generate unique user ID
function generateUserId() {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}