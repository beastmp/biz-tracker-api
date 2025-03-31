const ItemRepository = require("../interfaces/itemRepository");

/**
 * Base implementation of ItemRepository with common functionality
 * @abstract
 */
class BaseItemRepository extends ItemRepository {
  /**
   * Get all unique categories
   * @return {Promise<Array<string>>} List of categories
   */
  async getCategories() {
    try {
      const items = await this.findAll({});
      // Extract unique categories, filter out undefined/null/empty values
      const categories = new Set(
          items.map((item) => item.category).filter(Boolean),
      );
      return [...categories].sort();
    } catch (error) {
      console.error("Error getting categories:", error);
      throw error;
    }
  }

  /**
   * Get all unique tags
   * @return {Promise<Array<string>>} List of tags
   */
  async getTags() {
    try {
      const items = await this.findAll({});
      // Extract all tags from all items, flatten array, and get unique values
      const tagsSet = new Set(
          items.flatMap((item) => item.tags || []).filter(Boolean),
      );
      return [...tagsSet].sort();
    } catch (error) {
      console.error("Error getting tags:", error);
      throw error;
    }
  }

  /**
   * Default SKU generator - should be overridden by specific implementations
   * that might have different SKU formats
   * @return {Promise<string>} Next available SKU
   */
  async getNextSku() {
    try {
      const items = await this.findAll({});
      const skus = items
          .map((item) => item.sku || "")
          .filter((sku) => /^\d+$/.test(sku)) // Only get numeric SKUs
          .map((sku) => parseInt(sku, 10));

      const maxSku = skus.length > 0 ? Math.max(...skus) : 0;
      // Pad with zeros to create a 10-digit SKU
      return (maxSku + 1).toString().padStart(10, "0");
    } catch (error) {
      console.error("Error generating next SKU:", error);
      throw error;
    }
  }

  /**
   * Default implementation for getting item relationships
   * Specific providers might override this with more optimized versions
   * @param {string} id Item ID
   * @return {Promise<Object>} Relationship data
   */
  async getItemRelationships(id) {
    try {
      const item = await this.findById(id);
      if (!item) {
        throw new Error(`Item with id ${id} not found`);
      }

      // Simplified implementation,
      // actual implementations may need more complex queries
      const allItems = await this.findAll({});

      // Find products that use this item as a component
      const productsUsingItem = allItems.filter((product) =>
        product.components && product.components.some((comp) =>
          comp.item && (comp.item.toString() === id.toString()),
        ),
      );

      return {
        isUsedInProducts: productsUsingItem.length > 0,
        products: productsUsingItem.map((p) => ({
          _id: p._id,
          name: p.name,
          quantity: (p.components && p.components.find((c) =>
            c.item && c.item.toString() === id.toString()) || {}).quantity || 0,
        })),
      };
    } catch (error) {
      console.error(`Error getting relationships for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find items using a complex query - base implementation
   * Should be overridden by specific providers for optimal performance
   * @param {Object} query Complex query object with filters and operators
   * @return {Promise<Array>} List of matching items
   */
  async findByQuery(query = {}) {
    // Basic implementation that filters in memory
    // Providers should override this with native query capabilities
    const allItems = await this.findAll({});

    // This is a simplified implementation
    // In a real implementation, we would handle complex queries
    const filteredItems = allItems.filter((item) => {
      // Simple equality check on first-level properties
      for (const [key, value] of Object.entries(query)) {
        if (typeof value === "object" && value !== null) {
          // Skip complex operators in this basic implementation
          continue;
        }
        if (item[key] !== value) {
          return false;
        }
      }
      return true;
    });

    return filteredItems;
  }

  /**
   * Update item relationships - base implementation
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

    // Implementation will depend on relationship type
    if (relationType === "usedIn") {
      item.usedInProducts = relatedItems;
      return await this.update(itemId, {usedInProducts: relatedItems});
    }

    throw new Error(`Relationship type ${relationType} not supported`);
  }
}

module.exports = BaseItemRepository;
