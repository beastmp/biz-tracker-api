/**
 * Relationship Repository
 * Implements provider-agnostic business logic and operations for the Relationship entity
 */

const RelationshipInterface = require("../interfaces/relationshipInterface");
const {Relationship} = require("../../models/relationshipModel");
const {createError} = require("../../validation/errors");

/**
 * Base repository for Relationship operations with provider-agnostic implementation
 */
class RelationshipRepository extends RelationshipInterface {
  /**
   * Creates a new RelationshipRepository instance
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    super();
    this.config = config;
    this.transactionProvider = null;
    this.entityRepositories = {};
  }

  /**
   * Set the transaction provider dependency
   * @param {Object} provider - Transaction provider instance
   */
  setTransactionProvider(provider) {
    this.transactionProvider = provider;
  }

  /**
   * Register an entity repository
   * @param {string} entityType - Type of entity (e.g., "Asset", "Item")
   * @param {Object} repository - Repository instance for the entity
   */
  registerEntityRepository(entityType, repository) {
    this.entityRepositories[entityType] = repository;
  }

  /**
   * Validate that entity exists before creating a relationship
   * @param {Object} entityData - Entity data with id and type
   * @return {Promise<boolean>} - True if entity exists
   * @private
   */
  async _validateEntityExists(entityData) {
    const {id, type} = entityData;

    if (!id || !type) {
      throw createError(400, "Entity ID and type are required");
    }

    // Get the appropriate repository for this entity type
    const repository = this.entityRepositories[type];
    if (!repository) {
      throw createError(400, `Unknown entity type: ${type}`);
    }

    // Check if the entity exists
    const entity = await repository.findById(id);
    if (!entity) {
      throw createError(404, `${type} with ID ${id} not found`);
    }

    return true;
  }

  /**
   * Get all relationships for an entity (as either primary or secondary)
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @return {Promise<Object>} - Object with relationships grouped by role
   */
  async findAllForEntity(entityId, entityType) {
    const primary = await this.findByPrimary(entityId, entityType);
    const secondary = await this.findBySecondary(entityId, entityType);

    return {
      primary,
      secondary,
      all: [...primary, ...secondary],
    };
  }

  /**
   * Convert legacy relationships for an entity to the new model
   * @param {string} entityId - Entity ID
   * @param {string} entityType - Entity type
   * @return {Promise<Object>} - Conversion results
   */
  async convertLegacyRelationships(entityId, entityType) {
    // This is a placeholder implementation - actual implementation would depend
    // on how legacy relationships are stored in your system
    try {
      // Get the entity repository
      const repository = this.entityRepositories[entityType];
      if (!repository) {
        throw createError(400, `Unknown entity type: ${entityType}`);
      }

      // Get the entity
      const entity = await repository.findById(entityId);
      if (!entity) {
        throw createError(404, `${entityType} with ID ${entityId} not found`);
      }

      // Check for legacy relationship data on the entity
      const legacyData = entity.relationships || entity.relatedItems || [];
      const results = {
        entityId,
        entityType,
        converted: 0,
        skipped: 0,
        errors: [],
      };

      // Start a transaction if available
      const transaction = this.transactionProvider ?
        await this.transactionProvider.startTransaction() : null;

      try {
        // Process each legacy relationship
        for (const legacy of legacyData) {
          try {
            if (!legacy.id || !legacy.type) {
              results.skipped++;
              results.errors.push(`Missing ID or type in legacy relationship`);
              continue;
            }

            // Create a new relationship
            const relationship = new Relationship({
              primaryEntity: {
                id: entityId,
                type: entityType,
              },
              secondaryEntity: {
                id: legacy.id,
                type: legacy.type,
              },
              relationshipType: legacy.relationshipType || "unspecified",
              metadata: legacy.metadata || {},
            });

            await this.create(relationship, transaction);
            results.converted++;
          } catch (err) {
            results.errors.push(err.message);
            results.skipped++;
          }
        }

        // Commit the transaction if available
        if (transaction) {
          await this.transactionProvider.commitTransaction(transaction);
        }

        return results;
      } catch (error) {
        // Rollback the transaction if available
        if (transaction) {
          await this.transactionProvider.rollbackTransaction(transaction);
        }
        throw error;
      }
    } catch (error) {
      console.error(`Error converting legacy relationships for ${entityType} ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Get statistics about relationships
   * @return {Promise<Object>} - Relationship statistics
   */
  async getStatistics() {
    try {
      const allRelationships = await this.findAll({});

      // Count by relationship type
      const typeStats = {};
      allRelationships.forEach((relationship) => {
        const type = relationship.relationshipType || "unspecified";
        typeStats[type] = (typeStats[type] || 0) + 1;
      });

      // Count by entity type (primary)
      const primaryEntityStats = {};
      allRelationships.forEach((relationship) => {
        const type = relationship.primaryEntity.type;
        primaryEntityStats[type] = (primaryEntityStats[type] || 0) + 1;
      });

      // Count by entity type (secondary)
      const secondaryEntityStats = {};
      allRelationships.forEach((relationship) => {
        const type = relationship.secondaryEntity.type;
        secondaryEntityStats[type] = (secondaryEntityStats[type] || 0) + 1;
      });

      return {
        totalRelationships: allRelationships.length,
        byRelationshipType: typeStats,
        byPrimaryEntityType: primaryEntityStats,
        bySecondaryEntityType: secondaryEntityStats,
      };
    } catch (error) {
      console.error("Error getting relationship statistics:", error);
      throw error;
    }
  }
}

module.exports = RelationshipRepository;
