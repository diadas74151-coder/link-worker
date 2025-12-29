const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const productLink = process.argv[2];
  if (!productLink) {
    throw new Error('Product link missing');
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    storageState: JSON.parse(process.env.WISHLINK_STORAGE),
  });

  const page = await context.newPage();

  // 1. Open create product page
  await page.goto('https://creator.wishlink.com/new-product', {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // 2. Paste product link
  const input = page.locator('input[type="text"]');
  await input.waitFor({ timeout: 30000 });
  await input.fill(productLink);

  // 3. Click Create Wishlink
  const createBtn = page.locator('button:has-text("Create Wishlink")');
  await createBtn.waitFor({ timeout: 30000 });
  await createBtn.click();

  // 4. Wait for success modal
  await page.waitForSelector('button:has-text("Share Wishlink")', {
    timeout: 60000,
  });

  // 5. Click Share Wishlink (copies to clipboard)
  await page.click('button:has-text("Share Wishlink")');

  // 6. Read clipboard
  const wishlink = await page.evaluate(() => navigator.clipboard.readText());

  if (!wishlink || !wishlink.startsWith('http')) {
    throw new Error('Failed to read Wishlink from clipboard');
  }

  // 7. Save output
  fs.writeFileSync(
    'wishlink.json',
    JSON.stringify(
      {
        input: productLink,
        output: wishlink,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log('✅ Wishlink created:', wishlink);

  await browser.close();
})();
