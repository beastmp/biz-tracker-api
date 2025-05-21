/**
 * Relationship Service
 * Contains business logic for managing relationships between entities
 */

const RelationshipModel = require("../models/relationshipModel");
const providerFactory = require("../providers/providerFactory");

/**
 * Creates a normalized measurement configuration object for relationships
 *
 * @typedef {Object} MeasurementConfig
 * @property {string} measurement - Type of measurement (quantity, weight, etc.)
 * @property {number} amount - Measurement amount
 * @property {string} unit - Unit of measurement
 *
 * @param {Object} data - Source measurement data
 * @param {string} [defaultMeasurement="quantity"] - Default measurement type if not specified
 * @return {MeasurementConfig} Configured measurement object
 */
const createRelationshipMeasurement = (data = {}, defaultMeasurement = "quantity") => ({
  measurement: data.measurement || defaultMeasurement,
  amount: typeof data.amount === "number" ? data.amount : (data.quantity || 0),
  unit: data.unit || "",
  // Additional measurement properties
  weightUnit: data.weightUnit || "lb",
  lengthUnit: data.lengthUnit || "in",
  areaUnit: data.areaUnit || "sqft",
  volumeUnit: data.volumeUnit || "l",
});

/**
 * Relationship Service class
 * Handles business logic for entity relationships
 */
class RelationshipService {
  /**
   * Create a new RelationshipService instance
   */
  constructor() {
    this.relationshipRepository = providerFactory.createRelationshipRepository();
    this.itemRepository = providerFactory.createItemRepository();
  }

  /**
   * Get all relationships
   * 
   * @param {Object} query - Query parameters for filtering relationships
   * @param {Object} options - Options for pagination, sorting, etc.
   * @returns {Promise<Array>} Array of relationships
   */
  async getAllRelationships(query = {}, options = {}) {
    return this.relationshipRepository.findAll(query, options);
  }

  /**
   * Get a single relationship by ID
   * 
   * @param {string} id - Relationship ID
   * @returns {Promise<Object>} Relationship data
   */
  async getRelationshipById(id) {
    return this.relationshipRepository.findById(id);
  }

  /**
   * Find relationships by primary entity
   * 
   * @param {string} primaryId - Primary entity ID
   * @param {string} primaryType - Primary entity type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of relationships
   */
  async findByPrimaryEntity(primaryId, primaryType, options = {}) {
    return this.relationshipRepository.findAll({
      primaryId,
      primaryType
    }, options);
  }

  /**
   * Find relationships by secondary entity
   * 
   * @param {string} secondaryId - Secondary entity ID
   * @param {string} secondaryType - Secondary entity type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of relationships
   */
  async findBySecondaryEntity(secondaryId, secondaryType, options = {}) {
    return this.relationshipRepository.findAll({
      secondaryId,
      secondaryType
    }, options);
  }

  /**
   * Find a specific relationship between two entities
   * 
   * @param {string} primaryId - Primary entity ID
   * @param {string} primaryType - Primary entity type
   * @param {string} secondaryId - Secondary entity ID
   * @param {string} secondaryType - Secondary entity type
   * @param {string} relationshipType - Type of relationship
   * @returns {Promise<Object>} Relationship data or null
   */
  async findSpecificRelationship(
    primaryId,
    primaryType,
    secondaryId,
    secondaryType,
    relationshipType
  ) {
    const relationships = await this.relationshipRepository.findAll({
      primaryId,
      primaryType,
      secondaryId,
      secondaryType,
      relationshipType
    }, { limit: 1 });
    
    return relationships[0] || null;
  }

