# Admina MCP Server

An MCP (Model Context Protocol) server implementation for Admina API integration using TypeScript.

## Overview

This server provides an MCP-compatible interface to interact with the Admina API, specifically implementing the get devices tool to retrieve device information.

## Features

- MCP server implementation using Express and the official TypeScript SDK
- Bearer authentication with organizationId and API Key
- Get devices tool implementation

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/moneyforward-i/admina-mcp-server.git
cd admina-mcp-server
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Create a `.env` file in the root directory with the following variables:
```
ORGANIZATION_ID=your_organization_id
API_KEY=your_api_key
PORT=3000
```

## Usage

### Development

```bash
npm run dev
# or
yarn dev
```

### Production

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## Authentication

The server uses Bearer authentication with the organizationId and API Key. When connecting to the MCP server, provide the authentication token in the format:

```
Bearer {organizationId}:{apiKey}
```

## API Endpoints

### GET /

Returns information about the MCP server and available tools.

### POST /tools/get_devices

Retrieves a list of devices from the Admina API.

Parameters:
- `limit` (optional): Limit the number of results returned
- `cursor` (optional): Cursor to paginate through results
- `locale` (required, default: 'en'): Translate field names and labels to the specified locale
- `type` (optional): Filter by device type
- `status` (optional): Filter by device status
- `asset_number` (optional): Filter by asset number
- `serial_number` (optional): Filter by serial number
- `uid` (optional): Filter by uid (or peopleId)

## MCP Integration

This server implements the Model Context Protocol (MCP) which allows AI models to interact with external tools. The implementation follows the specifications from the [MCP documentation](https://modelcontextprotocol.io/).

### Using with MCP Clients

MCP clients can connect to this server and use the available tools. Here's an example of how to use the get_devices tool:

```typescript
import { Client } from 'modelcontextprotocol';

const client = new Client({
  url: 'https://your-server-url',
  authentication: {
    type: 'bearer',
    token: `${organizationId}:${apiKey}`
  }
});

const result = await client.callTool('get_devices', {
  locale: 'en',
  limit: 10,
  status: 'active'
});

console.log(result);
```

## Development

### Project Structure

- `src/server.ts` - Main server implementation
- `src/admina-api.ts` - Admina API client
- `src/types.ts` - TypeScript type definitions

### Adding New Tools

To add a new tool to the MCP server, follow these steps:

1. Define the tool parameters and response types in `src/types.ts`
2. Add the API client method in `src/admina-api.ts`
3. Register the tool in `src/server.ts` following the pattern of the existing tools

## License

ISC
