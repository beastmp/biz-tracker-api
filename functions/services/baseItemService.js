/**
 * Base Item Service
 * Contains business logic for base item management operations
 */

const { BaseItem } = require("../models/baseItemModel");
const providerFactory = require("../providers/providerFactory");

/**
 * Base Item Service class
 * Handles business logic for all item types
 */
class BaseItemService {
  /**
   * Create a new BaseItemService instance
   */
  constructor() {
    this.baseItemRepository = providerFactory.createBaseItemRepository();
  }

  /**
   * Create a new base item
   * 
   * @param {Object} data - Item data
   * @return {Promise<Object>} New base item instance
   */
  async createItem(data = {}) {
    const item = new BaseItem(data);
    item.validate();
    
    return this.baseItemRepository.create(item.toObject());
  }

  /**
   * Create a material item with appropriate defaults
   * 
   * @param {Object} data - Item data
   * @return {Promise<Object>} New material item instance
   */
  async createMaterialItem(data = {}) {
    const materialData = {
      ...data,
      type: "material",
      // Materials typically tracked by weight, but respect provided config
      tracking: {
        ...(data.tracking || {}),
        measurement: data.tracking?.measurement || "weight",
        amount: data.tracking?.amount || 0
      }
    };
    
    return this.createItem(materialData);
  }

  /**
   * Create a product item with appropriate defaults
   * 
   * @param {Object} data - Item data
   * @return {Promise<Object>} New product item instance
   */
  async createProductItem(data = {}) {
    // Products may need SKU generation if not provided
    if (!data.sku) {
      data.sku = await this.getNextSku();
    }
    
    const productData = {
      ...data,
      type: "product",
      // Products typically tracked by quantity, but respect provided config
      tracking: {
        ...(data.tracking || {}),
        measurement: data.tracking?.measurement || "quantity",
        amount: data.tracking?.amount || 0
      }
    };
    
    return this.createItem(productData);
  }

  /**
   * Create a dual-purpose item (both material and product)
   * 
   * @param {Object} data - Item data
   * @return {Promise<Object>} New dual-purpose item instance
   */
  async createDualPurposeItem(data = {}) {
    // Generate SKU if not provided
    if (!data.sku) {
      data.sku = await this.getNextSku();
    }
    
    const dualPurposeData = {
      ...data,
      type: "both"
    };
    
    return this.createItem(dualPurposeData);
  }

  /**
   * Get all items
   * 
   * @param {Object} query - Query parameters for filtering items
   * @param {Object} options - Options for pagination, sorting, etc.
   * @returns {Promise<Array>} Array of items
   */
  async getAllItems(query = {}, options = {}) {
    return this.baseItemRepository.findAll(query, options);
  }

  /**
   * Get a single item by ID
   * 
   * @param {string} id - Item ID
   * @returns {Promise<Object>} Item data
   */
  async getItemById(id) {
    return this.baseItemRepository.findById(id);
  }

  /**
   * Get a single item by SKU
   * 
   * @param {string} sku - Item SKU
   * @returns {Promise<Object>} Item data
   */
  async getItemBySku(sku) {
    const items = await this.baseItemRepository.findAll({ sku }, { limit: 1 });
    return items[0] || null;
  }

  /**
   * Update an existing item
   * 
   * @param {string} id - Item ID
   * @param {Object} itemData - Updated item data
   * @returns {Promise<Object>} Updated item
   */
  async updateItem(id, itemData) {
    const existingItem = await this.baseItemRepository.findById(id);
    if (!existingItem) {
      throw new Error(`Item with ID ${id} not found`);
    }

    // Create item with existing data merged with updates
    const item = new BaseItem({
      ...existingItem,
      ...itemData
    });
    item.validate();
    
    return this.baseItemRepository.update(id, item.toObject());
  }

  /**
   * Delete an item
   * 
   * @param {string} id - Item ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteItem(id) {
    return this.baseItemRepository.delete(id);
  }

  /**
   * Update inventory quantity
   * 
   * @param {string} id - Item ID
   * @param {number} quantity - Quantity to add (positive) or remove (negative)
   * @param {number} unitCost - Unit cost (for additions only)
   * @param {string} source - Source of the transaction
   * @returns {Promise<Object>} Updated item
   */
  async updateInventory(id, quantity, unitCost = 0, source = "manual") {
    const itemData = await this.baseItemRepository.findById(id);
    if (!itemData) {
      throw new Error(`Item with ID ${id} not found`);
    }

    const item = new BaseItem(itemData);
    
    // Decide whether to add or remove inventory
    let updateResult;
    if (quantity > 0) {
      updateResult = item.addInventory(quantity, unitCost, source);
    } else if (quantity < 0) {
      updateResult = item.removeInventory(Math.abs(quantity), source);
    } else {
      return itemData; // No change for zero quantity
    }
    
    // Update the item in the database
    return this.baseItemRepository.update(id, item.toObject());
  }

  /**
   * Update inventory settings
   * 
   * @param {string} id - Item ID
   * @param {Object} settings - Inventory settings
   * @returns {Promise<Object>} Updated item
   */
  async updateInventorySettings(id, settings) {
    const itemData = await this.baseItemRepository.findById(id);
    if (!itemData) {
      throw new Error(`Item with ID ${id} not found`);
    }

    const item = new BaseItem(itemData);
    item.updateInventorySettings(settings);
    
    return this.baseItemRepository.update(id, item.toObject());
  }

  /**
   * Calculate the total inventory value
   * 
   * @param {Object} query - Query to filter items
   * @returns {Promise<number>} Total inventory value
   */
  async calculateInventoryValue(query = {}) {
    const items = await this.baseItemRepository.findAll(query);
    
    return items.reduce((total, itemData) => {
      const item = new BaseItem(itemData);
      return total + item.calculateInventoryValue();
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
    return this.baseItemRepository.search(searchText, options);
  }

  /**
   * Get inventory levels by category
   * 
   * @returns {Promise<Object>} Inventory levels grouped by category
   */
  async getInventoryByCategory() {
    const items = await this.baseItemRepository.findAll();
    
    return items.reduce((result, itemData) => {
      const item = new BaseItem(itemData);
      const category = item.category;
      
      if (!result[category]) {
        result[category] = {
          count: 0,
          value: 0
        };
      }
      
      result[category].count++;
      result[category].value += item.calculateInventoryValue();
      
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
    const items = await this.baseItemRepository.findAll();
    
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
    const items = await this.baseItemRepository.findAll();
    
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
    const items = await this.baseItemRepository.findAll();
    
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
  
  /**
   * Get items that need reordering
   * 
   * @returns {Promise<Array>} Items that need reordering
   */
  async getItemsNeedingReorder() {
    const items = await this.baseItemRepository.findAll();
    
    return items
      .map(itemData => new BaseItem(itemData))
      .filter(item => item.needsReorder())
      .map(item => item.toObject());
  }
  
  /**
   * Get items below minimum level
   * 
   * @returns {Promise<Array>} Items below minimum level
   */
  async getItemsBelowMinimum() {
    const items = await this.baseItemRepository.findAll();
    
    return items
      .map(itemData => new BaseItem(itemData))
      .filter(item => item.isBelowMinimum())
      .map(item => item.toObject());
  }
}

module.exports = new BaseItemService();