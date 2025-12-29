const { chromium } = require('playwright');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  console.log("🚀 Launching Browser...");
  // Launch headless because we are on a server
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to Welcome Page
    console.log("🌍 Navigating to Wishlink...");
    await page.goto('https://creator.wishlink.com/welcome', { waitUntil: 'networkidle', timeout: 60000 });

    // 2. Wait for Phone Input to be ready
    console.log("⏳ Waiting for page load...");
    const phoneInput = page.locator('input[placeholder*="Phone"], input[type="tel"]');
    await phoneInput.waitFor({ state: 'visible', timeout: 60000 });

    // 3. Ensure India (+91) is selected
    // We try to find the dropdown toggle
    const countryDropdown = page.locator('.flag-dropdown, .react-tel-input .selected-flag');
    
    if (await countryDropdown.isVisible()) {
        console.log("🇮🇳 Checking Country Code...");
        await countryDropdown.click(); // Open dropdown
        
        // Find India in the list
        const indiaOption = page.locator('li.country').filter({ hasText: 'India' });
        if (await indiaOption.isVisible()) {
            await indiaOption.click();
            console.log("✅ Selected India (+91)");
        } else {
            // If we can't click it, it might already be selected or hidden, just try typing
            console.log("⚠️ Could not click India option, proceeding with default...");
        }
        // Click body to close dropdown if open
        await page.locator('body').click();
    }

    // 4. Enter Phone Number
    const phone = await askQuestion("\n📱 Enter Phone Number (10 digits): ");
    await phoneInput.fill(phone);

    // 5. Click "Get OTP"
    console.log("👆 Clicking 'Get OTP'...");
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.click();

    // 6. Enter OTP
    console.log("\n📩 OTP Sent! Check your phone.");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    // Find OTP input (Wait for it to appear)
    const otpInput = page.locator('input[autocomplete="one-time-code"], input[type="number"]').first();
    await otpInput.waitFor({ state: 'visible', timeout: 30000 });
    await otpInput.fill(otp);

    // 7. Verify (if button exists)
    console.log("⏳ Verifying...");
    try {
        // Wait a moment for auto-submit
        await page.waitForTimeout(2000);
        const verifyBtn = page.locator('button').filter({ hasText: /verify|submit/i }).first();
        if (await verifyBtn.isVisible()) {
            await verifyBtn.click();
        }
    } catch (e) {}

    // 8. Wait for Login Success
    console.log("⏳ Waiting for Dashboard...");
    // Wait for URL to change or dashboard element
    await page.waitForTimeout(5000);
    
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
