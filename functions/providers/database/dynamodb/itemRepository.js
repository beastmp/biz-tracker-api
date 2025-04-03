const {BaseItemRepository} = require("../../base");
const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  // UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const {v4: uuidv4} = require("uuid");

/**
 * DynamoDB implementation of ItemRepository
 */
class DynamoItemRepository extends BaseItemRepository {
  /**
   * Create a new DynamoItemRepository
   * @param {Object} documentClient - DynamoDB Document Client
   * @param {string} tablePrefix - Prefix for table names
   */
  constructor(documentClient, tablePrefix) {
    super();
    this.documentClient = documentClient;
    this.tableName = `${tablePrefix}items`;
  }

  /**
   * Find all items matching filter criteria
   * @param {Object} filter Query filters
   * @return {Promise<Array>} List of items
   */
  async findAll(filter = {}) {
    try {
      // Convert filter to DynamoDB expression
      const {expressionAttributes, filterExpression} =
        this._buildFilterExpression(filter);

      // Use query if we have a category filter (uses GSI)
      if (filter.category) {
        const params = {
          TableName: this.tableName,
          IndexName: "CategoryIndex",
          KeyConditionExpression: "category = :category",
          ExpressionAttributeValues: {
            ":category": filter.category,
          },
        };

        const result = await this.documentClient.send(new QueryCommand(params));
        return result.Items || [];
      }

      // Otherwise use scan with filter expression
      const params = {
        TableName: this.tableName,
      };

      if (Object.keys(expressionAttributes).length > 0) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeValues = expressionAttributes;
      }

      const result = await this.documentClient.send(new ScanCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error("DynamoDB findAll error:", error);
      throw error;
    }
  }

