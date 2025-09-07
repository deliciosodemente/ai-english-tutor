/**
 * Vercel Serverless Function for User Progress Management
 * Handles user progress, lessons, and statistics
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method } = req;
    const { userId, lessonData, stats } = req.body;

    switch (method) {
      case 'GET':
        return handleGetProgress(req, res);
      case 'POST':
        return handleCreateProgress(req, res);
      case 'PUT':
        return handleUpdateProgress(req, res);
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

async function handleGetProgress(req, res) {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // In a real implementation, you would fetch from a database
  // For now, we'll return mock data
  const mockProgress = {
    userId,
    totalLessons: 15,
    completedLessons: 12,
    currentStreak: 5,
    longestStreak: 12,
    averageScore: 8.5,
    vocabularyLearned: 45,
    level: 'Intermediate',
    lastLessonDate: new Date().toISOString(),
    recentLessons: [
      {
        id: '1',
        date: new Date().toISOString(),
        level: 'Intermediate',
        score: 8.5,
        topics: ['conversation', 'pronunciation']
      }
    ]
  };

  return res.status(200).json({
    success: true,
    data: mockProgress
  });
}

async function handleCreateProgress(req, res) {
  const { userId, lessonData } = req.body;
  
  if (!userId || !lessonData) {
    return res.status(400).json({ error: 'User ID and lesson data are required' });
  }

  // In a real implementation, you would save to a database
  console.log(`Creating progress for user ${userId}:`, lessonData);

  return res.status(201).json({
    success: true,
    message: 'Progress created successfully',
    data: {
      id: Date.now().toString(),
      userId,
      ...lessonData,
      createdAt: new Date().toISOString()
    }
  });
}

async function handleUpdateProgress(req, res) {
  const { userId, stats } = req.body;
  
  if (!userId || !stats) {
    return res.status(400).json({ error: 'User ID and stats are required' });
  }

  // In a real implementation, you would update the database
  console.log(`Updating progress for user ${userId}:`, stats);

  return res.status(200).json({
    success: true,
    message: 'Progress updated successfully',
    data: {
      userId,
      ...stats,
      updatedAt: new Date().toISOString()
    }
  });
}
