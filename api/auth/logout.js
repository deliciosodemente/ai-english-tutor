import { testConnection } from '../db-connection.js';

/**
 * Vercel Serverless Function for user logout
 * Handles JWT token invalidation (client-side token removal)
 */
export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database connection failed' 
      });
    }

    // For logout, we simply return success since JWT is stateless
    // Client should remove the token from storage
    res.status(200).json({ 
      success: true, 
      message: 'Logout successful. Please remove the token from client storage.'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error during logout' 
    });
  }
}