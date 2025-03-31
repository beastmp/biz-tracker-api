const {BaseItemRepository} = require("../../base");
const Item = require("../../../models/item");
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
    return await Item.findById(id);
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
}

module.exports = MongoItemRepository;
