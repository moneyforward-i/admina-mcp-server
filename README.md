# admina-mcp-server
MCP server for the Admina API.

## Tools and API Documentation

### Organization
- **get_organization_info**: Get information about the organization including name, unique name, status, and system language.

### Devices
- **get_devices**: Return a list of devices with advanced search and filtering. [Get Devices API](https://docs.itmc.i.moneyforward.com/reference/publicgetdevices)
- **create_device**: Create a new device for an organization. Requires device type (subtype), asset number, and model name.
- **update_device**: Update an existing device's information including preset fields and custom fields.
- **update_device_meta**: Update device's meta information including assignment info (peopleId, status, dates) and location.

### Device Custom Fields
- **get_device_custom_fields**: Get all custom fields configured for an organization's devices.
- **create_device_custom_field**: Create a new custom field for organization devices.
- **update_device_custom_field**: Update an existing device custom field configuration.
- **delete_device_custom_field**: Delete a device custom field configuration.

### Identities
- **get_identities**: Return a list of identities. [Get Identities API](https://docs.itmc.i.moneyforward.com/reference/publicgetidentities)
- **get_identity_field_configuration**: Get identity field configuration of an organization including preset field settings, field order, and source of truth metadata.
- **get_identity_config**: Get configuration for identity fields of a specific identity.
- **check_identity_management_type**: Determine the management type for an identity based on email or identityId.
- **get_identities_stats**: Get identities statistics including management type counts, HR master integration info, and domain lists.
- **merge_identities**: Merge identities in batch (supports up to 50 merge operations per request).

### Services & Accounts
- **get_services**: Return a list of services integrations that belongs to organization along with a preview of accounts. [Organization Services API](https://docs.itmc.i.moneyforward.com/reference/publicgetorganizationservices)
- **get_service_accounts**: Return a list of accounts for a specific service. [Get Service Accounts API](https://docs.itmc.i.moneyforward.com/reference/publicgetserviceaccounts)
- **get_people_accounts**: Return a list of all SaaS accounts belonging to a person. [Get People Accounts API](https://docs.itmc.i.moneyforward.com/reference/publicgetpeopleaccounts)



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