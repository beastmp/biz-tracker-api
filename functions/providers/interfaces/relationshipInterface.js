// filepath: d:\Development\source\repos\biz-tracker-api\functions\providers\interfaces\relationshipInterface.js
/**
 * Relationship Repository Interface
 * Defines the contract for all relationship repository implementations
 */
class RelationshipRepository {
  /**
   * Find all relationships matching filter criteria
   * @param {Object} filter - Query filters
   * @return {Promise<Array>} - List of relationships
   */
  async findAll(filter = {}) {
    throw new Error("Method 'findAll' must be implemented");
  }

  /**
   * Find relationship by ID
   * @param {string} id - Relationship ID
   * @return {Promise<Object|null>} - Relationship object or null if not found
   */
  async findById(id) {
    throw new Error("Method 'findById' must be implemented");
  }

  /**
   * Create a new relationship
   * @param {Object} relationshipData - Relationship data
   * @param {Object} transaction - Optional transaction
   * @return {Promise<Object>} - Created relationship
   */
  async create(relationshipData, transaction = null) {
    throw new Error("Method 'create' must be implemented");
  }

  /**
   * Update an existing relationship
   * @param {string} id - Relationship ID
   * @param {Object} relationshipData - Updated relationship data
   * @param {Object} transaction - Optional transaction
   * @return {Promise<Object|null>} - Updated relationship or null if not found
   */
  async update(id, relationshipData, transaction = null) {
    throw new Error("Method 'update' must be implemented");
  }

  /**
   * Delete a relationship
   * @param {string} id - Relationship ID
   * @param {Object} transaction - Optional transaction
   * @return {Promise<boolean>} - True if deleted, false if not found
   */
  async delete(id, transaction = null) {
    throw new Error("Method 'delete' must be implemented");
  }

  /**
   * Find relationships where entity is primary
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {string} relationshipType - Optional relationship type to filter by
   * @return {Promise<Array>} - List of relationships
   */
  async findByPrimary(entityId, entityType, relationshipType = null) {
    throw new Error("Method 'findByPrimary' must be implemented");
  }

  /**
   * Find relationships where entity is secondary
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {string} relationshipType - Optional relationship type to filter by
   * @return {Promise<Array>} - List of relationships
   */
  async findBySecondary(entityId, entityType, relationshipType = null) {
    throw new Error("Method 'findBySecondary' must be implemented");
  }

  /**
   * Find all relationships for an entity (as either primary or secondary)
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @return {Promise<Object>} - Object with relationships grouped by role
   */
  async findAllForEntity(entityId, entityType) {
    throw new Error("Method 'findAllForEntity' must be implemented");
  }

  /**
   * Delete relationships where entity is primary
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {string} relationshipType - Optional relationship type to filter by
   * @param {Object} transaction - Optional transaction
   * @return {Promise<number>} - Number of deleted relationships
   */
  async deleteByPrimary(
      entityId,
      entityType,
      relationshipType = null,
      transaction = null,
  ) {
    throw new Error("Method 'deleteByPrimary' must be implemented");
  }

  /**
   * Delete relationships where entity is secondary
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @param {string} relationshipType - Optional relationship type to filter by
   * @param {Object} transaction - Optional transaction
   * @return {Promise<number>} - Number of deleted relationships
   */
  async deleteBySecondary(
      entityId,
      entityType,
      relationshipType = null,
      transaction = null,
  ) {
    throw new Error("Method 'deleteBySecondary' must be implemented");
  }

  /**
   * Find direct relationships between two entities
   * @param {string} entity1Id - First entity ID
   * @param {string} entity1Type - First entity type
   * @param {string} entity2Id - Second entity ID
   * @param {string} entity2Type - Second entity type
   * @return {Promise<Array>} - List of relationships
   */
  async findDirectRelationships(
      entity1Id,
      entity1Type,
      entity2Id,
      entity2Type,
  ) {
    throw new Error("Method 'findDirectRelationships' must be implemented");
  }

  /**
   * Convert legacy relationships for an entity to the new model
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @return {Promise<Object>} - Conversion results
   */
  async convertLegacyRelationships(entityId, entityType) {
    throw new Error("Method 'convertLegacyRelationships' must be implemented");
  }

  /**
   * Get statistics about relationships
   * @return {Promise<Object>} - Relationship statistics
   */
  async getStatistics() {
    throw new Error("Method 'getStatistics' must be implemented");
  }
}

module.exports = RelationshipRepository;
