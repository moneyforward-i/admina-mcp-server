# admina-mcp-server
MCP server for the Admina API.

## Tools and API Documentation

- **get_devices**: Return a list of devices. [Get Devices API](https://docs.itmc.i.moneyforward.com/reference/publicgetdevices)
- **get_identities**: Return a list of identities. [Get Identities API](https://docs.itmc.i.moneyforward.com/reference/publicgetidentities)
- **get_services**: Return a list of services integrations that belongs to organization along with a preview of accounts. [Organization Services API](https://docs.itmc.i.moneyforward.com/reference/publicgetorganizationservices)
- **get_service_accounts**: Return a list of accounts for a specific service. [Get Service Accounts API](https://docs.itmc.i.moneyforward.com/reference/publicgetserviceaccounts)
- **get_people_accounts**: Return a list of all SaaS accounts belonging to a person. [Get People Accounts API](https://docs.itmc.i.moneyforward.com/reference/publicgetpeopleaccounts)
- **get_identity_field_configuration**: Get identity field configuration of an organization including preset field settings, field order, and source of truth metadata.
## Configuration

To configure the admina-mcp-server, you will need the `organizationId` and an API key. For more details on obtaining your API key, please refer to the [Getting Started Guide](https://docs.itmc.i.moneyforward.com/reference/getting-started-1#step-1-obtain-your-api-key).

## MCP Client Configuration
To configure this MCP server, add the following configuration to your mcp settings. 
```
{
  "mcpServers": {
    "admina-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "@moneyforward_i/admina-mcp-server"
      ],
      "env": {
        "ADMINA_ORGANIZATION_ID": <Organization Id>,
        "ADMINA_API_KEY": <API Key>
      }
    }
  }
}
```

For local set up, run `yarn build:dev` and set the path to the root dir.

## Releasing
### Preparing a release

- Bump up a package version of `package.json`. A Git commit will be created automatically.

```
yarn version --new-version <new version>
```

- Push the change to the main branch as usual.

### Creating a release

- Create a new release in GitHub by clicking on "Releases" and then "Draft a new release"
- Set the Tag version to a new tag
- Set the Target as main.
- Set the Release title to the tag you created, vX.Y.Z
- Click "Publish release" to save and publish your release.
- GitHub Actions workflow will be triggerd by publishing a new release and the package will be released.