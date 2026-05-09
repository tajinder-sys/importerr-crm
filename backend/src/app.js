const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/leads', require('./routes/lead'));
app.use('/api/channels', require('./routes/channelLeadRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/payment-methods', require('./routes/paymentMethodRoutes'));
app.use('/api/importerr', require('./routes/callImporterr/product'));
app.use('/api/crm', require('./routes/callByImporterr/auth'));
app.use('/api/crm', require('./routes/callByImporterr/lead'));
app.use('/api/quote', require('./routes/quote'));

app.use(errorHandler);

module.exports = app;