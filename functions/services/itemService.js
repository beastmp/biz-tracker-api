/**
 * Item Service
 * Contains business logic for inventory item management operations
 */

const { Item } = require("../models/itemModel");
const providerFactory = require("../providers/providerFactory");

/**
 * Item Service class
 * Handles business logic for inventory items
 */
class ItemService {
  /**
   * Create a new ItemService instance
   */
  constructor() {
    this.itemRepository = providerFactory.createItemRepository();
  }

  /**
   * Get all inventory items
   * 
   * @param {Object} query - Query parameters for filtering items
   * @param {Object} options - Options for pagination, sorting, etc.
   * @returns {Promise<Array>} Array of items
   */
  async getAllItems(query = {}, options = {}) {
    return this.itemRepository.findAll(query, options);
  }

  /**
   * Get a single inventory item by ID
   * 
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Item data
   */
  async getItemById(id) {
    return this.itemRepository.findById(id);
  }

  /**
   * Get a single inventory item by SKU
   * 
   * @param {string} sku - Item SKU
   * @returns {Promise<Object>} Item data
   */
  async getItemBySku(sku) {
    const items = await this.itemRepository.findAll({ sku }, { limit: 1 });
    return items[0] || null;
  }

  /**
   * Create a new inventory item
   * 
   * @param {Object} itemData - Item data
   * @returns {Promise<Object>} Created item
   */
  async createItem(itemData) {
    const item = new Item(itemData);
    item.validate();
    
    return this.itemRepository.create(item.toObject());
  }

  /**
   * Update an existing inventory item
   * 
   * @param {string} id - Item ID
   * @param {Object} itemData - Updated item data
   * @returns {Promise<Object>} Updated item
   */
  async updateItem(id, itemData) {
    const existingItem = await this.itemRepository.findById(id);
    if (!existingItem) {
      throw new Error(`Item with ID ${id} not found`);
    }

    // Create item with existing data merged with updates
    const item = new Item({
      ...existingItem,
      ...itemData
    });
    item.validate();
    
    return this.itemRepository.update(id, item.toObject());
  }

  /**
   * Delete an inventory item
   * 
   * @param {string} id - Item ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteItem(id) {
    return this.itemRepository.delete(id);
  }

  /**
   * Update inventory quantity
   * 
   * @param {string} id - Item ID
   * @param {number} adjustmentValue - Amount to adjust (positive or negative)
   * @param {string} trackingType - Type of inventory adjustment (quantity, weight, etc.)
   * @returns {Promise<Object>} Updated item
   */
  async updateInventory(id, adjustmentValue, trackingType = null) {
    const itemData = await this.itemRepository.findById(id);
    if (!itemData) {
      throw new Error(`Item with ID ${id} not found`);
    }

    const item = new Item(itemData);
    const itemTrackingType = trackingType || item.trackingType;
    
    // Update based on tracking type
    switch (itemTrackingType) {
      case "quantity":
        item.quantity += adjustmentValue;
        break;
      case "weight":
        item.weight += adjustmentValue;
        break;
      case "length":
        item.length += adjustmentValue;
        break;
      case "area":
        item.area += adjustmentValue;
        break;
      case "volume":
        item.volume += adjustmentValue;
        break;
      default:
        throw new Error(`Invalid tracking type: ${itemTrackingType}`);
    }
    
    return this.itemRepository.update(id, item.toObject());
  }

  /**
   * Calculate the total inventory value
   * 
   * @param {Object} query - Query to filter items
   * @returns {Promise<number>} Total inventory value
   */
  async calculateInventoryValue(query = {}) {
    const items = await this.itemRepository.findAll(query);
    
    return items.reduce((total, itemData) => {
      const item = new Item(itemData);
      return total + item.getInventoryValueCost();
    }, 0);
  }

  /**
   * Search for items by text
   * 
   * @param {string} searchText - Text to search for
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching items
   */
  async searchItems(searchText, options = {}) {
    return this.itemRepository.search(searchText, options);
  }

  /**
   * Get inventory levels by category
   * 
   * @returns {Promise<Object>} Inventory levels grouped by category
   */
  async getInventoryByCategory() {
    const items = await this.itemRepository.findAll();
    
    return items.reduce((result, itemData) => {
      const item = new Item(itemData);
      const category = item.category;
      
      if (!result[category]) {
        result[category] = {
          count: 0,
          value: 0
        };
      }
      
      result[category].count++;
      result[category].value += item.getInventoryValueCost();
      
      return result;
    }, {});
  }

  /**
   * Get the next available SKU number
   * Follows a 10-digit format (e.g., 0000000001, 0000000002, etc.)
   * 
   * @returns {Promise<string>} Next available SKU
   */
  async getNextSku() {
    // Get all items and extract SKUs matching our pattern
    const items = await this.itemRepository.findAll();
    
    // Filter for items with a valid numeric SKU matching our pattern
    const numericSkus = items
      .map(item => item.sku)
      .filter(sku => /^\d{10}$/.test(sku))
      .map(sku => parseInt(sku, 10))
      .filter(num => !isNaN(num));
    
    // Default to first SKU if none exist matching our pattern
    if (numericSkus.length === 0) {
      return "0000000001";
    }
    
    // Find the highest existing SKU and increment by 1
    const highestSku = Math.max(...numericSkus);
    const nextSkuNumber = highestSku + 1;
    
    // Pad to 10 digits
    return nextSkuNumber.toString().padStart(10, "0");
  }
  
  /**
   * Get all unique categories from items
   * 
   * @returns {Promise<string[]>} Array of unique categories
   */
  async getCategories() {
    const items = await this.itemRepository.findAll();
    
    // Extract and deduplicate categories
    const categories = new Set();
    
    items.forEach(item => {
      if (item.category && typeof item.category === "string" && item.category.trim() !== "") {
        categories.add(item.category.trim());
      }
    });
    
    return Array.from(categories).sort();
  }
  
  /**
   * Get all unique tags from items
   * 
   * @returns {Promise<string[]>} Array of unique tags
   */
  async getTags() {
    const items = await this.itemRepository.findAll();
    
    // Extract and flatten all tags
    const tags = new Set();
    
    items.forEach(item => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          if (typeof tag === "string" && tag.trim() !== "") {
            tags.add(tag.trim());
          }
        });
      }
    });
    
    return Array.from(tags).sort();
  }
}

module.exports = new ItemService();
