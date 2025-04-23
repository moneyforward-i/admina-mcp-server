# admina-mcp-server
MCP server for the Admina API.

## Tools and API Documentation

- **get_devices**: Return a list of devices. [Devices API](https://docs.itmc.i.moneyforward.com/reference/publicgetdevices)
- **get_identities**: Return a list of identities. [Identities API](https://docs.itmc.i.moneyforward.com/reference/publicgetidentities)
- **get_services**: Return a list of services integrations that belongs to organization along with a preview of accounts. [Organization Services API](https://docs.itmc.i.moneyforward.com/reference/publicgetorganizationservices)
- **get_service_accounts**: Return a list of accounts for a specific service. [Service Accounts API](https://docs.itmc.i.moneyforward.com/reference/publicgetserviceaccounts)

## Configuration

To configure the admina-mcp-server, you will need the `organizationId` and an API key. For more details on obtaining your API key, please refer to the [Getting Started Guide](https://docs.itmc.i.moneyforward.com/reference/getting-started-1#step-1-obtain-your-api-key).

## MCP Client Configuration
To configure this MCP server, add the following configuration to your mcp settings. 
```
{
  "mcpServers": {
    "admina-mpc": {
      "command": "node",
      "args": [
        "./build/index.js" // For local development. use npx after published
      ],
      "env": {
        "ADMINA_ORGANIZATION_ID": <Organization Id>,
        "ADMINA_API_KEY": <API Key>
      }
    }
  }
}
```

For local set up, run `yarn build` or `yarn build:dev` and set the path to the build file.
