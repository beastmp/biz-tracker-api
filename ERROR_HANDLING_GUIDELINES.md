## Error Handling and Transaction Management Guidelines

This document outlines the standard practices for error handling and transaction management in the Biz Tracker API application.

### Error Handling

Our application uses a consistent error handling approach through a hierarchy of error classes:

1. **Base Error Class**: `AppError` - All application errors extend this class
2. **Specific Error Types**:
   - `NotFoundError` - When a requested resource isn't found (404)
   - `ValidationError` - For invalid input data (400)
   - `UnauthorizedError` - For authentication issues (401)
   - `ForbiddenError` - For permission issues (403)
   - `ConflictError` - For resource conflicts (409)

#### Guidelines for Error Handling:

1. **Use Specific Error Types**: Always use the most specific error type for the situation.
   ```javascript
   // GOOD
   throw new NotFoundError("Item", id);

   // AVOID
   throw new Error(`Item ${id} not found`);
   ```

2. **Error Message Format**: Use consistent error message formats:
   - For not found: `"{EntityType} with id {id} not found"`
   - For validation: `"Invalid {entityType} data: {details}"`
   - For operations: `"Failed to {operation} {entityType}: {reason}"`

3. **Add Context**: Include relevant context with errors:
   ```javascript
   throw new ValidationError(
     "Invalid relationship data",
     ["primaryId", "secondaryType"] // Fields with issues
   );
   ```

4. **Error Handling Utilities**: Use the `withErrorHandling` and `makeRepositoryErrorHandled` utilities to wrap methods with standardized error handling.

### Transaction Management

All operations that modify multiple records should use transactions to ensure data consistency.

#### Guidelines for Transaction Management:

1. **Use withTransaction Utility**: For operations that need transaction support:
   ```javascript
   const result = await withTransaction(async (transaction) => {
     // Multiple database operations using the transaction
     const item = await itemRepo.create(itemData, transaction);
     await relationshipRepo.create(relationshipData, transaction);
     return item;
   });
   ```

2. **Pass Transactions**: Always accept and pass transaction objects in methods that modify data:
   ```javascript
   async update(id, data, transaction = null) {
     // Method implementation...
   }
   ```

3. **Transactional Methods**: Use the `makeRepositoryTransactional` utility to make repository methods automatically use transactions:
   ```javascript
   const transactionalRepo = makeRepositoryTransactional(repository, [
     'create', 'update', 'delete'
   ]);
   ```

4. **Enhanced Repositories**: For both error handling and transactions, use the `enhanceRepository` utility:
   ```javascript
   const enhancedRepo = enhanceRepository(
     repository,
     ['create', 'update', 'delete'],
     'Item'
   );
   ```

### Transaction-Critical Operations

The following operations should always use transactions:

1. Creating/updating entities with relationships
2. Operations affecting inventory levels
3. Processing sales or purchases (affecting multiple entities)
4. Bulk operations (batch updates, deletes)
5. Operations that create derived items

### Adding New Repository Methods

When adding new methods to repositories:

1. Add method to the appropriate repository interface
2. Implement the method in the base repository
3. Implement provider-specific versions if needed
4. Add the method name to `transactionalMethods` in repositoryFactory.js if it modifies data

### Adding New Controllers

When adding new controllers:

1. Implement the controller methods with proper error handling
2. Wrap methods with `withErrorHandling` for consistent error handling
3. Use `withTransaction` for methods that modify multiple records

### Testing Error Handling and Transactions

When testing new or modified code:

1. Test error cases to ensure errors are properly caught and transformed
2. Test transaction rollback when operations fail
3. Test scenarios with concurrent modifications to verify transaction isolation