  /**
   * Find item by ID
   * @param {string} id Item ID
   * @return {Promise<Object|null>} Item object or null if not found
   */
  async findById(id) {
    try {
      const params = {
        TableName: this.tableName,
        Key: {id},
      };

      const result = await this.documentClient.send(new GetCommand(params));
      return result.Item || null;
    } catch (error) {
      console.error(`DynamoDB findById error for ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new item
   * @param {Object} itemData Item data
   * @return {Promise<Object>} Created item
   */
  async create(itemData) {
    try {
      // Generate a new ID if one is not provided
      const item = {
        ...itemData,
        id: itemData.id || uuidv4(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const params = {
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(id)",
      };

      await this.documentClient.send(new PutCommand(params));

      // Handle components relationships
      if (item.itemType === "product" &&
          item.components && item.components.length > 0) {
        const componentIds = this._extractComponentIds(item.components);
        await this._updateItemRelationships([], componentIds, item.id);
      }

      return item;
    } catch (error) {
      console.error("DynamoDB create item error:", error);
      throw error;
    }
  }

  /**
   * Update an existing item
   * @param {string} id Item ID
   * @param {Object} itemData Updated item data
   * @param {Object} [transaction] Optional transaction
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async update(id, itemData, transaction = null) {
    try {
      // Get the existing item first
      const existingItem = await this.findById(id);
      if (!existingItem) {
        return null;
      }

      // Merge the existing item with the update data
      const updatedItem = {
        ...existingItem,
        ...itemData,
        updatedAt: new Date().toISOString(),
      };

      if (transaction) {
        // Add to transaction
        transaction.addWriteOperation(transaction,
            "items", "Update", updatedItem);
      } else {
        // Direct update
        const params = {
          TableName: this.tableName,
          Item: updatedItem,
          ConditionExpression: "attribute_exists(id)",
        };

        await this.documentClient.send(new PutCommand(params));
      }

      // Handle component relationships if this is a product with components
      if (updatedItem.itemType === "product" && updatedItem.components) {
        // Get old component IDs before update
        const oldComponentIds = existingItem.components ?
          this._extractComponentIds(existingItem.components) : [];

        // Get new component IDs after update
        const newComponentIds =
          this._extractComponentIds(updatedItem.components);

        // Update relationships
        await this._updateItemRelationships(oldComponentIds,
            newComponentIds, updatedItem.id);
      }

      return updatedItem;
    } catch (error) {
      console.error(`DynamoDB update error for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update item image
   * @param {string} id Item ID
   * @param {string} imageUrl URL to the uploaded image
   * @return {Promise<Object|null>} Updated item or null if not found
   */
  async updateImage(id, imageUrl) {
    return this.update(id, {imageUrl});
  }

  /**
   * Delete an item
   * @param {string} id Item ID
   * @return {Promise<boolean>} True if deleted, false if not found
   */
  async delete(id) {
    try {
      // Get the item first to check if it exists and for relationship cleanup
      const item = await this.findById(id);
      if (!item) {
        return false;
      }

      const params = {
        TableName: this.tableName,
        Key: {id},
        ConditionExpression: "attribute_exists(id)",
      };

      await this.documentClient.send(new DeleteCommand(params));

      // If this item was used in any products, update those relationships
      if (item.usedInProducts && item.usedInProducts.length > 0) {
        // For each product using this item, update its relationships
        for (const productId of item.usedInProducts) {
          await this._updateItemRelationships([id], [], productId);
        }
      }

      return true;
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        return false;
      }
      console.error(`DynamoDB delete error for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get the next available SKU
   * @return {Promise<string>} Next available SKU
   */
  async getNextSku() {
    try {
      // Get all items with numeric SKUs
      const params = {
        TableName: this.tableName,
        FilterExpression: "attribute_exists(sku)",
      };

      const result = await this.documentClient.send(new ScanCommand(params));
      const items = result.Items || [];

      // Extract numeric SKUs and find the maximum
      const numericSkus = items
          .map((item) => item.sku)
          .filter((sku) => /^\d+$/.test(sku))
          .map((sku) => parseInt(sku, 10));

      const maxSku = numericSkus.length > 0 ? Math.max(...numericSkus) : 0;

      // Increment and pad with zeros
      return (maxSku + 1).toString().padStart(10, "0");
    } catch (error) {
      console.error("DynamoDB getNextSku error:", error);
      throw error;
    }
  }

  /**
   * Get all unique categories
   * @return {Promise<Array<string>>} List of categories
   */
  async getCategories() {
    try {
      const params = {
        TableName: this.tableName,
      };

      const result = await this.documentClient.send(new ScanCommand(params));
      const items = result.Items || [];

      // Extract unique categories
      const categories = [...new Set(items
          .map((item) => item.category)
          .filter(Boolean))];

      return categories.sort();
    } catch (error) {
      console.error("DynamoDB getCategories error:", error);
      throw error;
    }
  }

  /**
   * Get all unique tags
   * @return {Promise<Array<string>>} List of tags
   */
  async getTags() {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: "attribute_exists(tags)",
      };

      const result = await this.documentClient.send(new ScanCommand(params));
      const items = result.Items || [];

      // Extract all tags and flatten the array
      const allTags = items.flatMap((item) => item.tags || []);

      // Get unique tags
      const uniqueTags = [...new Set(allTags.filter(Boolean))];

      return uniqueTags.sort();
    } catch (error) {
      console.error("DynamoDB getTags error:", error);
      throw error;
    }
  }

  /**
   * Rebuild relationships between items
   * @return {Promise<Object>} Result summary
   */
  async rebuildRelationships() {
    try {
      // Get all products (items that are products or both)
      const productsParams = {
        TableName: this.tableName,
        FilterExpression: "itemType = :product OR itemType = :both",
        ExpressionAttributeValues: {
          ":product": "product",
          ":both": "both",
        },
      };

      const productsResult =
        await this.documentClient.send(new ScanCommand(productsParams));
      const products = productsResult.Items || [];

      console.log(`Found ${products.length} products with components`);

      let updatedMaterialsCount = 0;

      // Process each product and update its materials' usedInProducts arrays
      for (const product of products) {
        if (!product.components || product.components.length === 0) continue;

        // Extract component IDs
        const componentIds = this._extractComponentIds(product.components);

        console.log(`Processing product ${product.name}
          with ${componentIds.length} components`);

        if (componentIds.length > 0) {
          // Update each material
          for (const componentId of componentIds) {
            const material = await this.findById(componentId);
            if (material) {
              const usedInProducts = material.usedInProducts || [];
              if (!usedInProducts.includes(product.id)) {
                usedInProducts.push(product.id);
                await this.update(componentId, {usedInProducts});
                updatedMaterialsCount++;
              }
            }
          }
        }
      }

      return {
        productsProcessed: products.length,
        materialsUpdated: updatedMaterialsCount,
      };
    } catch (error) {
      console.error("DynamoDB rebuildRelationships error:", error);
      throw error;
    }
  }

  /**
   * Get relationships for a specific item
   * @param {string} id Item ID
   * @return {Promise<Object>} Relationship data
   */
  async getItemRelationships(id) {
    try {
      const item = await this.findById(id);
      if (!item) {
        throw new Error(`Item with id ${id} not found`);
      }

      // Find products that use this item
      let productsUsingItem = [];
      if (item.usedInProducts && item.usedInProducts.length > 0) {
        const productsParams = {
          TableName: this.tableName,
          FilterExpression: "id IN (" + item.usedInProducts.map((_, idx) =>
            `:id${idx}`).join(",") + ")",
          ExpressionAttributeValues: item.usedInProducts.reduce((acc,
              productId, idx) => {
            acc[`:id${idx}`] = productId;
            return acc;
          }, {}),
        };

        const productsResult =
          await this.documentClient.send(new ScanCommand(productsParams));
        productsUsingItem = productsResult.Items || [];
      }

      // Format relationship data
      const relationships = {
        isUsedInProducts: productsUsingItem.length > 0,
        products: productsUsingItem.map((product) => {
          // Find component quantity in the product
          const component = product.components &&
            product.components.find((c) => {
              const componentId = typeof c.item ===
              "object" ? c.item.id : c.item;
              return componentId === id;
            });

          return {
            id: product.id,
            name: product.name,
            quantity: (component && component.quantity) || 0,
          };
        }),
      };

      return relationships;
    } catch (error) {
      console.error(`DynamoDB getItemRelationships error
        for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find items using a complex query
   * @param {Object} query Complex query object
   * @return {Promise<Array>} List of matching items
   */
  async findByQuery(query = {}) {
    // This is a simplified implementation
    // In a real-world scenario, you'd build more complex expressions
    return this.findAll(query);
  }

  /**
   * Build a DynamoDB filter expression from a filter object
   * @param {Object} filter Filter object
   * @return {Object} Filter expression and attributes
   * @private
   */
  _buildFilterExpression(filter) {
    const expressionParts = [];
    const expressionAttributes = {};

    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const attrKey = `:${key}`;
        expressionParts.push(`${key} = ${attrKey}`);
        expressionAttributes[attrKey] = value;
      }
    });

    return {
      expressionAttributes,
      filterExpression: expressionParts.length > 0 ?
        expressionParts.join(" AND ") : undefined,
    };
  }

  /**
   * Extract component IDs from components array
   * @param {Array} components Components array
   * @return {Array<string>} Array of component IDs
   * @private
   */
  _extractComponentIds(components) {
    if (!components || !Array.isArray(components)) return [];

    return components
        .map((comp) => typeof comp.item === "object" ? comp.item.id : comp.item)
        .filter((id) => id);
  }

  /**
   * Update item relationships
   * @param {Array<string>} oldIds Old component IDs
   * @param {Array<string>} newIds New component IDs
   * @param {string} productId Product ID
   * @return {Promise<void>}
   * @private
   */
  async _updateItemRelationships(oldIds, newIds, productId) {
    // Materials to remove this product from
    const removedComponentIds = oldIds.filter((id) => !newIds.includes(id));

    // Materials to add this product to
    const addedComponentIds = newIds.filter((id) => !oldIds.includes(id));

    // Update usedInProducts for added materials
    if (addedComponentIds.length > 0) {
      for (const componentId of addedComponentIds) {
        const component = await this.findById(componentId);
        if (component) {
          const usedInProducts = component.usedInProducts || [];
          if (!usedInProducts.includes(productId)) {
            usedInProducts.push(productId);
            await this.update(componentId, {usedInProducts});
          }
        }
      }
    }

    // Update usedInProducts for removed materials
    if (removedComponentIds.length > 0) {
      for (const componentId of removedComponentIds) {
        const component = await this.findById(componentId);
        if (component) {
          const usedInProducts = (component.usedInProducts || [])
              .filter((id) => id !== productId);
          await this.update(componentId, {usedInProducts});
        }
      }
    }
  }
}

module.exports = DynamoItemRepository;
