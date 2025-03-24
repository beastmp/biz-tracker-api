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

// IMPORTANT: Define specific routes BEFORE the :id route
// Get the next available SKU number
router.get('/nextsku', async (req, res) => {
  try {
    // Find items with numeric SKUs
    const items = await Item.find({ sku: /^\d+$/ });
    
    // Extract SKU numbers and convert to integers
    let maxSkuNumber = 0;
    items.forEach(item => {
      const skuNumber = parseInt(item.sku);
      if (!isNaN(skuNumber) && skuNumber > maxSkuNumber) {
        maxSkuNumber = skuNumber;
      }
    });
    
    // Generate next SKU with zero padding (10 digits)
    const nextSkuNumber = maxSkuNumber + 1;
    const nextSku = nextSkuNumber.toString().padStart(10, '0');
    
    res.json({ nextSku });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all unique categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Item.aggregate([
      { $group: { _id: "$category" } },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(categories.map(cat => cat._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all unique tags
router.get('/tags', async (req, res) => {
  try {
    const tags = await Item.aggregate([
      { $unwind: "$tags" },
      { $group: { _id: "$tags" } },
      { $match: { _id: { $ne: null, $ne: "" } } },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(tags.map(tag => tag._id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// NOW define the :id route AFTER the specific routes
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
    
    // Handle tags (parse JSON string if needed)
    if (typeof req.body.tags === 'string') {
      try {
        // First try to parse as JSON
        itemData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        // Fallback to comma-separated handling
        itemData.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
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
    
    // Handle tags (parse JSON string if needed)
    if (typeof req.body.tags === 'string') {
      try {
        // First try to parse as JSON
        itemData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        // Fallback to comma-separated handling
        itemData.tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
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