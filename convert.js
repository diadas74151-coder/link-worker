const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const productLink = process.argv[2];

  if (!productLink) {
    console.log("❌ No product link provided");
    process.exit(1);
  }

  // Recreate wishlink.json from GitHub Secret
  fs.writeFileSync(
    'wishlink.json',
    process.env.WISHLINK_STORAGE
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: 'wishlink.json'
  });

  const page = await context.newPage();

  // Open Wishlink dashboard (already logged in)
  await page.goto('https://wishlink.in/dashboard', {
    waitUntil: 'domcontentloaded'
  });

  // Paste product link
  await page.fill('input[type="url"], input[type="text"]', productLink);
  await page.click('button:has-text("Create")');

  // Wait for converted link
  await page.waitForSelector('input[readonly]', { timeout: 15000 });

  const convertedLink = await page.$eval(
    'input[readonly]',
    el => el.value
  );

  console.log("✅ Converted Wishlink:");
  console.log(convertedLink);

  await browser.close();
})();
