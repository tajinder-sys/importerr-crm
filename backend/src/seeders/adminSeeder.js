const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing admin users (optional - remove if you want to keep existing data)
    await User.deleteMany({ role: 'admin' });
    console.log('Cleared existing admin users');

    // Create admin user first (without team).
    // Password must be plain text here; User model hashes it in pre-save hook.
    const admin = new User({
      name: 'System Administrator',
      email: 'admin@crm.com',
      password: 'admin123',
      role: 'admin',
      phone: '9876543210',
      isActive: true
    });

    await admin.save();
    console.log('Admin user saved');

    console.log('\n=== Admin Account Created ===');
    console.log('Email: admin@crm.com');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('=============================\n');

  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seeder
seedAdmin();
