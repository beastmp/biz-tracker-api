# HTTP API Testing Guide

This directory contains HTTP files for testing the Biz-Tracker API endpoints directly from VS Code.

## Prerequisites

- The [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension for VS Code
- A running instance of the Biz-Tracker API (local or deployed)

## How to Use These Files

1. Open any `.http` file in VS Code
2. You'll see "Send Request" links above each HTTP request
3. Click the environment name in the bottom right of VS Code and select either "development" or "production"
4. Update the `http-client.env.json` file with your actual auth token if needed
5. Click "Send Request" on any request to execute it

## Available Test Files

- `health.http` - Test if the API is running correctly
- `relationships.http` - Test all relationship-related endpoints
- `assets.http` - Test all asset-related endpoints
- `items.http` - Test all item-related endpoints

## Tips

- Replace placeholder IDs (like `item_id_here`) with actual IDs from your database
- Use the environment variables to switch between development and production endpoints
- The response will appear in a split window in VS Code
- You can chain requests using the response from previous requests (see REST Client documentation)

## Running the API Locally

To test against a local API instance:

```bash
cd functions
npm run serve
```

Then select the "development" environment in VS Code.