const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in .env');
  }

  const t0 = Date.now();
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });
  return Date.now() - t0;
};

module.exports = connectDB;