  /**
   * Create a new relationship
   * 
   * @param {Object} relationshipData - Relationship data
   * @returns {Promise<Object>} Created relationship
   */
  async createRelationship(relationshipData) {
    // Validate the entity type combination
    if (!RelationshipModel.isValidEntityCombination(
      relationshipData.relationshipType,
      relationshipData.primaryType,
      relationshipData.secondaryType
    )) {
      throw new Error(
        `Invalid entity combination: ${relationshipData.primaryType} and ${relationshipData.secondaryType} ` +
        `for relationship type: ${relationshipData.relationshipType}`
      );
    }
    
    // Check for duplicates
    const existing = await this.findSpecificRelationship(
      relationshipData.primaryId,
      relationshipData.primaryType,
      relationshipData.secondaryId,
      relationshipData.secondaryType,
      relationshipData.relationshipType
    );
    
    if (existing) {
      throw new Error("Relationship already exists");
    }
    
    // Set timestamps
    const now = new Date();
    relationshipData.createdAt = now;
    relationshipData.updatedAt = now;
    
    return this.relationshipRepository.create(relationshipData);
  }

  /**
   * Update an existing relationship
   * 
   * @param {string} id - Relationship ID
   * @param {Object} relationshipData - Updated relationship data
   * @returns {Promise<Object>} Updated relationship
   */
  async updateRelationship(id, relationshipData) {
    const existingRelationship = await this.relationshipRepository.findById(id);
    if (!existingRelationship) {
      throw new Error(`Relationship with ID ${id} not found`);
    }
    
    // Don't allow changing the core relationship definition
    const updatedData = { ...relationshipData };
    delete updatedData.primaryId;
    delete updatedData.primaryType;
    delete updatedData.secondaryId;
    delete updatedData.secondaryType;
    delete updatedData.relationshipType;
    
    // Update timestamp
    updatedData.updatedAt = new Date();
    
    return this.relationshipRepository.update(id, updatedData);
  }

  /**
   * Delete a relationship
   * 
   * @param {string} id - Relationship ID
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteRelationship(id) {
    return this.relationshipRepository.delete(id);
  }

  /**
   * Delete all relationships for an entity
   * 
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @returns {Promise<number>} Number of relationships deleted
   */
  async deleteAllEntityRelationships(entityId, entityType) {
    // Find relationships where entity is either primary or secondary
    const primaryRelationships = await this.findByPrimaryEntity(entityId, entityType);
    const secondaryRelationships = await this.findBySecondaryEntity(entityId, entityType);
    
    // Combine and get unique IDs
    const allRelationships = [...primaryRelationships, ...secondaryRelationships];
    const relationshipIds = [...new Set(allRelationships.map(r => r.id))];
    
    // Delete each relationship
    let deletedCount = 0;
    for (const id of relationshipIds) {
      const deleted = await this.relationshipRepository.delete(id);
      if (deleted) deletedCount++;
    }
    
    return deletedCount;
  }

  /**
   * Create a purchase-item relationship with normalized measurements
   * 
   * @param {string} purchaseId - Purchase ID
   * @param {string} itemId - Item ID
   * @param {Object} attributes - Purchase item attributes
   * @returns {Promise<Object>} Created relationship
   */
  async createPurchaseItemRelationship(purchaseId, itemId, attributes = {}) {
    // Get the item to access its default measurement type
    const item = await this.itemRepository.findById(itemId);
    
    // Use the item's tracking measurement type as default if available
    const defaultMeasurement = item?.tracking?.measurement || "quantity";
    
    // Create normalized measurements
    const measurements = createRelationshipMeasurement(
      attributes.measurements || attributes,
      defaultMeasurement
    );
    
    return this.createRelationship({
      primaryId: purchaseId,
      primaryType: RelationshipModel.ENTITY_TYPES.PURCHASE,
      secondaryId: itemId,
      secondaryType: RelationshipModel.ENTITY_TYPES.ITEM,
      relationshipType: RelationshipModel.RELATIONSHIP_TYPES.PURCHASE_ITEM,
      purchaseItemAttributes: {
        costPerUnit: attributes.costPerUnit || 0,
        totalCost: attributes.totalCost || 0,
        purchasedBy: attributes.purchasedBy || defaultMeasurement,
        purchaseType: attributes.purchaseType || "inventory"
      },
      measurements: measurements
    });
  }

