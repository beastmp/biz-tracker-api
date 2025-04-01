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
router.get("/:id", getItem);

// Update item
router.patch("/:id",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    updateItem,
);

// Upload image for an item
router.patch("/:id/image",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    async (req, res, next) => {
      try {
        if (!req.file || !req.file.storageUrl) {
          return res.status(400).json({message: "No image uploaded"});
        }

        const item =
          await itemRepository.updateImage(req.params.id, req.file.storageUrl);
        if (!item) {
          return res.status(404).json({message: "Item not found"});
        }

        res.json(item);
      } catch (err) {
        next(err);
      }
    },
);

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

    if (!sourceItemId) {
      return res.status(400).json({message: "Source item ID is required"});
    }

    if (!derivedItems || !Array.isArray(derivedItems) || derivedItems.length === 0) {
      return res.status(400).json({message: "Derived items are required"});
    }

    // Use transaction to ensure all operations succeed or fail together
    const result = await withTransaction(async (transaction) => {
      const itemRepo = getItemRepository();
      return await itemRepo.createDerivedItems(sourceItemId, derivedItems, transaction);
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

module.exports = router;
