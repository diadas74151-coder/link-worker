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
    // Use the class specific to the phone library
    const countryBox = page.locator('.PhoneInputCountry').first();
    await countryBox.waitFor({ state: 'visible', timeout: 30000 });
    await countryBox.click({ force: true });
    
    console.log("📂 Dropdown Clicked. Waiting for list...");
    await page.waitForTimeout(1000);

    // 3. SELECT INDIA (Robust Method)
    console.log("🇮🇳 Selecting 'India'...");
    
    // Method A: Try to click the specific text "India"
    // We use a looser match (contains text) to be safe
    const indiaOption = page.locator('div, li, span').filter({ hasText: 'India' }).last();
    
    if (await indiaOption.isVisible()) {
        console.log("👉 Click by Text: India");
        await indiaOption.scrollIntoViewIfNeeded();
        await indiaOption.click({ force: true });
    } else {
        // Method B: Type specific sequence
        console.log("⚠️ Text hidden, using Keyboard...");
        // Type "India" fully to avoid "Indonesia" match
        await page.keyboard.type('India');
        await page.waitForTimeout(800);
        await page.keyboard.press('Enter');
    }
    
    await page.waitForTimeout(1000);

    // 4. VERIFY COUNTRY CODE (CRITICAL STEP)
    console.log("👀 Verifying Country Code...");
    
    // Check the value inside the input box
    const phoneInput = page.locator('input[type="tel"]').first();
    const inputValue = await phoneInput.inputValue();
    
    console.log(`ℹ️ Current Input Value: "${inputValue}"`);
    
    if (inputValue.includes('+91') || inputValue === '') {
        console.log("✅ Country seems correct (India +91).");
    } else {
        console.log(`❌ WARNING: Country Code looks wrong! Found: ${inputValue}`);
        console.log("🔄 Retrying India selection via Native Select...");
        
        // Emergency Fallback: Force the hidden select element
        await page.evaluate(() => {
            const select = document.querySelector('select.PhoneInputCountrySelect');
            if (select) {
                select.value = 'IN';
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await page.waitForTimeout(1000);
    }

    // 5. ENTER PHONE NUMBER
    console.log("📱 Entering Phone Number...");
    await phoneInput.click({ force: true });
    
    const phone = await askQuestion("\n📱 Enter Phone Number (10 digits): ");
    await phoneInput.fill(phone, { force: true });

    // 6. GET OTP
    console.log("👆 Clicking 'Get OTP'...");
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.click({ force: true });

    // 7. ENTER OTP
    console.log("\n📩 OTP Sent! Check your phone.");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    const otpInput = page.locator('input[type="number"], input[autocomplete="one-time-code"]').first();
    await otpInput.waitFor({ state: 'visible' });
    await otpInput.fill(otp, { force: true });

    // 8. FINISH
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
