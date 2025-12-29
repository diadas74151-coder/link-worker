const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const productLink = process.argv[2];
  if (!productLink) {
    throw new Error('❌ Product link missing');
  }

  // Load saved login session from GitHub Secret
  const storage = JSON.parse(process.env.WISHLINK_STORAGE);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    storageState: storage,
  });

  const page = await context.newPage();

  console.log('➡️ Opening Wishlink create page');
  await page.goto('https://creator.wishlink.com/new-product', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  console.log('➡️ Filling product link');
  const input = page.locator('input[placeholder*="Paste"]');
  await input.waitFor({ timeout: 30000 });
  await input.fill(productLink);

  console.log('➡️ Creating Wishlink');
  await page.locator('button:has-text("Create Wishlink")').click();

  console.log('⏳ Waiting for Wishlink URL');
  const wishlink = page.locator('input[value^="https://"]');
  await wishlink.waitFor({ timeout: 60000 });

  const converted = await wishlink.inputValue();
  console.log('✅ CONVERTED LINK:', converted);

  fs.writeFileSync('wishlink.json', JSON.stringify({ original: productLink, wishlink: converted }, null, 2));

  await browser.close();
})();
