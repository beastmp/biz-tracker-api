const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const Item = require("../models/item");
const {upload, uploadToFirebase, uploadErrorHandler} =
  require("../utils/fileUpload");

// Get all items
router.get("/", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// IMPORTANT: Define specific routes BEFORE the :id route
// Get the next available SKU number
router.get("/nextsku", async (req, res) => {
  try {
    // Find items with numeric SKUs
    const items = await Item.find({sku: /^\d+$/});

    // Extract SKU numbers and convert to integers
    let maxSkuNumber = 0;
    items.forEach((item) => {
      const skuNumber = parseInt(item.sku);
      if (!isNaN(skuNumber) && skuNumber > maxSkuNumber) {
        maxSkuNumber = skuNumber;
      }
    });

    // Generate next SKU with zero padding (10 digits)
    const nextSkuNumber = maxSkuNumber + 1;
    const nextSku = nextSkuNumber.toString().padStart(10, "0");

    res.json({nextSku});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Get all unique categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Item.aggregate([
      {$group: {_id: "$category"}},
      {$match: {_id: {$ne: null || ""}}},
      {$sort: {_id: 1}},
    ]);

    res.json(categories.map((cat) => cat._id));
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Get all unique tags
router.get("/tags", async (req, res) => {
  try {
    const tags = await Item.aggregate([
      {$unwind: "$tags"},
      {$group: {_id: "$tags"}},
      {$match: {_id: {$ne: null || ""}}},
      {$sort: {_id: 1}},
    ]);

    res.json(tags.map((tag) => tag._id));
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// NOW define the :id route AFTER the specific routes
// Get single item
router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({message: "Item not found"});
    res.json(item);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

// Create a new item
router.post("/", upload.single("image"), uploadErrorHandler, uploadToFirebase,
    async (req, res) => {
      try {
        console.log("Creating new item");
        console.log("Request body fields:", Object.keys(req.body));
        console.log("Request file:", req.file ?
          `File received: ${req.file.originalname}` : "No file");

        const itemData = {...req.body};

        // Handle tags (parse JSON string if needed)
        if (typeof req.body.tags === "string") {
          try {
            itemData.tags = JSON.parse(req.body.tags);
          } catch (e) {
            console.error("Error parsing tags JSON:", e);
            itemData.tags = req.body.tags.split(",")
                .map((tag) => tag.trim())
                .filter((tag) => tag);
          }
        }

        // Add image URL if file was uploaded to Firebase
        if (req.file && req.file.firebaseUrl) {
          itemData.imageUrl = req.file.firebaseUrl;
        }

        // Convert numeric fields
        ["quantity", "price", "weight"].forEach((field) => {
          if (itemData[field] !== undefined) {
            itemData[field] = parseFloat(itemData[field]);
          }
        });

        // Set creation timestamp
        itemData.createdAt = Date.now();
        itemData.lastUpdated = Date.now();

        const item = new Item(itemData);
        const newItem = await item.save();
        res.status(201).json(newItem);
      } catch (err) {
        console.error("Error creating item:", err);
        res.status(400).json({message: err.message});
      }
    });

// Update an item
router.patch("/:id", upload.single("image"),
    uploadErrorHandler, uploadToFirebase, async (req, res) => {
      try {
        // Log the incoming data for debugging
        console.log("Updating item:", req.params.id);
        console.log("Request body fields:", Object.keys(req.body));
        console.log("File received:", req.file ?
          `${req.file.originalname} (${req.file.size} bytes)` : "No file");

        // Process the item data
        const itemData = {...req.body, lastUpdated: Date.now()};

        // Handle tags (parse JSON string)
        if (typeof req.body.tags === "string") {
          try {
            itemData.tags = JSON.parse(req.body.tags);
          } catch (e) {
            console.error("Error parsing tags JSON:", e);
            itemData.tags = req.body.tags.split(",").map((tag) =>
              tag.trim()).filter(Boolean);
          }
        }

        // Add image URL if file was uploaded to Firebase
        if (req.file && req.file.firebaseUrl) {
          itemData.imageUrl = req.file.firebaseUrl;
        }

        // Convert numeric fields
        ["quantity", "price", "weight", "cost"].forEach((field) => {
          if (itemData[field] !== undefined) {
            itemData[field] = parseFloat(itemData[field]);
          }
        });

        // Get the old item BEFORE updating it
        const oldItem = await Item.findById(req.params.id);
        if (!oldItem) {
          return res.status(404).json({message: "Item not found"});
        }

        // Extract old component IDs before updating
        const oldComponentIds =
          (oldItem.components && oldItem.components.map((c) =>
              typeof c.item === "object" ?
                c.item._id.toString() : c.item.toString(),
          )) || [];

        // Now update the item
        const item = await Item.findByIdAndUpdate(
            req.params.id,
            itemData,
            {new: true, runValidators: true},
        );

        // Then handle component relationships with the correct old/new data
        if (itemData.components && itemData.components.length > 0) {
          // Get new component IDs
          const newComponentIds = itemData.components.map((c) =>
            typeof c.item === "object" ?
              c.item._id.toString() : c.item.toString(),
          );

          // Materials to remove this product from
          const removedComponentIds = oldComponentIds.filter((id) =>
            !newComponentIds.includes(id));

          // Materials to add this product to
          const addedComponentIds = newComponentIds.filter((id) =>
            !oldComponentIds.includes(id));

          // Update usedInProducts for added materials
          if (addedComponentIds.length > 0) {
            await Item.updateMany(
                {_id: {$in: addedComponentIds}},
                {$addToSet: {usedInProducts: req.params.id}},
            );
          }

          // Update usedInProducts for removed materials
          if (removedComponentIds.length > 0) {
            await Item.updateMany(
                {_id: {$in: removedComponentIds}},
                {$pull: {usedInProducts: req.params.id}},
            );
          }
        }

        if (!item) {
          return res.status(404).json({message: "Item not found"});
        }

        console.log("Item updated successfully");
        res.json(item);
      } catch (err) {
        console.error("Error updating item:", err);
        res.status(500).json({message: err.message});
      }
    });

// Add a separate endpoint for image uploads only
router.patch("/:id/image", upload.single("image"), uploadErrorHandler,
    uploadToFirebase, async (req, res) => {
      try {
        console.log("Updating item image for:", req.params.id);

        // Check if we have a file and it was uploaded to Firebase
        if (!req.file || !req.file.firebaseUrl) {
          return res.status(400).json({message: "No image file provided"});
        }

        // Update only the image URL field
        const item = await Item.findByIdAndUpdate(
            req.params.id,
            {
              imageUrl: req.file.firebaseUrl,
              lastUpdated: Date.now(),
            },
            {new: true},
        );

        if (!item) {
          return res.status(404).json({message: "Item not found"});
        }

        console.log("Item image updated successfully");
        res.json(item);
      } catch (err) {
        console.error("Error updating item image:", err);
        res.status(500).json({message: err.message});
      }
    });

// Delete item
router.delete("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({message: "Item not found"});

    await Item.findByIdAndDelete(req.params.id);
    res.json({message: "Item deleted"});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
});

module.exports = router;
