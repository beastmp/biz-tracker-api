/**
 * Generic Relationship model definition
 *
 * This model defines the structure and constraints for relationships between
 * different entity types in the application. It also contains constants for
 * valid entity types and relationship types.
 *
 * @module RelationshipModel
 * @requires ./baseModel
 */
const {FieldTypes, defineField, defineModel} = require("./baseModel");

/**
 * Entity types used in relationships
 * @enum {string}
 */
const ENTITY_TYPES = {
  ITEM: "Item",
  PURCHASE: "Purchase",
  SALE: "Sale",
  ASSET: "Asset",
  USER: "User",
  BUSINESS: "Business",
  VENDOR: "Vendor",
  CUSTOMER: "Customer",
};

/**
 * Relationship types between entities
 * @enum {string}
 */
const RELATIONSHIP_TYPES = {
  PURCHASE_ITEM: "purchase_item",
  PURCHASE_ASSET: "purchase_asset",
  SALE_ITEM: "sale_item",
  PRODUCT_MATERIAL: "product_material",
  DERIVED: "derived",
  PARENT_CHILD: "parent_child",
  ASSOCIATED: "associated",
};

// Define the Relationship model
const RelationshipModel = defineModel("Relationship", {
  primaryId: defineField({
    type: FieldTypes.REFERENCE,
    required: true,
  }),
  primaryType: defineField({
    type: FieldTypes.STRING,
    required: true,
    validate: {
      validator: (value) => Object.values(ENTITY_TYPES).includes(value),
      message: "Invalid primary entity type",
    },
  }),
  secondaryId: defineField({
    type: FieldTypes.REFERENCE,
    required: true,
  }),
  secondaryType: defineField({
    type: FieldTypes.STRING,
    required: true,
    validate: {
      validator: (value) => Object.values(ENTITY_TYPES).includes(value),
      message: "Invalid secondary entity type",
    },
  }),
  relationshipType: defineField({
    type: FieldTypes.STRING,
    required: true,
    validate: {
      validator: (value) => Object.values(RELATIONSHIP_TYPES).includes(value),
      message: "Invalid relationship type",
    },
  }),
  measurements: defineField({
    type: FieldTypes.OBJECT,
    default: {
      quantity: 0,
      weight: 0,
      weightUnit: "lb",
      length: 0,
      lengthUnit: "in",
      area: 0,
      areaUnit: "sqft",
      volume: 0,
      volumeUnit: "l",
    },
  }),
  purchaseItemAttributes: defineField({
    type: FieldTypes.OBJECT,
    default: {
      costPerUnit: 0,
      totalCost: 0,
      purchasedBy: "quantity",
      purchaseType: "inventory", // New field for purchase type
    },
  }),
  purchaseAssetAttributes: defineField({
    type: FieldTypes.OBJECT,
  }),
  saleItemAttributes: defineField({
    type: FieldTypes.OBJECT,
  }),
  metadata: defineField({
    type: FieldTypes.OBJECT,
  }),
  isLegacy: defineField({
    type: FieldTypes.BOOLEAN,
    default: false,
  }),
  notes: defineField({
    type: FieldTypes.STRING,
  }),
  createdAt: defineField({
    type: FieldTypes.DATE,
    default: () => new Date(),
  }),
  updatedAt: defineField({
    type: FieldTypes.DATE,
    default: () => new Date(),
  }),
}, {
  indexes: [
    {fields: ["primaryId", "primaryType"]},
    {fields: ["secondaryId", "secondaryType"]},
    {
      fields: [
        "primaryId",
        "primaryType",
        "secondaryId",
        "secondaryType",
        "relationshipType",
      ],
      unique: true,
    },
  ],
});

// Add the constants to the model for export
RelationshipModel.ENTITY_TYPES = ENTITY_TYPES;
RelationshipModel.RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;

/**
 * Validates if the combination of entity types is valid for the given relationship type
 *
 * @param {string} relationshipType - Type of relationship
 * @param {string} primaryType - Type of primary entity
 * @param {string} secondaryType - Type of secondary entity
 * @return {boolean} Whether the combination is valid
 */
RelationshipModel.isValidEntityCombination = (relationshipType, primaryType, secondaryType) => {
  switch (relationshipType) {
    case RELATIONSHIP_TYPES.PURCHASE_ITEM:
      return (
        primaryType === ENTITY_TYPES.PURCHASE &&
        secondaryType === ENTITY_TYPES.ITEM
      );

    case RELATIONSHIP_TYPES.PURCHASE_ASSET:
      return (
        primaryType === ENTITY_TYPES.PURCHASE &&
        secondaryType === ENTITY_TYPES.ASSET
      );

    case RELATIONSHIP_TYPES.SALE_ITEM:
      return (
        primaryType === ENTITY_TYPES.SALE &&
        secondaryType === ENTITY_TYPES.ITEM
      );

    case RELATIONSHIP_TYPES.PRODUCT_MATERIAL:
    case RELATIONSHIP_TYPES.DERIVED:
      return (
        primaryType === ENTITY_TYPES.ITEM &&
        secondaryType === ENTITY_TYPES.ITEM
      );

    case RELATIONSHIP_TYPES.PARENT_CHILD:
    case RELATIONSHIP_TYPES.ASSOCIATED:
      // These are more flexible and can connect various entity types
      return Object.values(ENTITY_TYPES).includes(primaryType) &&
             Object.values(ENTITY_TYPES).includes(secondaryType);

    default:
      return false;
  }
};

module.exports = RelationshipModel;
