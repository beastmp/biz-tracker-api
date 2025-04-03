const {BaseItemRepository} = require("../../base");
const Item = require("../../../models/item");
const mongoose = require("mongoose"); // Add this import statement
const {extractComponentIds, updateItemRelationships} =
  require("../../../utils/itemRelationships");

/**
 * MongoDB implementation of ItemRepository
 */
class MongoItemRepository extends BaseItemRepository {
  /**
   * Find all items matching filter criteria
   * @param {Object} filter Query filters
   * @return {Promise<Array>} List of items
   */
  async findAll(filter = {}) {
    return await Item.find(filter).sort({name: 1});
  }

  /**
   * Find item by ID
   * @param {string} id Item ID
   * @return {Promise<Object|null>} Item object or null if not found
   */
  async findById(id) {
    // Check if we have a valid ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    try {
      // Populate the derivation relationships when fetching an item
      return await Item.findById(id)
          .populate("derivedFrom.item")
          .populate("derivedItems.item")
          .populate("components.item")
          .populate("usedInProducts");
    } catch (error) {
      console.error(`Error finding item by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Create a new item
   * @param {Object} itemData Item data
   * @return {Promise<Object>} Created item
   */
  async create(itemData) {
    const item = new Item(itemData);
    await item.save();

    // If this is a product with components, handle relationships
    if (item.type === "product" && item.components &&
        item.components.length > 0) {
      const componentIds = extractComponentIds(item.components);
      await updateItemRelationships([], componentIds, item._id);
    }

    return item;
  }

  /**
   * Update an existing item
   * @param {string} id Item ID
   * @param {Object} itemData Updated item data
   * @param {Object} [transaction] Optional transaction
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async update(id, itemData, transaction = null) {
    const options = transaction ? {session: transaction} : {};

    const item = await Item.findById(id);
    if (!item) return null;

    // Update all provided fields
    Object.keys(itemData).forEach((key) => {
      item[key] = itemData[key];
    });

    await item.save(options);

    // Handle component relationships if this is a product with components
    if (item.type === "product" && item.components) {
      // Get old component IDs before update
      const oldComponentIds = item._previousComponents ?
        extractComponentIds(item._previousComponents) : [];

      // Get new component IDs after update
      const newComponentIds = extractComponentIds(item.components);

      // Update relationships
      await updateItemRelationships(oldComponentIds, newComponentIds, item._id);
    }

    return item;
  }

  /**
   * Update item image
   * @param {string} id Item ID
   * @param {string} imageUrl URL to the uploaded image
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async updateImage(id, imageUrl) {
    const item = await Item.findById(id);
    if (!item) return null;

    item.imageUrl = imageUrl;
    await item.save();

    return item;
  }

  /**
   * Delete an item
   * @param {string} id Item ID
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    const result = await Item.findByIdAndDelete(id);
    if (!result) return false;

    // If this item was used in any products, update those relationships
    if (result.usedInProducts && result.usedInProducts.length > 0) {
      // For each product using this item, update its relationships
      for (const productId of result.usedInProducts) {
        await updateItemRelationships([id], [], productId);
      }
    }

    return true;
  }

  /**
   * Rebuild relationships between items
   * @return {Promise<Object>} Result summary
   */
  async rebuildRelationships() {
    const {rebuildAllRelationships} =
      require("../../../utils/itemRelationships");
    const allItems = await this.findAll({});
    return await rebuildAllRelationships(allItems);
  }

  /**
   * Get the next available SKU
   * @return {Promise<string>} Next available SKU
   */
  async getNextSku() {
    // Find items with numeric SKUs and get the maximum
    const items =
      await Item.find({sku: {$regex: /^\d+$/}}).sort({sku: -1}).limit(1);

    let maxSku = 0;
    if (items.length > 0) {
      maxSku = parseInt(items[0].sku, 10);
    }

    // Increment by 1 and pad with zeros
    return (maxSku + 1).toString().padStart(10, "0");
  }

  /**
   * Get relationships for a specific item
   * @param {string} id Item ID
   * @return {Promise<Object>} Relationship data
   */
  async getItemRelationships(id) {
    const item = await this.findById(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }

    // Find products that use this item
    let productsUsingItem = [];
    if (item.usedInProducts && item.usedInProducts.length > 0) {
      productsUsingItem = await Item.find({_id:
        {$in: item.usedInProducts}}).select("_id name components");
    }

    // Format the relationship data
    const relationships = {
      isUsedInProducts: productsUsingItem.length > 0,
      products: productsUsingItem.map((p) => ({
        _id: p._id,
        name: p.name,
        quantity: (p.components && p.components.find((c) =>
          c.item.toString() === id.toString()) || {}).quantity || 0,
      })),
    };

    return relationships;
  }

  /**
   * Find items using a complex query
   * @param {Object} query Complex query object with filters and operators
   * @return {Promise<Array>} List of matching items
   */
  async findByQuery(query = {}) {
    return await Item.find(query).sort({name: 1});
  }

  /**
   * Update item relationships
   * @param {string} itemId Item ID
   * @param {Array<string>} relatedItems IDs of related items
   * @param {string} relationType Type of relationship
   * @return {Promise<Object>} Updated item
   */
  async updateRelationships(itemId, relatedItems, relationType) {
    const item = await this.findById(itemId);
    if (!item) {
      throw new Error(`Item with id ${itemId} not found`);
    }

    if (relationType === "usedIn") {
      await Item.findByIdAndUpdate(itemId, {usedInProducts: relatedItems});
      return await this.findById(itemId);
    }

    throw new Error(`Relationship type ${relationType} not supported`);
  }

  /**
   * Create derived items from a source/generic item
   * @param {string} sourceItemId ID of the source item
   * @param {Array} derivedItems Array of derived item data
   * @param {Object} [transaction] Optional transaction
   * @return {Promise<Object>} Object containing source item and derived items
   */
  async createDerivedItems(sourceItemId, derivedItems, transaction = null) {
    const options = transaction ? {session: transaction} : {};

    // Get the source item
    const sourceItem = await Item.findById(sourceItemId);
    if (!sourceItem) {
      throw new Error(`Source item with ID ${sourceItemId} not found`);
    }

    // Debug: Log source item ID
    console.log(`Creating derived items from source item: ${sourceItemId}`, {
      sourceItemName: sourceItem.name,
      sourceItemSku: sourceItem.sku,
    });

    // Validate there's enough inventory to allocate based on tracking type
    const totalAllocated = {
      quantity: 0,
      weight: 0,
      length: 0,
      area: 0,
      volume: 0,
    };

    // Calculate total allocated for each measurement type
    derivedItems.forEach((item) => {
      totalAllocated.quantity += item.quantity || 0;
      totalAllocated.weight += item.weight || 0;
      totalAllocated.length += item.length || 0;
      totalAllocated.area += item.area || 0;
      totalAllocated.volume += item.volume || 0;
    });

    // Check if we have enough inventory based on tracking type
    const trackingType = sourceItem.trackingType;
    if (trackingType === "quantity" &&
        totalAllocated.quantity > sourceItem.quantity) {
      throw new Error(`Not enough quantity in source item.
        Available: ${sourceItem.quantity},
        Requested: ${totalAllocated.quantity}`);
    } else if (trackingType === "weight" &&
        totalAllocated.weight > sourceItem.weight) {
      throw new Error(`Not enough weight in source item.
        Available: ${sourceItem.weight},
        Requested: ${totalAllocated.weight}`);
    } else if (trackingType === "length" &&
       totalAllocated.length > sourceItem.length) {
      throw new Error(`Not enough length in source item.
        Available: ${sourceItem.length},
        Requested: ${totalAllocated.length}`);
    } else if (trackingType === "area" &&
        totalAllocated.area > sourceItem.area) {
      throw new Error(`Not enough area in source item.
        Available: ${sourceItem.area},
        Requested: ${totalAllocated.area}`);
    } else if (trackingType === "volume" &&
        totalAllocated.volume > sourceItem.volume) {
      throw new Error(`Not enough volume in source item.
        Available: ${sourceItem.volume},
        Requested: ${totalAllocated.volume}`);
    }

    // Process each derived item
    // either creating a new one or updating an existing one
    const resultItems = [];
    const derivedItemsRefs = [];

    for (const itemData of derivedItems) {
      // Check if this is an allocation to an existing item
      // or creation of a new item
      if (itemData.itemId) {
        // ALLOCATION TO EXISTING ITEM
        const existingItem = await Item.findById(itemData.itemId);
        if (!existingItem) {
          throw new Error(`Existing item with ID ${itemData.itemId}
            not found for allocation`);
        }

        console.log(`Allocating to existing item: ${existingItem._id}`, {
          existingItemName: existingItem.name,
          existingItemSku: existingItem.sku,
        });

        // Create a derivation reference
        // ensure sourceItemId is set as ObjectId
        const sourceItemObjectId =
          mongoose.Types.ObjectId.isValid(sourceItemId) ?
            new mongoose.Types.ObjectId(sourceItemId) :
            sourceItemId;

        const derivationRef = {
          item: sourceItemObjectId, // Ensure proper ObjectId reference
          quantity: itemData.quantity || 0,
          weight: itemData.weight || 0,
          weightUnit: sourceItem.weightUnit,
          length: itemData.length || 0,
          lengthUnit: sourceItem.lengthUnit,
          area: itemData.area || 0,
          areaUnit: sourceItem.areaUnit,
          volume: itemData.volume || 0,
          volumeUnit: sourceItem.volumeUnit,
        };

        // Add the source item to the derivedFrom array if not already there
        if (!existingItem.derivedFrom) {
          existingItem.derivedFrom = derivationRef;
          console.log(`Setting derivedFrom for item ${existingItem._id}
            to source ${sourceItemId}`);
        } else {
          // Fix: Check if item exists before trying to access toString()
          const sourceItemIdStr = sourceItemId.toString();
          const existingSourceItemId = existingItem.derivedFrom.item ?
              (typeof existingItem.derivedFrom.item === "object" ?
                 (existingItem.derivedFrom.item._id ?
                    existingItem.derivedFrom.item._id.toString() : null) :
                 existingItem.derivedFrom.item.toString()) :
              null;

          // If already derived from other items, ensure it's not duplicated
          if (existingSourceItemId &&
              existingSourceItemId !== sourceItemIdStr) {
            throw new Error(`Item is already derived
              from a different source item: ${existingSourceItemId}`);
          }

          // Fix: Completely replace the derivedFrom object
          // instead of trying to update fields
          existingItem.derivedFrom = {
            ...derivationRef,
            quantity: (existingItem.derivedFrom.quantity || 0) +
              (itemData.quantity || 0),
            weight: (existingItem.derivedFrom.weight || 0) +
              (itemData.weight || 0),
            length: (existingItem.derivedFrom.length || 0) +
              (itemData.length || 0),
            area: (existingItem.derivedFrom.area || 0) +
              (itemData.area || 0),
            volume: (existingItem.derivedFrom.volume || 0) +
              (itemData.volume || 0),
          };
        }

        // Update the measurement values
        // of the existing item based on allocation
        switch (trackingType) {
          case "quantity":
            existingItem.quantity += itemData.quantity || 0;
            break;
          case "weight":
            existingItem.weight += itemData.weight || 0;
            break;
          case "length":
            existingItem.length += itemData.length || 0;
            break;
          case "area":
            existingItem.area += itemData.area || 0;
            break;
          case "volume":
            existingItem.volume += itemData.volume || 0;
            break;
        }

        // Update the last updated timestamp
        existingItem.lastUpdated = new Date();

        // Save the updated item
        await existingItem.save(options);
        console.log(`Saved allocation for existing item ${existingItem._id}`, {
          derivedFromItem: existingItem.derivedFrom &&
            existingItem.derivedFrom.item,
          hasDerivation: !!existingItem.derivedFrom,
        });

        resultItems.push(existingItem);

        // Add to the derived items references for the source item
        derivedItemsRefs.push({
          item: existingItem._id,
          quantity: itemData.quantity || 0,
          weight: itemData.weight || 0,
          weightUnit: sourceItem.weightUnit,
          length: itemData.length || 0,
          lengthUnit: sourceItem.lengthUnit,
          area: itemData.area || 0,
          areaUnit: sourceItem.areaUnit,
          volume: itemData.volume || 0,
          volumeUnit: sourceItem.volumeUnit,
        });
      } else {
        // CREATE NEW DERIVED ITEM
        console.log(`Creating new derived item:
            ${itemData.name} (${itemData.sku})`);

        // Ensure sourceItemId is converted to ObjectId for proper reference
        const sourceItemObjectId =
          mongoose.Types.ObjectId.isValid(sourceItemId) ?
            new mongoose.Types.ObjectId(sourceItemId) :
            sourceItemId;

        const derivedItem = new Item({
          name: itemData.name,
          sku: itemData.sku,
          category: itemData.category || sourceItem.category,
          description: itemData.description,
          price: itemData.price !== undefined ?
            itemData.price : sourceItem.price,
          cost: itemData.cost !== undefined ? itemData.cost : sourceItem.cost,
          tags: itemData.tags || sourceItem.tags,
          imageUrl: itemData.imageUrl || sourceItem.imageUrl,

          // Derived item reference - ensure proper ObjectId
          derivedFrom: {
            item: sourceItemObjectId, // Use proper ObjectId for reference
            quantity: itemData.quantity || 0,
            weight: itemData.weight || 0,
            weightUnit: sourceItem.weightUnit,
            length: itemData.length || 0,
            lengthUnit: sourceItem.lengthUnit,
            area: itemData.area || 0,
            areaUnit: sourceItem.areaUnit,
            volume: itemData.volume || 0,
            volumeUnit: sourceItem.volumeUnit,
          },

          // Copy properties from source item if not specified
          trackingType: sourceItem.trackingType,
          itemType: sourceItem.itemType,
          weightUnit: sourceItem.weightUnit,
          lengthUnit: sourceItem.lengthUnit,
          areaUnit: sourceItem.areaUnit,
          volumeUnit: sourceItem.volumeUnit,
          priceType: sourceItem.priceType,
        });

        // Set the measurement values based on the source item's tracking type
        switch (sourceItem.trackingType) {
          case "quantity":
            derivedItem.quantity = itemData.quantity || 0;
            break;
          case "weight":
            derivedItem.quantity = itemData.quantity || 0; // For package count
            derivedItem.weight = itemData.weight || 0;
            break;
          case "length":
            derivedItem.quantity = itemData.quantity || 0; // For package count
            derivedItem.length = itemData.length || 0;
            break;
          case "area":
            derivedItem.quantity = itemData.quantity || 0; // For package count
            derivedItem.area = itemData.area || 0;
            break;
          case "volume":
            derivedItem.quantity = itemData.quantity || 0; // For package count
            derivedItem.volume = itemData.volume || 0;
            break;
        }

        // Log right before saving
        console.log(`About to save new derived item with derivedFrom:`, {
          derivedFromItem: derivedItem.derivedFrom.item,
          derivedFromItemType: typeof derivedItem.derivedFrom.item,
          sourceItemId,
        });

        // Save the new derived item
        await derivedItem.save(options);
        console.log(`Saved new derived item ${derivedItem._id}`, {
          hasDerivation: !!derivedItem.derivedFrom,
          derivedFromItem: derivedItem.derivedFrom ?
            derivedItem.derivedFrom.item : null,
        });

        resultItems.push(derivedItem);

        // Add to the derived items references for the source item
        derivedItemsRefs.push({
          item: derivedItem._id,
          quantity: itemData.quantity || 0,
          weight: itemData.weight || 0,
          weightUnit: sourceItem.weightUnit,
          length: itemData.length || 0,
          lengthUnit: sourceItem.lengthUnit,
          area: itemData.area || 0,
          areaUnit: sourceItem.areaUnit,
          volume: itemData.volume || 0,
          volumeUnit: sourceItem.volumeUnit,
        });
      }
    }

    // Update the source item's inventory based on tracking type
    switch (trackingType) {
      case "quantity":
        sourceItem.quantity -= totalAllocated.quantity;
        break;
      case "weight":
        sourceItem.weight -= totalAllocated.weight;
        break;
      case "length":
        sourceItem.length -= totalAllocated.length;
        break;
      case "area":
        sourceItem.area -= totalAllocated.area;
        break;
      case "volume":
        sourceItem.volume -= totalAllocated.volume;
        break;
    }

    // Update the derived items references and last updated timestamp
    sourceItem.derivedItems =
      (sourceItem.derivedItems || []).concat(derivedItemsRefs);
    sourceItem.lastUpdated = new Date();

    // Log the source item's derived items before saving
    console.log(`Source item ${sourceItem._id}
        has ${sourceItem.derivedItems.length} derived items:`,
    sourceItem.derivedItems.map((d) => ({item: d.item})));

    // Save the updated source item - THIS IS THE KEY LINE THAT WAS MISSING
    await sourceItem.save(options);

    return {
      sourceItem,
      derivedItems: resultItems,
    };
  }

  /**
   * Get derived items for a source item
   * @param {string} sourceItemId ID of the source item
   * @return {Promise<Array>} Array of derived items
   */
  async getDerivedItems(sourceItemId) {
    // Convert string ID to ObjectId if needed
    const objId = mongoose.Types.ObjectId.isValid(sourceItemId) ?
      new mongoose.Types.ObjectId(sourceItemId) :
      sourceItemId;

    const derivedItems = await Item.find({
      "derivedFrom.item": objId,
    })
        .populate("derivedFrom.item")
        .populate("derivedItems.item")
        .populate("components.item")
        .populate("usedInProducts")
        .sort({name: 1});

    console.log(`Found ${derivedItems.length}
      derived items for source ${sourceItemId}`);

    return derivedItems;
  }

  /**
   * Get the parent item for a derived item
   * @param {string} derivedItemId ID of the derived item
   * @return {Promise<Object|null>} Parent item or null
   */
  async getParentItem(derivedItemId) {
    const derivedItem = await Item.findById(derivedItemId);
    if (!derivedItem || !derivedItem.derivedFrom ||
        !derivedItem.derivedFrom.item) {
      return null;
    }

    return await Item.findById(derivedItem.derivedFrom.item);
  }
}

module.exports = MongoItemRepository;
