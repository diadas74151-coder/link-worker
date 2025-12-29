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
    console.log("🌍 Navigating to Wishlink...");
    await page.goto('https://creator.wishlink.com/welcome', { waitUntil: 'networkidle', timeout: 60000 });

    // ---------------------------------------------------------
    // STEP 1: SELECT INDIA (Using "I" + "I" Trick)
    // ---------------------------------------------------------
    console.log("🇮🇳 Selecting Country: India...");
    
    // 1. Click the flag dropdown to open the list
    const flagDropdown = page.locator('.selected-flag');
    await flagDropdown.waitFor({ state: 'visible' });
    await flagDropdown.click();
    
    // 2. Type "I" twice as per your instruction
    console.log("⌨️  Typing 'I' twice...");
    await page.keyboard.press('I');
    await page.waitForTimeout(500); // Small pause
    await page.keyboard.press('I');
    await page.waitForTimeout(500); // Wait for scroll/highlight

    // 3. Click the "India" option to confirm
    // We look for "India" or "INDIA" specifically
    const indiaOption = page.locator('.country-list .country').filter({ hasText: /India/i }).first();
    await indiaOption.click();
    
    console.log("✅ Country set to India (+91)");
    await page.waitForTimeout(1000); 

    // ---------------------------------------------------------
    // STEP 2: ENTER PHONE NUMBER
    // ---------------------------------------------------------
    const phoneInput = page.getByPlaceholder(/enter phone number/i);
    await phoneInput.click();
    
    const phone = await askQuestion("\n📱 Enter Phone Number (10 digits): ");
    await phoneInput.fill(phone);

    // ---------------------------------------------------------
    // STEP 3: GET OTP
    // ---------------------------------------------------------
    console.log("👆 Clicking 'Get OTP'...");
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.click();

    // ---------------------------------------------------------
    // STEP 4: ENTER OTP
    // ---------------------------------------------------------
    console.log("\n📩 OTP Sent! Please check your phone.");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    const otpInput = page.locator('input[type="number"], input[autocomplete="one-time-code"]').first();
    await otpInput.waitFor({ state: 'visible' });
    await otpInput.fill(otp);

    // ---------------------------------------------------------
    // STEP 5: VERIFY & SAVE
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
    await page.screenshot({ path: 'error_debug.png' });
  } finally {
    await browser.close();
    rl.close();
    process.exit(0);
  }
})();
