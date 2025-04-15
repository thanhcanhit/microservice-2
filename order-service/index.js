const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('./db');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev')); // Add Morgan logger

// Routes
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'order-service' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await db.initDatabase();

    app.listen(PORT, () => {
      console.log(`Order Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
