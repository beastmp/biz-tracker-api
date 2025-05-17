/**
 * Item Routes Module
 *
 * Defines the Express routes for item management operations including
 * creating, reading, updating, and deleting items, as well as handling
 * relationships between items.
 *
 * @module itemRoutes
 * @requires express
 * @requires ../utils/fileUpload
 * @requires ../providers/handlerFactory
 * @requires ../validation
 * @requires ../providers
 * @requires ../utils/transactionUtils
 * @requires ../utils/inventoryUtils
 * @requires ../utils/relationshipUtils
 */
const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const {upload, uploadErrorHandler, uploadToStorage} =
  require("../utils/fileUpload");
const handlerFactory = require("../providers/handlerFactory");
const {processFileUpload} = require("../validation");
const {getProviderFactory} = require("../providers");
const {withTransaction} = require("../utils/transactionUtils");
const {rebuildInventory, rebuildItemInventory} =
  require("../utils/inventoryUtils");
const {
  addProductMaterialRelationship,
  addDerivedItemRelationship,
  getProductComponents,
  getProductsUsingMaterial,
  getSourceForDerivedItem,
  getDerivedItems,
  convertItemRelationships,
  convertAllRelationships,
} = require("../utils/relationshipUtils");

// Create handlers using factory
const getAllItems = handlerFactory.getAll("Item");
const getAllItemsWithRelationships = handlerFactory.getAllWithRelationships("Item");
const getItem = handlerFactory.getOne("Item", "Item");
const getItemWithRelationships = handlerFactory.getOneWithRelationships("Item", "Item");
const createItemWithRelationships = handlerFactory.createOneWithRelationships("Item");
const updateItemWithRelationships = handlerFactory.updateOneWithRelationships("Item", "Item");
const deleteItemWithRelationships = handlerFactory.deleteOneWithRelationships("Item", "Item");

/**
 * Get the repository for item operations
 * @return {Object} Item repository instance
 */
const getItemRepository = () => {
  return getProviderFactory().createItemRepository();
};

/**
 * Get the relationship repository for relationship operations
 * @return {Object} Relationship repository instance
 */
const getRelationshipRepository = () => {
  return getProviderFactory().createRelationshipRepository();
};

// Get all items without relationships (basic endpoint)
router.get("/", getAllItems);

// Get all items with relationships
router.get("/with-relationships", getAllItemsWithRelationships);

// Get one item without relationships (basic endpoint)
router.get("/:id", getItem);

// Get one item with relationships
router.get("/:id/with-relationships", getItemWithRelationships);

/**
 * Create new item
 * POST /items
 */
router.post(
    "/",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    createItemWithRelationships,
);

/**
* Update item
* PATCH /items/:id
*/
router.patch(
    "/:id",
    upload.single("image"),
    uploadErrorHandler,
    uploadToStorage,
    processFileUpload,
    updateItemWithRelationships,
);

// Delete item with relationship cleanup
router.delete("/:id", deleteItemWithRelationships);

/**
 * Get the next available SKU number
 * GET /items/nextsku
 */
router.get("/nextsku", async (req, res, next) => {
  try {
    const itemRepository = getItemRepository();
    const nextSku = await itemRepository.getNextSku();
    res.json({nextSku});
  } catch (err) {
    next(err);
  }
});

/**
 * Get all categories
 * GET /items/categories
 */
