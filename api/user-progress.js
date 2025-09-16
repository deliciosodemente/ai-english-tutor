/**
 * Vercel Serverless Function for User Progress Management
 * Handles user progress, lessons, and statistics with PostgreSQL
 */

const { 
  testConnection, 
  initializeDatabase, 
  getUser, 
  upsertUser, 
  addLesson, 
  getUserLessons,
  logSync 
} = require('./db-connection');

const { authenticateToken, getUserIdFromToken } = require('../utils/session');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Authenticate token for all methods except OPTIONS
  const authResult = authenticateToken(req, res, () => {});
  if (authResult) {
    return authResult; // Return error response if authentication failed
  }

  try {
    const { method } = req;
    const { lessonData, stats } = req.body;
    
    // Get user ID from token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    switch (method) {
      case 'GET':
        return handleGetProgress(req, res, userId);
      case 'POST':
        return handleCreateProgress(req, res, userId);
      case 'PUT':
        return handleUpdateProgress(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('User Progress Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGetProgress(req, res, userId) {

  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Initialize database if needed
    await initializeDatabase();

    // Get user from database
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent lessons
    const recentLessons = await getUserLessons(userId, 5);

    const progressData = {
      userId: user.user_id,
      name: user.name,
      level: user.level,
      totalLessons: user.total_lessons,
      completedLessons: user.completed_lessons,
      currentStreak: user.current_streak,
      longestStreak: user.longest_streak,
      averageScore: parseFloat(user.conversation_score),
      vocabularyLearned: user.vocabulary_learned?.length || 0,
      lastLessonDate: user.last_lesson_date,
      recentLessons: recentLessons.map(lesson => ({
        id: lesson.id,
        date: lesson.date,
        level: lesson.level,
        score: parseFloat(lesson.score),
        topics: lesson.topics || [],
        duration: lesson.duration
      }))
    };

    return res.status(200).json({
      success: true,
      data: progressData
    });

  } catch (error) {
    console.error('Error getting progress:', error);
    return res.status(500).json({ 
      error: 'Failed to get user progress',
      details: error.message 
    });
  }
}

async function handleCreateProgress(req, res, userId) {
  const { lessonData } = req.body;
  
  if (!lessonData) {
    return res.status(400).json({ error: 'Lesson data is required' });
  }

  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Initialize database if needed
    await initializeDatabase();

    // Add lesson to database
    const lesson = await addLesson({
      user_id: userId,
      date: lessonData.date || new Date().toISOString(),
      level: lessonData.level,
      duration: lessonData.duration || 5,
      topics: lessonData.topics || [],
      score: lessonData.score,
      feedback: lessonData.feedback || 'Good progress!',
      audio_url: lessonData.audio_url
    });

    if (!lesson) {
      return res.status(500).json({ error: 'Failed to create lesson' });
    }

    // Log the activity
    await logSync(userId, 'lesson_created', 'success', lessonData);

    return res.status(201).json({
      success: true,
      message: 'Progress created successfully',
      data: lesson
    });

  } catch (error) {
    console.error('Error creating progress:', error);
    await logSync(userId, 'lesson_created', 'error', lessonData, error.message);
    return res.status(500).json({ 
      error: 'Failed to create progress',
      details: error.message 
    });
  }
}

async function handleUpdateProgress(req, res, userId) {
  const { stats } = req.body;
  
  if (!stats) {
    return res.status(400).json({ error: 'Stats are required' });
  }

  try {
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      return res.status(500).json({ error: 'Database connection failed' });
    }

    // Initialize database if needed
    await initializeDatabase();

    // Get current user data
    const currentUser = await getUser(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user with new stats
    const updatedUser = await upsertUser({
      user_id: userId,
      name: currentUser.name,
      level: stats.level || currentUser.level,
      total_lessons: stats.totalLessons || currentUser.total_lessons,
      completed_lessons: stats.completedLessons || currentUser.completed_lessons,
      current_streak: stats.currentStreak || currentUser.current_streak,
      longest_streak: stats.longestStreak || currentUser.longest_streak,
      last_lesson_date: new Date().toISOString(),
      vocabulary_learned: stats.vocabularyLearned || currentUser.vocabulary_learned,
      grammar_points: currentUser.grammar_points,
      pronunciation_score: stats.pronunciationScore || currentUser.pronunciation_score,
      conversation_score: stats.averageScore || currentUser.conversation_score
    });

    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user progress' });
    }

    // Log the activity
    await logSync(userId, 'progress_updated', 'success', stats);

    return res.status(200).json({
      success: true,
      message: 'Progress updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error updating progress:', error);
    await logSync(userId, 'progress_updated', 'error', stats, error.message);
    return res.status(500).json({ 
      error: 'Failed to update progress',
      details: error.message 
    });
  }
}
