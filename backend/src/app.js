const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// DB connection is handled in server.js startup

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLogger);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/leads', require('./routes/lead'));
app.use('/api/channels', require('./routes/channelLeadRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/payment-methods', require('./routes/paymentMethodRoutes'));
app.use('/api/pipelines', require('./routes/pipelineRoutes'));
app.use('/api/stages', require('./routes/stageRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/importerr', require('./routes/callImporterr/product'));
app.use('/api/seller-assignments', require('./routes/sellerAssignmentRoutes'));
app.use('/api/crm', require('./routes/callByImporterr/auth'));
app.use('/api/crm', require('./routes/callByImporterr/lead'));
app.use('/api/quote', require('./routes/quote'));
app.use('/api/export', require('./routes/exportRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.use(errorHandler);

module.exports = app;