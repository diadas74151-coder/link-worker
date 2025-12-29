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
    // 1. Navigate to Welcome Page
    console.log("🌍 Navigating to Wishlink Welcome Page...");
    // Go directly to the OTP page if possible, otherwise Welcome
    await page.goto('https://creator.wishlink.com/welcome', { waitUntil: 'networkidle', timeout: 60000 });

    // 2. Wait for ANY Phone Input
    console.log("⏳ Waiting for phone input...");
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="Phone"]');
    await phoneInput.waitFor({ state: 'visible', timeout: 60000 });

    // 3. Ensure India (+91) is selected
    console.log("🇮🇳 Checking Country Code...");
    // Try to click the flag dropdown
    const countryDropdown = page.locator('.flag-dropdown, .selected-flag').first();
    
    if (await countryDropdown.isVisible()) {
        await countryDropdown.click(); // Open dropdown
        // Wait a split second for list to open
        await page.waitForTimeout(500);
        
        // Click India
        const indiaOption = page.locator('li.country').filter({ hasText: 'India' });
        if (await indiaOption.isVisible()) {
            await indiaOption.click();
            console.log("✅ Selected India (+91)");
        }
    }

    // 4. Enter Phone Number
    const phone = await askQuestion("\n📱 Enter Phone Number (10 digits): ");
    await phoneInput.fill(phone);

    // 5. Click "Get OTP" or "Continue"
    console.log("👆 Clicking Continue...");
    // Try multiple button selectors
    const btn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await btn.click();

    // 6. Enter OTP
    console.log("\n📩 OTP Sent! Check your phone.");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    // Find OTP input (Wait for it to appear)
    const otpInput = page.locator('input[autocomplete="one-time-code"], input[type="number"]').first();
    await otpInput.waitFor({ state: 'visible', timeout: 30000 });
    await otpInput.fill(otp);

    // 7. Click Verify (if needed)
    console.log("⏳ Verifying...");
    try {
        await page.waitForTimeout(1000);
        const verifyBtn = page.locator('button').filter({ hasText: /verify|submit/i }).first();
        if (await verifyBtn.isVisible()) {
            await verifyBtn.click();
        }
    } catch (e) {}

    // 8. Capture Session
    console.log("⏳ Waiting for Login Success...");
    await page.waitForTimeout(5000); // Give it time to load dashboard
    
    console.log("✅ Login Successful! Capturing Session...");
    const storageState = await context.storageState();
    
    console.log("\n👇 COPY THIS JSON 👇\n");
    console.log(JSON.stringify(storageState));
    console.log("\n👆 COPY THIS JSON 👆\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await browser.close();
    rl.close();
    process.exit(0);
  }
})();
