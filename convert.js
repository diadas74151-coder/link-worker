const { chromium } = require('playwright-chromium');
const fs = require('fs');

(async () => {
  const inputLink = process.argv[2];

  if (!inputLink) {
    console.error("❌ No product link provided");
    process.exit(1);
  }

  // Restore wishlink.json from GitHub Secret
  fs.writeFileSync(
    'wishlink.json',
    process.env.WISHLINK_STORAGE
  );

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    storageState: 'wishlink.json'
  });

  const page = await context.newPage();

  // Open Wishlink dashboard
  await page.goto('https://creator.wishlink.com/home', {
    waitUntil: 'domcontentloaded'
  });

  // Paste product link
  await page.fill('input[type="url"], input[type="text"]', inputLink);

  // Click Create / Convert
  await page.click('button:has-text("Create")');

  // Wait for generated link
  await page.waitForSelector('input[readonly]', { timeout: 20000 });

  const convertedLink = await page.$eval(
    'input[readonly]',
    el => el.value
  );

  console.log("✅ Converted Wishlink:");
  console.log(convertedLink);

  await browser.close();
})();
