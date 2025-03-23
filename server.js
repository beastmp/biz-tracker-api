const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PouchDB = require('pouchdb');
const ExpressPouchDB = require('express-pouchdb');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// PouchDB setup
app.use('/db', ExpressPouchDB(PouchDB));

// Routes
app.use('/api/items', require('./routes/items'));
app.use('/api/sales', require('./routes/sales')); // Add sales routes

// Default route
app.get('/', (req, res) => {
  res.send('Biz-Tracker API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});