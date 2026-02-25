# Vulcan MCP Integration Memory

## Project Structure
- MCP server location: `./admina-mcp-server`
- Vulcan backend location: `../vulcan`
- Package manager: yarn

## Key Patterns

### Endpoint Definition Pattern
MCP endpoints follow consistent patterns:
1. Schema definition using Zod with descriptive field descriptions
2. Type inference from schema: `type Params = z.infer<typeof Schema>`
3. Implementation that builds request body conditionally (only include defined fields)
4. Use `getClient().makePatchApiCall()` or similar for API calls

### Update Endpoint Pattern
For update endpoints (like updateDeviceCustomField, updateIdentityCustomField):
- All parameters are optional except ID
- Build body object conditionally: only include fields that are `!== undefined`
- Never send null/undefined fields to avoid unintended updates
- Use proper TypeScript types for all parameters

### Test Pattern
- Mock axios using `jest.mock("axios")`
- Use `resetClient()` in beforeEach
- Test successful updates with different parameter combinations
- Test error handling (404, 409 Conflict, etc.)
- Verify API call URL and body match expectations

## Identity Custom Fields
Backend endpoint: `PATCH /identity/fields/custom/:customFieldId`

Updatable fields (from Vulcan backend):
- `attributeName` (string): Display label for the field
- `attributeCode` (string): Unique identifier (lowercase, numbers, underscores)

Note: Unlike device custom fields, identity custom fields do NOT support:
- visibleForType (no type filtering)
- configuration updates (dropdown values cannot be changed after creation)

## Build and Deploy Process
1. Make code changes
2. Run `yarn build` (builds TypeScript to dist/)
3. Run `yarn test` to verify all tests pass
4. Instruct user to restart Claude Desktop for changes to take effect

## File Locations
- Tool implementations: `src/tools/*.ts`
- Tests: `src/test/tools/*.test.ts`
- Common schemas: `src/common/dropdown-schema.ts`
- Main server: `src/index.ts` (registers all endpoints)
