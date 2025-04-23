// This file is used to configure Jest before tests are run

// Set the ADMINA_API_KEY and ADMINA_ORGANIZATION_ID environment variables
// for tests that need to access the API client configuration
process.env.ADMINA_API_KEY = "test-api-key";
process.env.ADMINA_ORGANIZATION_ID = "test-org-id";

// This will make TextEncoder and TextDecoder available globally, which are required
// by some dependencies but not available in Node's test environment by default
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("node:util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
