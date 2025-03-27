const Item = require("../models/item");

/**
 * Extracts component IDs consistently from an array of components
 * @param {Array} components - Array of component objects
 * @return {Array} Array of component IDs as strings
 */
const extractComponentIds = (components) => {
  if (!components || !Array.isArray(components)) return [];

  return components
      .map((comp) => typeof comp.item === "object" ?
      comp.item._id.toString() : comp.item.toString())
      .filter((id) => id); // Filter out any empty IDs
};

/**
 * Updates relationships between products and materials
 * @param {Array} oldIds - Array of old component IDs
 * @param {Array} newIds - Array of new component IDs
 * @param {string} productId - ID of the product being updated
 * @return {Promise<void>}
 */
const updateItemRelationships = async (oldIds, newIds, productId) => {
  // Materials to remove this product from
  const removedComponentIds = oldIds.filter((id) => !newIds.includes(id));

  // Materials to add this product to
  const addedComponentIds = newIds.filter((id) => !oldIds.includes(id));

  // Update usedInProducts for added materials
  if (addedComponentIds.length > 0) {
    await Item.updateMany(
        {_id: {$in: addedComponentIds}},
        {$addToSet: {usedInProducts: productId}},
    );
    console.log(`Added product ${productId}
        to ${addedComponentIds.length} materials`);
  }

  // Update usedInProducts for removed materials
  if (removedComponentIds.length > 0) {
    await Item.updateMany(
        {_id: {$in: removedComponentIds}},
        {$pull: {usedInProducts: productId}},
    );
    console.log(`Removed product ${productId}
        from ${removedComponentIds.length} materials`);
  }
};

/**
 * Rebuilds all relationships between products and materials in the database
 * @return {Promise<{productsProcessed: number, materialsUpdated: number}>}
 */
const rebuildAllRelationships = async () => {
  console.log("Rebuilding all product-material relationships");

  // Find all products (items that are products or both)
  const products = await Item.find({
    itemType: {$in: ["product", "both"]},
    components: {$exists: true, $ne: []},
  });

  console.log(`Found ${products.length} products with components`);

  let updatedMaterialsCount = 0;

  // Process each product and update its materials' usedInProducts arrays
  for (const product of products) {
    if (!product.components || product.components.length === 0) continue;

    // Extract component IDs
    const componentIds = extractComponentIds(product.components);

    console.log(`Processing product ${product.name}
        with ${componentIds.length} components`);

    if (componentIds.length > 0) {
      // Update all referenced materials to include
      // this product in their usedInProducts array
      const result = await Item.updateMany(
          {_id: {$in: componentIds}},
          {$addToSet: {usedInProducts: product._id}},
      );

      updatedMaterialsCount += result.modifiedCount;
      console.log(`Updated ${result.modifiedCount}
        materials for product ${product.name}`);
    }
  }

  return {
    productsProcessed: products.length,
    materialsUpdated: updatedMaterialsCount,
  };
};

module.exports = {
  extractComponentIds,
  updateItemRelationships,
  rebuildAllRelationships,
};
