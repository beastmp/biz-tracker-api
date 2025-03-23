const express = require('express');
const router = express.Router();
const Item = require('../models/item');
const { upload, uploadToFirebase } = require('../utils/fileUpload');

// Get all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new item with Firebase image upload
router.post('/', upload.single('image'), uploadToFirebase, async (req, res) => {
  try {
    const itemData = { ...req.body };
    
    // Handle tags (convert comma-separated string to array if needed)
    if (typeof req.body.tags === 'string') {
      itemData.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    // Add image URL if file was uploaded to Firebase
    if (req.file && req.file.firebaseUrl) {
      itemData.imageUrl = req.file.firebaseUrl;
    }
    
    const item = new Item(itemData);
    const newItem = await item.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update item with Firebase image upload
router.patch('/:id', upload.single('image'), uploadToFirebase, async (req, res) => {
  try {
    const itemData = { ...req.body, lastUpdated: Date.now() };
    
    // Handle tags (convert comma-separated string to array if needed)
    if (typeof req.body.tags === 'string') {
      itemData.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
    
    // Add image URL if file was uploaded to Firebase
    if (req.file && req.file.firebaseUrl) {
      itemData.imageUrl = req.file.firebaseUrl;
    }
    
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      itemData,
      { new: true }
    );
    
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;