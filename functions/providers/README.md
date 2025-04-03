# Provider Architecture Documentation

## Overview

The provider architecture decouples the API from specific implementations of data storage, file storage, and other services.
This allows for:

1. Replacing underlying services without changing application code
2. Testing with mock implementations
3. Supporting multiple backends for different deployment environments

## Components

### Interfaces

Interfaces define the contracts that all provider implementations must follow:

- **DatabaseProvider**: Database connection and repository creation
- **StorageProvider**: File storage operations
- **TransactionProvider**: Transaction management
- **Repositories**: Data access for specific entities (Item, Sales, Purchase)

### Base Classes

Base classes provide common functionality for specific provider types:

- **BaseDatabaseProvider**: Common database operations
- **BaseStorageProvider**: Common storage operations
- **BaseTransactionProvider**: Common transaction handling
- **BaseRepositories**: Common repository operations

### Provider Registry

The registry maintains a catalog of available provider implementations and allows for dynamic lookup.

### Provider Factory

The factory creates and initializes provider instances based on configuration.

## Adding a New Provider

### 1. Implement the Interface

Create a new class that implements the appropriate interface.

### 2. Register the Provider

Add your provider to the registry in `registerProviders.js`:

```javascript
registry.register("database", "my-provider", MyProviderClass);
```

### 3. Configure the Provider

Update the environment variables or configuration file to use your provider.

## Usage

### Getting a Provider

```javascript
const { getProviderFactory } = require("./providers");

// Get database provider
const dbProvider = getProviderFactory().getDatabaseProvider();

// Get storage provider
const storageProvider = getProviderFactory().getStorageProvider();

// Get repositories
const itemRepository = getProviderFactory().getItemRepository();
const salesRepository = getProviderFactory().getSalesRepository();
const purchaseRepository = getProviderFactory().getPurchaseRepository();

// Get transaction provider
const transactionProvider = getProviderFactory().getTransactionProvider();
```

### Using Transactions

```javascript
const { withTransaction } = require("../utils/transactionUtils");

await withTransaction(async (transaction) => {
  // Operations that need to be atomic
  await salesRepository.create(saleData, transaction);
  await salesRepository.updateInventoryForSale(saleData.items, transaction);
});
```

## Configuration

Providers are configured through environment variables or the `config.js` file:

- `DB_PROVIDER`: Database provider to use (e.g., "mongodb")
- `STORAGE_PROVIDER`: Storage provider to use (e.g., "firebase", "s3")

Provider-specific configuration:

- MongoDB: `DB_URI`
- Firebase: `STORAGE_BUCKET`
- S3: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `AWS_REGION`
