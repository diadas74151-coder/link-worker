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

    // 2. OPEN DROPDOWN (Force Click)
    console.log("🔍 Force-Clicking Country Box...");
    // Using the class we saw in your logs
    const countryBox = page.locator('.PhoneInputCountry').first();
    await countryBox.waitFor({ state: 'visible', timeout: 30000 });
    await countryBox.click({ force: true });
    
    console.log("📂 Dropdown Clicked. Waiting for list...");
    await page.waitForTimeout(1000);

    // 3. SELECT INDIA (Click by Name)
    console.log("🇮🇳 Finding 'India' in the list...");
    
    // Instead of typing shortcuts, we look for the text "India" and FORCE click it
    // This solves the +98 (Iran) issue
    const indiaOption = page.locator('div, li, span').filter({ hasText: /^India$/i }).last();
    
    if (await indiaOption.isVisible()) {
        await indiaOption.scrollIntoViewIfNeeded();
        await indiaOption.click({ force: true });
        console.log("✅ Clicked 'India' option.");
    } else {
        // Fallback: If text click fails, use the keyboard but type "Ind" quickly
        console.log("⚠️ Text not found, typing 'Ind'...");
        await page.keyboard.type('Ind');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');
    }
    
    await page.waitForTimeout(1000);

    // 4. ENTER PHONE NUMBER (The Fix for "Subtree Intercepts")
    console.log("📱 Locating Phone Input...");
    const phoneInput = page.locator('input[type="tel"]').first();
    
    // 👇 CRITICAL FIX: We force the click to punch through any overlays
    await phoneInput.click({ force: true });
    
    const phone = await askQuestion("\n📱 Enter Phone Number (10 digits): ");
    
    // 👇 CRITICAL FIX: We force the fill as well
    await phoneInput.fill(phone, { force: true });

    // 5. GET OTP
    console.log("👆 Clicking 'Get OTP'...");
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.click({ force: true });

    // 6. ENTER OTP
    console.log("\n📩 OTP Sent! Check your phone.");
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
