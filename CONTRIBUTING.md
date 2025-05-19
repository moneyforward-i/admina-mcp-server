# Contributing to admina-mcp-server

Thank you for your interest in contributing to this project! This document outlines the process for contributing and guidelines to follow.

## Development Setup

1. Fork and clone the repository
  ```
  git clone https://github.com/moneyforward-i/admina-mcp-server.git
  cd admina-mcp-server
  ```

2. Install dependencies with `yarn install`
3. Make your changes
4. Run tests with `yarn test`
5. Build the project with `yarn build:dev`

## Running the server locally
```
node build/index.js
```

## Coding Standards
- Use typescript for all new code
- Follow the existing code style
- Write tests for new features
- Keep your changes focused and atomic
- Keep the README.md updated

## Commit Guidelines

Please use conventional commit messages:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for changes to tests
- `chore:` for maintenance tasks

## Pull Request Process

1. Ensure your code follows our coding standards
2. Update documentation if needed
3. Make sure to add tests for new features, and confirm that all tests pass
4. Test the feature with a mcp client (Claude, Cursor etc...)
5. Submit a pull request with a clear description of the changes

## Issues

If you find a bug or have a feature request, please create an issue on GitHub. Include:

- A clear description of the problem
- Steps to reproduce (for bugs)
- Expected and actual results (for bugs)
- Any relevant logs or screenshots

## License
This project is based on [Apache License 2.0](https://github.com/moneyforward-i/admina-mcp-server/blob/main/LICENSE)