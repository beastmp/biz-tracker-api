# Biz Tracker API

A modular, extensible API for business tracking and management.

## Provider Architecture

This project uses a provider pattern to abstract database and storage operations. This allows the application to:

1. Switch between different database systems (MongoDB, DynamoDB, etc.)
2. Switch between different storage solutions (Firebase Storage, AWS S3, etc.)
3. Add new providers without changing the core application code

### Directory Structure

