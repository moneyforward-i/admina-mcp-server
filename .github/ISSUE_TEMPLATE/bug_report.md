---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
assignees: ''
---

## Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. 
2. 
3. 

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
A clear and concise description of what actually happened.

## Environment
- Node.js version:
- Yarn version:
- OS:
- MCP server version:
- MCP Client: 

## MCP Client Configuration
```
{
  "mcpServers": {
    "admina-mpc-server": {
      "command": "npx",
      "args": [
        "-y",
        "@moneyforward_i/admina-mcp-server"
      ],
      "env": {
        "ADMINA_ORGANIZATION_ID": <Organization Id (redacted)>,
        "ADMINA_API_KEY": <API Key (redacted)>
      }
    }
  }
}
```