  /**
   * Create a purchase-asset relationship
   * 
   * @param {string} purchaseId - Purchase ID
   * @param {string} assetId - Asset ID
   * @param {Object} attributes - Purchase asset attributes
   * @returns {Promise<Object>} Created relationship
   */
  async createPurchaseAssetRelationship(purchaseId, assetId, attributes = {}) {
    return this.createRelationship({
      primaryId: purchaseId,
      primaryType: RelationshipModel.ENTITY_TYPES.PURCHASE,
      secondaryId: assetId,
      secondaryType: RelationshipModel.ENTITY_TYPES.ASSET,
      relationshipType: RelationshipModel.RELATIONSHIP_TYPES.PURCHASE_ASSET,
      purchaseAssetAttributes: attributes
    });
  }

  /**
   * Create a sale-item relationship with normalized measurements
   * 
   * @param {string} saleId - Sale ID
   * @param {string} itemId - Item ID
   * @param {Object} attributes - Sale item attributes
   * @returns {Promise<Object>} Created relationship
   */
  async createSaleItemRelationship(saleId, itemId, attributes = {}) {
    // Get the item to access its default measurement type
    const item = await this.itemRepository.findById(itemId);
    
    // Use the item's price measurement type as default if available
    const defaultMeasurement = item?.price?.measurement || "quantity";
    
    // Create normalized measurements
    const measurements = createRelationshipMeasurement(
      attributes.measurements || attributes,
      defaultMeasurement
    );
    
    return this.createRelationship({
      primaryId: saleId,
      primaryType: RelationshipModel.ENTITY_TYPES.SALE,
      secondaryId: itemId,
      secondaryType: RelationshipModel.ENTITY_TYPES.ITEM,
      relationshipType: RelationshipModel.RELATIONSHIP_TYPES.SALE_ITEM,
      saleItemAttributes: attributes.saleItemAttributes || {
        unitPrice: attributes.unitPrice || 0,
        totalPrice: attributes.totalPrice || 0,
        discountAmount: attributes.discountAmount || 0,
        saleDate: attributes.saleDate
      },
      measurements: measurements
    });
  }

  /**
   * Create a product-material relationship with normalized measurements
   * 
   * @param {string} productId - Product item ID 
   * @param {string} materialId - Material item ID
   * @param {Object} attributes - Relationship attributes
   * @returns {Promise<Object>} Created relationship
   */
  async createProductMaterialRelationship(productId, materialId, attributes = {}) {
    // Get the material item to access its default measurement type
    const material = await this.itemRepository.findById(materialId);
    
    // Use the material's tracking measurement type as default if available
    const defaultMeasurement = material?.tracking?.measurement || "quantity";
    
    // Create normalized measurements
    const measurements = createRelationshipMeasurement(
      attributes.measurements || attributes,
      defaultMeasurement
    );
    
    return this.createRelationship({
      primaryId: productId,
      primaryType: RelationshipModel.ENTITY_TYPES.ITEM,
      secondaryId: materialId,
      secondaryType: RelationshipModel.ENTITY_TYPES.ITEM,
      relationshipType: RelationshipModel.RELATIONSHIP_TYPES.PRODUCT_MATERIAL,
      measurements: measurements,
      metadata: attributes.metadata || {}
    });
  }

  /**
   * Get all valid entity types
   * 
   * @returns {Object} Entity types
   */
  getEntityTypes() {
    return RelationshipModel.ENTITY_TYPES;
  }

  /**
   * Get all valid relationship types
   * 
   * @returns {Object} Relationship types
   */
  getRelationshipTypes() {
    return RelationshipModel.RELATIONSHIP_TYPES;
  }
}

module.exports = new RelationshipService();