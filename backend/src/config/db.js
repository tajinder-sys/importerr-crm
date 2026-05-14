const mongoose = require('mongoose');

const connectDB = async () => {
  const t0 = Date.now();
  await mongoose.connect(process.env.MONGODB_URI);
  return Date.now() - t0;
};

module.exports = connectDB;