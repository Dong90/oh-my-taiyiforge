// @ts-check
/** @type {import('@playwright/test').PlaywrightTestConfig} */
export default {
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    headless: true,
  },
};
