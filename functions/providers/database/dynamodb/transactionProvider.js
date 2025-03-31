const {BaseTransactionProvider} = require("../../base");
const {TransactWriteItemsCommand} = require("@aws-sdk/client-dynamodb");
const {marshall} = require("@aws-sdk/util-dynamodb");
const {v4: uuidv4} = require("uuid");

/**
 * DynamoDB implementation of TransactionProvider
 */
class DynamoTransactionProvider extends BaseTransactionProvider {
  /**
   * Create a new DynamoTransactionProvider
   * @param {Object} documentClient - DynamoDB Document Client
   * @param {string} tablePrefix - Prefix for table names
   */
  constructor(documentClient, tablePrefix) {
    super();
    this.documentClient = documentClient;
    this.tablePrefix = tablePrefix;
    this.pendingTransactions = new Map();
  }

  /**
   * Start a new transaction
   * @return {Promise<Object>} Transaction object
   */
  async startTransaction() {
    const transactionId = uuidv4();
    const transaction = {
      id: transactionId,
      operations: [],
      status: "pending",
    };

    // Store the transaction
    this.pendingTransactions.set(transactionId, transaction);

    return transaction;
  }

  /**
   * Add a write operation to the transaction
   * @param {Object} transaction - Transaction object
   * @param {string} tableName - Table name without prefix
   * @param {string} operation - Operation type ('Put', 'Update', 'Delete')
   * @param {Object} item - Item to write
   */
  addWriteOperation(transaction, tableName, operation, item) {
    if (!transaction || transaction.status !== "pending") {
      throw new Error(`Invalid transaction
        or transaction already committed/aborted`);
    }

    const fullTableName = `${this.tablePrefix}${tableName}`;

    let operationParams;

    switch (operation) {
      case "Put":
        operationParams = {
          Put: {
            TableName: fullTableName,
            Item: marshall(item),
            ConditionExpression: item.id ?
              "attribute_not_exists(id) OR id = :id" :
              "attribute_not_exists(id)",
            ExpressionAttributeValues: item.id ?
              marshall({":id": item.id}) : undefined,
          },
        };
        break;

      case "Update":
        // For simplicity, we're using Put for updates too
        operationParams = {
          Put: {
            TableName: fullTableName,
            Item: marshall(item),
            ConditionExpression: "attribute_exists(id)",
          },
        };
        break;

      case "Delete":
        operationParams = {
          Delete: {
            TableName: fullTableName,
            Key: marshall({id: item.id}),
            ConditionExpression: "attribute_exists(id)",
          },
        };
        break;

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    transaction.operations.push(operationParams);
  }

  /**
   * Commit a transaction
   * @param {Object} transaction Transaction/session object
   * @return {Promise<void>}
   */
  async commitTransaction(transaction) {
    if (!transaction) return;

    try {
      if (transaction.operations.length > 0) {
        const command = new TransactWriteItemsCommand({
          TransactItems: transaction.operations,
        });

        await this.documentClient.send(command);
      }

      transaction.status = "committed";
      this.pendingTransactions.delete(transaction.id);
    } catch (error) {
      console.error("Error committing DynamoDB transaction:", error);
      transaction.status = "error";
      throw error;
    }
  }

  /**
   * Rollback/abort a transaction
   * @param {Object} transaction Transaction/session object
   * @return {Promise<void>}
   */
  async rollbackTransaction(transaction) {
    if (!transaction) return;

    // For DynamoDB, we simply abandon the transaction
    transaction.status = "aborted";
    this.pendingTransactions.delete(transaction.id);
  }

  /**
   * Execute a function within a transaction
   * @param {Function} callback Function to execute with transaction
   * @param {Object} [options] Transaction options
   * @return {Promise<*>} Result of the callback function
   */
  async withTransaction(callback, options = {}) {
    const transaction = await this.startTransaction();

    try {
      const result = await callback(transaction);
      await this.commitTransaction(transaction);
      return result;
    } catch (error) {
      await this.rollbackTransaction(transaction);
      throw error;
    }
  }
}

module.exports = DynamoTransactionProvider;
