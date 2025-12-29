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
    // STEP 1: OPEN DROPDOWN (Generic Click)
    // ---------------------------------------------------------
    console.log("🔍 Clicking Country Box...");
    
    // We target the generic "Selected Flag" box found in almost all phone inputs
    const countryBox = page.locator('.selected-flag').first();
    
    await countryBox.waitFor({ state: 'visible', timeout: 30000 });
    await countryBox.click();
    console.log("📂 Dropdown Opened.");

    // ---------------------------------------------------------
    // STEP 2: SELECT INDIA (Type "I" twice)
    // ---------------------------------------------------------
    console.log("⌨️  Typing 'I' twice...");
    await page.waitForTimeout(500); // Wait for animation
    
    // Type I -> Wait -> I
    await page.keyboard.press('I');
    await page.waitForTimeout(800); 
    await page.keyboard.press('I');
    await page.waitForTimeout(800);

    // ---------------------------------------------------------
    // STEP 3: CLICK "India"
    // ---------------------------------------------------------
    console.log("👆 Selecting 'India'...");
    // Select the option that specifically says "India" (Case insensitive)
    const indiaOption = page.locator('li.country').filter({ hasText: /^India$/i }).first();
    
    // Fallback: If list item not found by text, just press Enter to select whatever is highlighted
    if (await indiaOption.isVisible()) {
        await indiaOption.click();
    } else {
        console.log("⚠️ Exact 'India' option not found, pressing ENTER on selection...");
        await page.keyboard.press('Enter');
    }
    
    console.log("✅ Country Selection Done.");
    await page.waitForTimeout(1000);

    // ---------------------------------------------------------
    // STEP 4: ENTER PHONE NUMBER
    // ---------------------------------------------------------
    const phoneInput = page.getByPlaceholder(/enter phone number/i);
    await phoneInput.click();
    
    const phone = await askQuestion("\n📱 Enter Phone Number (10 digits): ");
    await phoneInput.fill(phone);

    // ---------------------------------------------------------
    // STEP 5: GET OTP
    // ---------------------------------------------------------
    console.log("👆 Clicking 'Get OTP'...");
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.click();

    // ---------------------------------------------------------
    // STEP 6: ENTER OTP
    // ---------------------------------------------------------
    console.log("\n📩 OTP Sent! Please check your phone.");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    const otpInput = page.locator('input[type="number"], input[autocomplete="one-time-code"]').first();
    await otpInput.waitFor({ state: 'visible' });
    await otpInput.fill(otp);

    // ---------------------------------------------------------
    // STEP 7: VERIFY & SAVE
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
