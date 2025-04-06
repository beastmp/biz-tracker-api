/**
 * Item Routes
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const {upload, uploadErrorHandler, uploadToStorage} =
  require("../utils/fileUpload");
const handlerFactory = require("../utils/handlerFactory");
const {processFileUpload} = require("../middleware");
const {getProviderFactory} = require("../providers");
const {withTransaction} = require("../utils/transactionUtils");
const {getItemRepository} = require("../utils/repositoryUtils");
const {rebuildRelationships} = require("../utils/itemRelationships");
const {rebuildInventory, rebuildItemInventory} =
  require("../utils/inventoryUtils");
const Item = require("../models/item"); // Add this import statement

// Create handlers using factory
const getAllItems = handlerFactory.getAll("Item");
const getItem = handlerFactory.getOne("Item", "Item");
const createItem = handlerFactory.createOne("Item");
const updateItem = handlerFactory.updateOne("Item", "Item");
const deleteItem = handlerFactory.deleteOne("Item", "Item");

// Get repository for special operations
const itemRepository = getProviderFactory().getItemRepository();

// Get all items
router.get("/", getAllItems);

// Get the next available SKU number
router.get("/nextsku", async (req, res, next) => {
  try {
    const nextSku = await itemRepository.getNextSku();
    res.json({nextSku});
  } catch (err) {
    next(err);
  }
});

// Get all categories
router.get("/categories", async (req, res, next) => {
  try {
    const categories = await itemRepository.getCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

// Get all tags
router.get("/tags", async (req, res, next) => {
  try {
    const tags = await itemRepository.getTags();
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// Create new item
router.post("/",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    createItem,
);

// Get one item
router.get("/:id", async (req, res, next) => {
  try {
    const {id} = req.params;
    const {populate = "false"} = req.query;

    // For populated requests, use a custom approach
    // to ensure all relationships are populated
    if (populate === "true") {
      // Add debug logging
      console.log(`Fetching item ${id} with populated relationships`);

      const item = await Item.findById(id)
          .populate("derivedFrom.item")
          .populate("derivedItems.item")
          .populate("components.item")
          .populate("usedInProducts");

      if (!item) {
        console.log(`Item ${id} not found`);
        return res.status(404).json({message: "Item not found"});
      }

      // Add debug logging for relationships
      console.log(`Item ${id} found. Has derivedFrom:`, !!item.derivedFrom);
      console.log(`Item ${id} has ${item.derivedItems ?
        item.derivedItems.length : 0} derived items`);

      return res.json(item);
    }

    // Use the standard handler for non-populated requests
    return getItem(req, res, next);
  } catch (err) {
    console.error(`Error fetching item ${req.params.id}:`, err);
    next(err);
  }
});

// Update item
router.patch("/:id",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    updateItem,
);

// // Upload image for an item
// router.patch("/:id/image",
//     upload.single("image"),
//     uploadErrorHandler,
//     uploadToStorage,
//     async (req, res, next) => {
//       try {
//         if (!req.file || !req.file.storageUrl) {
//           return res.status(400).json({message: "No image uploaded"});
//         }

//         const item =
//           await itemRepository.updateImage(req.params.id,
//  req.file.storageUrl);
//         if (!item) {
//           return res.status(404).json({message: "Item not found"});
//         }

//         res.json(item);
//       } catch (err) {
//         next(err);
//       }
//     },
// );

router.patch("/:id/image", async (req, res) => {
  try {
    const {id} = req.params;
    const {image, filename, contentType} = req.body;

    if (!image || !contentType) {
      return res.status(400).json({message: "Missing required image data"});
    }

    // Get the proper provider instances from your factory
    const providerFactory = getProviderFactory();
    const storageProvider = providerFactory.getStorageProvider();
    const itemRepository = providerFactory.getItemRepository();

    console.log("Uploading image for item:", id);

    // Convert base64 back to buffer
    const buffer = Buffer.from(image, "base64");

    // Generate a unique filename if not provided
    const fileExt = contentType.split("/")[1] || "jpg";
    const finalFilename = filename || `item-${id}-${Date.now()}.${fileExt}`;

    // Use the storage provider to save the file
    const imageUrl = await storageProvider.uploadFile(
        buffer,
        finalFilename,
        contentType,
    );

    console.log("Image uploaded successfully. URL:", imageUrl);

    // Update the item with the new image URL
    const updatedItem = await itemRepository.updateImage(id, imageUrl);

    if (!updatedItem) {
      return res.status(404).json({message: "Item not found"});
    }

    res.json({imageUrl});
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      message: "Failed to upload image",
      error: error.message,
    });
  }
});

// Delete item
router.delete("/:id", deleteItem);

// Rebuild all item relationships
router.post("/rebuild-relationships", async (req, res, next) => {
  try {
    const result = await itemRepository.rebuildRelationships();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Get item relationships
router.get("/:id/relationships", async (req, res, next) => {
  try {
    const relationships =
      await itemRepository.getItemRelationships(req.params.id);
    res.json(relationships);
  } catch (err) {
    next(err);
  }
});

// NEW ENDPOINTS FOR INVENTORY BREAKDOWN

// Break down an item into derived items
router.post("/:id/breakdown", async (req, res, next) => {
  try {
    const sourceItemId = req.params.id;
    const {derivedItems} = req.body;

    // Debug: Log the request parameters
    console.log(`Creating breakdown items for source
      ${sourceItemId} with ${derivedItems && derivedItems.length || 0} items`);

    if (!sourceItemId) {
      return res.status(400).json({message: "Source item ID is required"});
    }

    if (!derivedItems || !Array.isArray(derivedItems) ||
        derivedItems.length === 0) {
      return res.status(400).json({message: "Derived items are required"});
    }

    // Validate that each derived item has the necessary data
    // based on whether it's new or existing
    for (const item of derivedItems) {
      if (item.itemId) {
        // Existing item - must have valid measurement values
        if (item.quantity === undefined &&
            item.weight === undefined &&
            item.length === undefined &&
            item.area === undefined &&
            item.volume === undefined) {
          return res.status(400).json({
            message: `Each allocation must include a valid measurement
              value (quantity, weight, length, area, or volume)`,
          });
        }
      } else {
        // New item - must have name, sku and measurement values
        if (!item.name || !item.sku) {
          return res.status(400).json({
            message: "Each new derived item must have a name and SKU",
          });
        }
        if (item.quantity === undefined &&
            item.weight === undefined &&
            item.length === undefined &&
            item.area === undefined &&
            item.volume === undefined) {
          return res.status(400).json({
            message: `Each derived item must include a valid measurement
              value (quantity, weight, length, area, or volume)`,
          });
        }
      }
    }

    // Use transaction to ensure all operations succeed or fail together
    const result = await withTransaction(async (transaction) => {
      const itemRepo = getItemRepository();
      return await itemRepo.createDerivedItems(sourceItemId,
          derivedItems, transaction);
    });

    // Debug: Log the result
    console.log(`Successfully created
      ${result.derivedItems.length} derived items`);

    // Check each derived item for proper derivedFrom
    result.derivedItems.forEach((item, idx) => {
      console.log(`Derived item ${idx + 1}: ${item._id}`, {
        name: item.name,
        hasDerivedFrom: !!item.derivedFrom,
        derivedFromItem: item.derivedFrom && item.derivedFrom.item,
      });
    });

    res.json(result);
  } catch (err) {
    console.error("Error breaking down item:", err);
    next(err);
  }
});

// Get all derived items for a source item
router.get("/:id/derived", async (req, res, next) => {
  try {
    const sourceItemId = req.params.id;
    const derivedItems = await itemRepository.getDerivedItems(sourceItemId);
    res.json(derivedItems);
  } catch (err) {
    next(err);
  }
});

// Get the parent item for a derived item
router.get("/:id/parent", async (req, res, next) => {
  try {
    const derivedItemId = req.params.id;
    const parentItem = await itemRepository.getParentItem(derivedItemId);

    if (!parentItem) {
      return res.status(404).json({message: "Parent item not found"});
    }

    res.json(parentItem);
  } catch (err) {
    next(err);
  }
});

// Rebuild item relationships (materials and products)
router.post("/utility/rebuild-relationships", async (req, res, next) => {
  try {
    const {itemRepository} = req.providers;
    const results = await rebuildRelationships(itemRepository);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// NEW ENDPOINT: Rebuild inventory quantities, costs and prices
router.post("/utility/rebuild-inventory", async (req, res, next) => {
  try {
    // Set a longer timeout for the response
    req.setTimeout(120000); // 2 minutes
    res.setTimeout(120000); // 2 minutes

    // Fix: Get providers directly from the factory instead of req.providers
    const providerFactory = getProviderFactory();
    const providers = {
      itemRepository: providerFactory.getItemRepository(),
      purchaseRepository: providerFactory.getPurchaseRepository(),
      salesRepository: providerFactory.getSalesRepository(),
    };

    // Process items in smaller batches to avoid timeouts
    const results = await rebuildInventory(providers);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// NEW ENDPOINT: Rebuild inventory for a specific item
router.post("/utility/rebuild-inventory/:id", async (req, res, next) => {
  try {
    // Fix: Get providers directly from the factory instead of req.providers
    const providerFactory = getProviderFactory();
    const providers = {
      itemRepository: providerFactory.getItemRepository(),
      purchaseRepository: providerFactory.getPurchaseRepository(),
      salesRepository: providerFactory.getSalesRepository(),
    };

    const result = await rebuildItemInventory(req.params.id, providers);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
