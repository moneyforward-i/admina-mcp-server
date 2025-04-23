/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: ["node_modules/(?!(.*\\.mjs$))"],
  setupFilesAfterEnv: ["<rootDir>/.jest.setup.js"],
  testMatch: ["**/test/**/*.test.ts"],
  roots: ["<rootDir>/src/"],
};
