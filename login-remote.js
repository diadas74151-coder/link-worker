const { chromium } = require('playwright');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  console.log("🚀 Launching Browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. NAVIGATE
    console.log("🌍 Navigating to Wishlink...");
    await page.goto('https://creator.wishlink.com/welcome', { waitUntil: 'networkidle', timeout: 60000 });

    // 2. OPEN DROPDOWN
    console.log("🔍 Force-Clicking Country Box...");
    const countryBox = page.locator('.PhoneInputCountry').first();
    await countryBox.waitFor({ state: 'visible', timeout: 30000 });
    await countryBox.click({ force: true });
    
    console.log("📂 Dropdown Clicked. Waiting for list...");
    await page.waitForTimeout(1000);

    // 3. SELECT INDIA
    console.log("🇮🇳 Selecting 'India'...");
    // Try to click "India" text
    const indiaOption = page.locator('div, li, span').filter({ hasText: 'India' }).last();
    if (await indiaOption.isVisible()) {
        await indiaOption.scrollIntoViewIfNeeded();
        await indiaOption.click({ force: true });
    } else {
        // Fallback to typing
        await page.keyboard.type('India');
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(1000);

    // 4. ENTER PHONE NUMBER (Hardcoded & Slow Typing)
    console.log("📱 Entering Phone Number: 9547131252");
    
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.click({ force: true });
    
    // 👇 CRITICAL FIX: Type slowly so we don't break the +91 format
    await page.waitForTimeout(500);
    await phoneInput.pressSequentially('9547131252', { delay: 100 });

    // 5. GET OTP
    console.log("👆 Clicking 'Get OTP'...");
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.click({ force: true });

    // 6. ENTER OTP
    console.log("\n📩 OTP Sent! Check your phone now.");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    const otpInput = page.locator('input[type="number"], input[autocomplete="one-time-code"]').first();
    await otpInput.waitFor({ state: 'visible' });
    await otpInput.fill(otp, { force: true });

    // 7. FINISH
    console.log("⏳ Verifying...");
    try {
        await page.waitForTimeout(1000);
        const verifyBtn = page.locator('button').filter({ hasText: /verify|submit/i }).first();
        if (await verifyBtn.isVisible()) await verifyBtn.click();
    } catch (e) {}

    console.log("⏳ Waiting for Dashboard...");
    await page.waitForURL('**/new-product**', { timeout: 30000 });
    
    console.log("✅ Login Successful! Generating Session...");
    const storageState = await context.storageState();
    
    console.log("\n👇 COPY THIS JSON 👇\n");
    console.log(JSON.stringify(storageState));
    console.log("\n👆 COPY THIS JSON 👆\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
    await page.screenshot({ path: 'debug_error.png' });
  } finally {
    await browser.close();
    rl.close();
    process.exit(0);
  }
})();
