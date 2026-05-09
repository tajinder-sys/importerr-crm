/**
 * Database Indexes for Performance Optimization
 * This file defines all necessary indexes for optimal query performance
 */

const User = require('../models/User');
const Team = require('../models/Team');

/**
 * Create all necessary database indexes
 * Should be called during application startup
 */
async function createIndexes() {
  try {
    console.log('Creating database indexes...');

    // User collection indexes
    await User.collection.createIndexes([
      // Email uniqueness and lookup
      { key: { email: 1 }, unique: true },
      
      // Role-based filtering
      { key: { role: 1 } },
      
      // Status filtering
      { key: { isActive: 1 } },
      
      // Team membership lookup
      { key: { 'teams.teamId': 1 } },
      
      // Compound index for team + role filtering
      { key: { 'teams.teamId': 1, 'teams.role': 1 } },
      
      // Last login sorting
      { key: { lastLogin: -1 } },
      
      // Created date sorting
      { key: { createdAt: -1 } },
      
      // Search optimization
      { key: { name: 'text', email: 'text' } }
    ]);

    // Team collection indexes
    await Team.collection.createIndexes([
      // Name uniqueness
      { key: { name: 1 }, unique: true },
      
      // Slug lookup
      { key: { slug: 1 }, unique: true },
      
      // Status filtering
      { key: { status: 1 } },
      
      // Creator lookup
      { key: { createdBy: 1 } },
      
      // Member lookup
      { key: { 'members.user': 1 } },
      
      // Compound index for status + name sorting
      { key: { status: 1, name: 1 } },
      
      // Compound index for status + created date sorting
      { key: { status: 1, createdAt: -1 } },
      
      // Compound index for member lookup with role
      { key: { 'members.user': 1, 'members.role': 1 } }
      
      // Created date sorting
      { key: { createdAt: -1 } }
      
      // Updated date sorting
      { key: { updatedAt: -1 } }
      
      // Search optimization
      { name: 'text', description: 'text' }
    ]);

    console.log('Database indexes created successfully');
    return true;
  } catch (error) {
    console.error('Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Drop all custom indexes (for development/reset purposes)
 */
async function dropIndexes() {
  try {
    console.log('Dropping custom database indexes...');
    
    await User.collection.dropIndexes();
    await Team.collection.dropIndexes();
    
    console.log('Custom database indexes dropped successfully');
    return true;
  } catch (error) {
    console.error('Error dropping database indexes:', error);
    throw error;
  }
}

/**
 * Get index statistics
 */
async function getIndexStats() {
  try {
    const userIndexes = await User.collection.getIndexes();
    const teamIndexes = await Team.collection.getIndexes();
    
    return {
      users: userIndexes,
      teams: teamIndexes
    };
  } catch (error) {
    console.error('Error getting index stats:', error);
    throw error;
  }
}

module.exports = {
  createIndexes,
  dropIndexes,
  getIndexStats
};
