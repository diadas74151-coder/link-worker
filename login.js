const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://creator.wishlink.com', {
    waitUntil: 'domcontentloaded'
  });

  console.log("👉 Login using OTP in browser");
  console.log("👉 After dashboard opens, come back and press ENTER");

  // Wait for YOU to finish OTP login
  await new Promise(resolve => process.stdin.once('data', resolve));

  await context.storageState({ path: 'wishlink.json' });
  console.log("✅ wishlink.json generated");

  await browser.close();
})();
