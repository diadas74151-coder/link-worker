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
    // STEP 1: OPEN DROPDOWN (Click the "+1" Text)
    // ---------------------------------------------------------
    console.log("🔍 Looking for default Country Code (+1)...");
    
    // Instead of a CSS class, we look for the VISIBLE TEXT "+1"
    // This is much more reliable.
    const countryCode = page.getByText('+1', { exact: true }).first();
    
    // If +1 is not found, maybe it's just a flag icon, so we try the generic container
    const countryContainer = page.locator('.react-tel-input > div').first();

    if (await countryCode.isVisible()) {
        console.log("👉 Found '+1'. Clicking it...");
        await countryCode.click();
    } else {
        console.log("⚠️ '+1' text not found. Clicking the input container instead...");
        await countryContainer.click();
    }

    // ---------------------------------------------------------
    // STEP 2: SELECT INDIA (Click "India" Text)
    // ---------------------------------------------------------
    console.log("🇮🇳 Searching for 'India' in the list...");
    
    // Wait for the word "India" to appear anywhere and click it
    // We use a regex to match "India" case-insensitively
    const indiaOption = page.getByRole('listitem').filter({ hasText: /^India/i }).first();
    
    // Fallback: If listitem role isn't used, look for any text element
    const indiaText = page.locator('span, div, li').filter({ hasText: /^India$/i }).first();

    if (await indiaOption.isVisible()) {
        await indiaOption.click();
    } else {
        // Scroll to find it if needed (simulate typing 'I' 'n')
        await page.keyboard.type('In'); 
        await page.waitForTimeout(500);
        await indiaText.click();
    }
    
    console.log("✅ Clicked India. Verifying...");
    
    // Small pause to let the selection update
    await page.waitForTimeout(1000);

    // ---------------------------------------------------------
    // STEP 3: ENTER PHONE NUMBER
    // ---------------------------------------------------------
    const phoneInput = page.getByPlaceholder(/enter phone number/i);
    await phoneInput.click();
    
    const phone = await askQuestion("\n📱 Enter Phone Number (10 digits): ");
    await phoneInput.fill(phone);

    // ---------------------------------------------------------
    // STEP 4: GET OTP
    // ---------------------------------------------------------
    console.log("👆 Clicking 'Get OTP'...");
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.click();

    // ---------------------------------------------------------
    // STEP 5: ENTER OTP
    // ---------------------------------------------------------
    console.log("\n📩 OTP Sent! Check your phone.");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    const otpInput = page.locator('input[type="number"], input[autocomplete="one-time-code"]').first();
    await otpInput.waitFor({ state: 'visible' });
    await otpInput.fill(otp);

    // ---------------------------------------------------------
    // STEP 6: FINISH
    // ---------------------------------------------------------
    console.log("⏳ Verifying...");
    // Auto-click verify if it appears
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
