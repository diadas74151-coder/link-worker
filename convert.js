const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  let browser;

  try {
    // 1. Input Validation
    const productLink = process.argv[2];
    if (!productLink) {
      throw new Error("❌ No product link provided. Usage: node convert.js <link>");
    }

    // 2. Secret Validation & Setup
    if (!process.env.WISHLINK_STORAGE) {
      throw new Error("❌ WISHLINK_STORAGE secret is missing.");
    }

    // Write the auth state to a file so Playwright can use it
    fs.writeFileSync('wishlink.json', process.env.WISHLINK_STORAGE);

    // 3. Launch Browser
    browser = await chromium.launch({ headless: true });
    
    // Create context with the saved login state
    const context = await browser.newContext({
      storageState: 'wishlink.json',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' // Helps avoid detection
    });

    const page = await context.newPage();

    console.log("🔄 Navigating to Dashboard...");
    
    // 4. Navigation with specific validation
    await page.goto('https://wishlink.com/dashboard', { // Note: 'wishlink.in' often redirects to .com, adjusted for safety
      waitUntil: 'networkidle', // Waits until the page stops loading resources
      timeout: 30000
    });

    // Check if we are actually logged in
    if (page.url().includes('login')) {
      throw new Error("❌ Session expired. Please update WISHLINK_STORAGE secret.");
    }

    console.log("generating link...");

    // 5. Interaction (More robust selectors)
    // We wait for the input specifically to ensure the UI is interactive
    const inputSelector = 'input[placeholder*="paste"], input[type="url"]'; 
    await page.waitForSelector(inputSelector, { timeout: 10000 });
    await page.fill(inputSelector, productLink);

    // Click the Create/Generate button
    const buttonSelector = 'button:has-text("Create"), button:has-text("Generate")';
    await page.click(buttonSelector);

    // 6. Capture Result
    // Wait for the read-only input that usually contains the result
    const resultSelector = 'input[readonly][value*="wishlink"]';
    await page.waitForSelector(resultSelector, { timeout: 15000 });

    const convertedLink = await page.$eval(resultSelector, el => el.value);

    // 7. Output Result
    console.log("\n==============================");
    console.log("✅ SUCCESS! Converted Link:");
    console.log(convertedLink);
    console.log("==============================\n");

    // Optional: Write to GitHub Output so other steps can use it
    // fs.appendFileSync(process.env.GITHUB_OUTPUT, `converted_link=${convertedLink}\n`);

  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    // If it's a timeout, it might be a UI change
    if (error.name === 'TimeoutError') {
      console.error("The element took too long to appear. The website layout might have changed.");
    }
    process.exit(1);
    
  } finally {
    if (browser) {
      await browser.close();
    }
    // Clean up sensitive file
    if (fs.existsSync('wishlink.json')) {
      fs.unlinkSync('wishlink.json');
    }
  }
})();
