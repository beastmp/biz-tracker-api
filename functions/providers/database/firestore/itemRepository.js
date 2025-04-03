const {BaseItemRepository} = require("../../base");
const {v4: uuidv4} = require("uuid");

/**
 * Firestore implementation of ItemRepository
 */
class FirestoreItemRepository extends BaseItemRepository {
  /**
   * Create a new FirestoreItemRepository
   * @param {Object} db - Firestore database instance
   * @param {string} collectionPrefix - Prefix for collection names
   */
  constructor(db, collectionPrefix = "") {
    super();
    this.db = db;
    this.collection = `${collectionPrefix}items`;
  }

  /**
   * Find all items matching filter criteria
   * @param {Object} filter Query filters
   * @return {Promise<Array>} List of items
   */
  async findAll(filter = {}) {
    try {
      let query = this.db.collection(this.collection);

      // Apply filters
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.where(key, "==", value);
        }
      });

      // Execute query
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Firestore findAll error:", error);
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
      const doc = await this.db.collection(this.collection).doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error(`Firestore findById error for ID ${id}:`, error);
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
      const id = itemData.id || uuidv4();

      const item = {
        ...itemData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Write to Firestore
      await this.db.collection(this.collection).doc(id).set(item);

      // Handle components relationships
      if (item.itemType === "product" &&
          item.components && item.components.length > 0) {
        const componentIds = this._extractComponentIds(item.components);
        await this._updateItemRelationships([], componentIds, item.id);
      }

      return item;
    } catch (error) {
      console.error("Firestore create item error:", error);
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
      // Get the existing item
      let existingItem;

      if (transaction && transaction.firestoreTransaction) {
        const docRef = this.db.collection(this.collection).doc(id);
        const doc = await transaction.firestoreTransaction.get(docRef);
        existingItem = doc.exists ? {id: doc.id, ...doc.data()} : null;
      } else {
        existingItem = await this.findById(id);
      }

      if (!existingItem) {
        return null;
      }

      // Merge with updated data
      const updatedItem = {
        ...existingItem,
        ...itemData,
        updatedAt: new Date().toISOString(),
      };

      // Perform the update
      if (transaction && transaction.firestoreTransaction) {
        const docRef = this.db.collection(this.collection).doc(id);
        transaction.firestoreTransaction.update(docRef, updatedItem);
      } else {
        await this.db.collection(this.collection).doc(id).update(updatedItem);
      }

      // Handle component relationships if this is a product with components
      if (!transaction && updatedItem.itemType ===
          "product" && updatedItem.components) {
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
      console.error(`Firestore update error for item ${id}:`, error);
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

      // Delete the item
      await this.db.collection(this.collection).doc(id).delete();

      // If this item was used in any products, update those relationships
      if (item.usedInProducts && item.usedInProducts.length > 0) {
        // For each product using this item, update its relationships
        for (const productId of item.usedInProducts) {
          await this._updateItemRelationships([id], [], productId);
        }
      }

      return true;
    } catch (error) {
      console.error(`Firestore delete error for item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get the next available SKU
   * @return {Promise<string>} Next available SKU
   */
  async getNextSku() {
    try {
      // Query items with numeric SKUs
      const snapshot = await this.db.collection(this.collection)
          .where("sku", ">=", "0")
          .where("sku", "<=", "9999999999")
          .get();

      const items = snapshot.docs.map((doc) => doc.data());

      // Extract numeric SKUs and find the maximum
      const numericSkus = items
          .map((item) => item.sku)
          .filter((sku) => /^\d+$/.test(sku))
          .map((sku) => parseInt(sku, 10));

      const maxSku = numericSkus.length > 0 ? Math.max(...numericSkus) : 0;

      // Increment and pad with zeros
      return (maxSku + 1).toString().padStart(10, "0");
    } catch (error) {
      console.error("Firestore getNextSku error:", error);
      throw error;
    }
  }

  /**
   * Get all unique categories
   * @return {Promise<Array<string>>} List of categories
   */
  async getCategories() {
    try {
      const snapshot = await this.db.collection(this.collection).get();
      const items = snapshot.docs.map((doc) => doc.data());

      // Extract unique categories
      const categories = [...new Set(items
          .map((item) => item.category)
          .filter(Boolean))];

      return categories.sort();
    } catch (error) {
      console.error("Firestore getCategories error:", error);
      throw error;
    }
  }

  /**
   * Get all unique tags
   * @return {Promise<Array<string>>} List of tags
   */
  async getTags() {
    try {
      const snapshot = await this.db.collection(this.collection).get();
      const items = snapshot.docs.map((doc) => doc.data());

      // Extract all tags and flatten the array
      const allTags = items.flatMap((item) => item.tags || []);

      // Get unique tags
      const uniqueTags = [...new Set(allTags.filter(Boolean))];

      return uniqueTags.sort();
    } catch (error) {
      console.error("Firestore getTags error:", error);
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
      const productsSnapshot = await this.db.collection(this.collection)
          .where("itemType", "in", ["product", "both"])
          .get();

      const products = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

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
      console.error("Firestore rebuildRelationships error:", error);
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
        const productsSnapshot = await this.db.collection(this.collection)
            .where(this.db.FieldPath.documentId(), "in", item.usedInProducts)
            .get();

        productsUsingItem = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      // Format the relationship data
      const relationships = {
        isUsedInProducts: productsUsingItem.length > 0,
        products: productsUsingItem.map((product) => {
          // Find component quantity in the product
          const component = product.components ?
            product.components.find((c) => {
              const componentId = typeof c.item ===
                "object" ? c.item.id : c.item;
              return componentId === id;
            }) : null;

          return {
            id: product.id,
            name: product.name,
            quantity: (component && component.quantity) || 0,
          };
        }),
      };

      return relationships;
    } catch (error) {
      console.error(`Firestore getItemRelationships error
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
    try {
      let firestoreQuery = this.db.collection(this.collection);

      // Process each filter condition
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            // Handle different operators (simple version)
            if (typeof value === "object" && value !== null) {
              if (value.$eq) {
                firestoreQuery =
                firestoreQuery.where(key, "==", value.$eq);
              }
              if (value.$gt) {
                firestoreQuery =
                firestoreQuery.where(key, ">", value.$gt);
              }
              if (value.$gte) {
                firestoreQuery =
                firestoreQuery.where(key, ">=", value.$gte);
              }
              if (value.$lt) {
                firestoreQuery =
                firestoreQuery.where(key, "<", value.$lt);
              }
              if (value.$lte) {
                firestoreQuery =
                firestoreQuery.where(key, "<=", value.$lte);
              }
              if (value.$in && Array.isArray(value.$in)) {
                // Firestore 'in' queries can only be used
                // on document IDs or with array-contains-any
                if (key === "id") {
                  firestoreQuery =
                    firestoreQuery.where(this.db.FieldPath.documentId(),
                        "in", value.$in);
                }
              }
              if (value.$exists !== undefined) {
                // Not directly supported in Firestore,
                // this is a simplified approach
                if (value.$exists) {
                  firestoreQuery = firestoreQuery.where(key, "!=", null);
                }
              }
            } else {
              // Simple equality
              firestoreQuery = firestoreQuery.where(key, "==", value);
            }
          }
        });
      }

      const snapshot = await firestoreQuery.get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Firestore findByQuery error:", error);
      throw error;
    }
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

module.exports = FirestoreItemRepository;
