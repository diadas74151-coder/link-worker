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
    // ---------------------------------------------------------
    // 1. NAVIGATE & WAIT FOR INPUT
    // ---------------------------------------------------------
    console.log("🌍 Navigating to Wishlink Welcome Page...");
    await page.goto('https://creator.wishlink.com/welcome', { waitUntil: 'networkidle', timeout: 60000 });

    console.log("⏳ Waiting for phone input...");
    // Wait for the phone input to appear so we know the page is ready
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="Phone"]');
    await phoneInput.waitFor({ state: 'visible', timeout: 60000 });

    // ---------------------------------------------------------
    // 2. YOUR LOGIC: SELECT INDIA
    // ---------------------------------------------------------
    console.log("🇮🇳 Checking Country Code...");
    // Try to click the flag dropdown (Standard selector)
    const countryDropdown = page.locator('.flag-dropdown, .selected-flag').first();
    
    // We wait briefly to ensure it's interactive
    await countryDropdown.waitFor({ state: 'visible', timeout: 5000 }).catch(() => console.log("⚠️ Dropdown might be hidden, trying anyway..."));

    if (await countryDropdown.isVisible()) {
        await countryDropdown.click(); // Open dropdown
        console.log("📂 Dropdown clicked. Waiting for list...");
        
        // Wait a split second for list to open
        await page.waitForTimeout(1000);
        
        // Click "India"
        // We look for the list item containing "India"
        const indiaOption = page.locator('li.country, span.country-name').filter({ hasText: 'India' }).first();
        
        if (await indiaOption.isVisible()) {
            await indiaOption.click();
            console.log("✅ Selected India (+91)");
        } else {
            console.log("⚠️ 'India' option not found in list. It might already be selected.");
        }
    }

    // ---------------------------------------------------------
    // 3. ENTER PHONE NUMBER
    // ---------------------------------------------------------
    const phone = await askQuestion("\n📱 Enter Phone Number (10 digits): ");
    await phoneInput.fill(phone);

    // ---------------------------------------------------------
    // 4. CLICK GET OTP
    // ---------------------------------------------------------
    console.log("👆 Clicking 'Get OTP'...");
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.click();

    // ---------------------------------------------------------
    // 5. ENTER OTP
    // ---------------------------------------------------------
    console.log("\n📩 OTP Sent! Please check your phone.");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    const otpInput = page.locator('input[type="number"], input[autocomplete="one-time-code"]').first();
    await otpInput.waitFor({ state: 'visible' });
    await otpInput.fill(otp);

    // ---------------------------------------------------------
    // 6. VERIFY & SAVE
    // ---------------------------------------------------------
    console.log("⏳ Verifying...");
    try {
        await page.waitForTimeout(1000);
        const verifyBtn = page.locator('button').filter({ hasText: /verify|submit/i }).first();
        if (await verifyBtn.isVisible()) {
            await verifyBtn.click();
        }
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
