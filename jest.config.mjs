// Jest runs the unit tests in tests/ as native ES modules
// (npm test -> node --experimental-vm-modules ... jest).
const config = {
  testEnvironment: "node",
  transform: {},
  moduleFileExtensions: ["js", "mjs"],
  testMatch: ["**/tests/**/*.test.mjs"],
};

export default config;