router.get("/categories", async (req, res, next) => {
  try {
    const itemRepository = getItemRepository();
    const categories = await itemRepository.getCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

/**
 * Get all tags
 * GET /items/tags
 */
router.get("/tags", async (req, res, next) => {
  try {
    const itemRepository = getItemRepository();
    const tags = await itemRepository.getTags();
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

/**
 * Update item image
 * PATCH /items/:id/image
 */
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
    const itemRepository = getItemRepository();

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

    // Get relationships for response using the helper from factory
    const relationships = await handlerFactory.getRelationshipsForEntity(
        id,
        "Item",
    );

    res.json({
      ...updatedItem,
      relationships,
      imageUrl,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      message: "Failed to upload image",
      error: error.message,
    });
  }
});

/**
 * Rebuild all item relationships using the new relationship system
 * POST /items/rebuild-relationships
 */
router.post("/rebuild-relationships", async (req, res, next) => {
  try {
    // Use the relationship repository for rebuilding with correct method
    const relationshipRepository = getRelationshipRepository();
    const result = await relationshipRepository.rebuildRelationships();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * Get item relationships using the relationship repository
 * GET /items/:id/relationships
 */
router.get("/:id/relationships", async (req, res, next) => {
  try {
    const relationships = await handlerFactory.getRelationshipsForEntity(
        req.params.id,
        "Item",
    );

    res.json(relationships);
  } catch (err) {
    next(err);
  }
});

/**
 * Add product-material relationship
 * POST /items/:productId/components/:materialId
 */
router.post("/:productId/components/:materialId", async (req, res, next) => {
  try {
    const {productId, materialId} = req.params;
    const {measurements} = req.body;

    if (!measurements) {
      return res.status(400).json({
        message: "Measurements are required (quantity, weight, etc.)",
      });
    }

    const relationship = await addProductMaterialRelationship(
        productId,
        materialId,
        measurements,
    );

    res.status(201).json(relationship);
  } catch (err) {
    console.error("Error adding product-material relationship:", err);
    next(err);
  }
});

// Get product components (materials)
router.get("/:id/components", async (req, res, next) => {
  try {
    const {id} = req.params;
    const {populate = "false"} = req.query;

    const components = await getProductComponents(id);

    if (populate === "true") {
      // If populate is requested, get the full item details for each component
      const itemRepo = getProviderFactory().createItemRepository();
      const populatedComponents = await Promise.all(
          components.map(async (comp) => {
            const material = await itemRepo.findById(comp.secondaryId);
            return {
              ...comp,
              material,
            };
          }),
      );
      return res.json(populatedComponents);
    }

    res.json(components);
  } catch (err) {
    console.error(`Error fetching components for item ${req.params.id}:`, err);
    next(err);
  }
});

// Get products using a material
router.get("/:id/used-in", async (req, res, next) => {
  try {
    const {id} = req.params;
    const {populate = "false"} = req.query;

    const products = await getProductsUsingMaterial(id);

    if (populate === "true") {
      // If populate is requested, get the full item details for each product
      const itemRepo = getProviderFactory().createItemRepository();
      const populatedProducts = await Promise.all(
          products.map(async (prod) => {
            const product = await itemRepo.findById(prod.primaryId);
            return {
              ...prod,
              product,
            };
          }),
      );
      return res.json(populatedProducts);
    }

    res.json(products);
  } catch (err) {
    console.error(
        `Error fetching products using material ${req.params.id}:`,
        err,
    );
    next(err);
  }
});

// Break down an item into derived items
router.post("/:id/breakdown", async (req, res, next) => {
  try {
    const {id} = req.params;
    const {derivedItems} = req.body;

    if (!derivedItems || !Array.isArray(derivedItems) ||
        derivedItems.length === 0) {
      return res.status(400).json({
        message: "Must provide an array of derived items",
      });
    }

    // Get source item
    const itemRepository = getItemRepository();
    const sourceItem = await itemRepository.findById(id);
    if (!sourceItem) {
      return res.status(404).json({message: "Source item not found"});
    }

    // Process with transaction
    const result = await withTransaction(async (transaction) => {
      const createdItems = [];

      // Create each derived item and relationship
      for (const derivedItemData of derivedItems) {
        // Create the derived item without legacy derivedFrom property
        const newItem = await itemRepository.create({
          ...derivedItemData,
          // Remove legacy derivedFrom field
        }, transaction);

        // Create the relationship using the new relationship system
        await addDerivedItemRelationship(
            newItem._id,
            id,
            derivedItemData.measurements || {quantity: 1},
            transaction,
        );

        createdItems.push({
          id: newItem._id,
          name: newItem.name,
          hasDerivedFrom: true,
          derivedFromItem: sourceItem,
        });
      }

      return createdItems;
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
    const derivedRelationships = await getDerivedItems(sourceItemId);

    // Get the actual item details for each derived item
    const itemRepo = getProviderFactory().createItemRepository();
    const derivedItems = await Promise.all(
        derivedRelationships.map(async (rel) => {
          const item = await itemRepo.findById(rel.primaryId);
          return {
            ...item,
            relationship: rel,
          };
        }),
    );

    res.json(derivedItems);
  } catch (err) {
    next(err);
  }
});

// Get the parent item for a derived item
router.get("/:id/parent", async (req, res, next) => {
  try {
    const derivedItemId = req.params.id;
    const sourceRelationship = await getSourceForDerivedItem(derivedItemId);

    if (!sourceRelationship) {
      return res.status(404).json({message: "Parent item not found"});
    }

    // Get the actual source item
    const itemRepo = getProviderFactory().createItemRepository();
    const sourceItem = await itemRepo.findById(sourceRelationship.secondaryId);

    if (!sourceItem) {
      return res.status(404).json({message: "Parent item not found"});
    }

    res.json({
      ...sourceItem,
      relationship: sourceRelationship,
    });
  } catch (err) {
    next(err);
  }
});

// Convert legacy item relationships to the new format
router.post("/convert-relationships", async (req, res, next) => {
  try {
    const result = await convertAllRelationships();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Convert a specific item's legacy relationships
router.post("/:id/convert-relationships", async (req, res, next) => {
  try {
    const result = await convertItemRelationships(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Rebuild inventory quantities, costs and prices
router.post("/utility/rebuild-inventory", async (req, res, next) => {
  try {
    // Set a longer timeout for the response
    req.setTimeout(120000); // 2 minutes
    res.setTimeout(120000); // 2 minutes

    // Get providers directly from the factory with the correct method names
    const providerFactory = getProviderFactory();
    const providers = {
      itemRepository: providerFactory.createItemRepository(),
      purchaseRepository: providerFactory.createPurchaseRepository(),
      salesRepository: providerFactory.createSalesRepository(),
    };

    // Process items in smaller batches to avoid timeouts
    const results = await rebuildInventory(providers);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Rebuild inventory for a specific item
router.post("/utility/rebuild-inventory/:id", async (req, res, next) => {
  try {
    // Get providers directly from the factory with the correct method names
    const providerFactory = getProviderFactory();
    const providers = {
      itemRepository: providerFactory.createItemRepository(),
      purchaseRepository: providerFactory.createPurchaseRepository(),
      salesRepository: providerFactory.createSalesRepository(),
    };

    const result = await rebuildItemInventory(req.params.id, providers);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
