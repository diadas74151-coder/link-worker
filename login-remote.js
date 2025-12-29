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
    // 1. NAVIGATE
    // ---------------------------------------------------------
    console.log("🌍 Navigating to Wishlink...");
    await page.goto('https://creator.wishlink.com/welcome', { waitUntil: 'networkidle', timeout: 60000 });

    // ---------------------------------------------------------
    // 2. OPEN DROPDOWN (Relative Strategy)
    // ---------------------------------------------------------
    console.log("🔍 Locating Phone Input...");
    const phoneInput = page.locator('input[type="tel"]').first();
    await phoneInput.waitFor({ state: 'visible', timeout: 60000 });

    console.log("👉 Opening Dropdown (clicking to the left of input)...");
    
    // STRATEGY: Get the parent container of the input, then find the dropdown inside it
    // The dropdown is usually the first DIV sibling of the input
    const inputContainer = phoneInput.locator('..');
    const flagDropdown = inputContainer.locator('div').first();
    
    // Force click it using JS if standard click fails (bypasses visibility checks)
    try {
        await flagDropdown.click({ timeout: 5000 });
    } catch (e) {
        console.log("⚠️ Standard click failed, forcing JS click...");
        await flagDropdown.evaluate(node => node.click());
    }
    
    console.log("📂 Dropdown Clicked.");

    // ---------------------------------------------------------
    // 3. SELECT INDIA (Keyboard Trick: I -> I)
    // ---------------------------------------------------------
    console.log("⌨️  Typing 'I' twice...");
    await page.waitForTimeout(1000); // Wait for list to appear
    
    // Press I, wait, Press I
    await page.keyboard.press('I');
    await page.waitForTimeout(800); 
    await page.keyboard.press('I');
    await page.waitForTimeout(800);

    // Press ENTER to select whatever is highlighted (India)
    console.log("✅ Pressing ENTER to confirm...");
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(1000);

    // ---------------------------------------------------------
    // 4. ENTER PHONE NUMBER
    // ---------------------------------------------------------
    // Refocus input just in case
    await phoneInput.click();
    
    const phone = await askQuestion("\n📱 Enter Phone Number (10 digits): ");
    await phoneInput.fill(phone);

    // ---------------------------------------------------------
    // 5. GET OTP
    // ---------------------------------------------------------
    console.log("👆 Clicking 'Get OTP'...");
    // Try generic button selector
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.click();

    // ---------------------------------------------------------
    // 6. ENTER OTP
    // ---------------------------------------------------------
    console.log("\n📩 OTP Sent! Check your phone.");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    const otpInput = page.locator('input[type="number"], input[autocomplete="one-time-code"]').first();
    await otpInput.waitFor({ state: 'visible' });
    await otpInput.fill(otp);

    // ---------------------------------------------------------
    // 7. FINISH
    // ---------------------------------------------------------
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
