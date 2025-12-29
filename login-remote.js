const { chromium, devices } = require('playwright'); // Import devices
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  console.log("🚀 Launching Browser (Mobile Mode: iPhone 12)...");
  const browser = await chromium.launch({ headless: true });
  
  // 👇 TRICK: Emulate a real iPhone to bypass security
  const context = await browser.newContext({
    ...devices['iPhone 12'], 
    geolocation: { latitude: 20.5937, longitude: 78.9629 }, // India Coords
    permissions: ['geolocation'],
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata'
  });
  
  const page = await context.newPage();

  try {
    // 1. NAVIGATE
    console.log("🌍 Navigating to Wishlink Mobile...");
    await page.goto('https://creator.wishlink.com/welcome', { waitUntil: 'networkidle', timeout: 60000 });

    // 2. FORCE SELECT INDIA
    console.log("🔍 Locating Country Dropdown...");
    const countryBox = page.locator('.PhoneInputCountry').first();
    await countryBox.waitFor({ state: 'visible', timeout: 30000 });
    await countryBox.tap(); // Mobile uses "tap"
    
    console.log("🇮🇳 Selecting 'India'...");
    await page.waitForTimeout(1000);
    // Type India on virtual keyboard
    await page.keyboard.type('India');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Enter');
    
    // 3. VERIFY +91 (Strict Check)
    await page.waitForTimeout(1000);
    const phoneInput = page.locator('input[type="tel"]').first();
    const val = await phoneInput.inputValue();
    console.log(`ℹ️ Country Code Verified: ${val}`); // Should show +91

    // 4. ENTER NUMBER (9547131252)
    console.log("📱 Entering Number: 9547131252");
    await phoneInput.tap();
    // Type slowly like a human thumb
    await phoneInput.pressSequentially('9547131252', { delay: 200 });
    await page.waitForTimeout(2000); // Wait for validation

    // 5. GET OTP
    console.log("👆 Tapping 'Get OTP'...");
    const otpBtn = page.locator('button').filter({ hasText: /get otp|continue/i }).first();
    await otpBtn.tap();

    // 6. ENTER OTP
    console.log("\n📩 OTP Sent! (Hopefully)");
    const otp = await askQuestion("🔑 Enter 6-digit OTP: ");
    
    const otpInput = page.locator('input[type="number"], input[autocomplete="one-time-code"]').first();
    await otpInput.waitFor({ state: 'visible' });
    await otpInput.fill(otp);

    // 7. FINISH
    console.log("⏳ Verifying...");
    try {
        await page.waitForTimeout(1000);
        const verifyBtn = page.locator('button').filter({ hasText: /verify|submit/i }).first();
        if (await verifyBtn.isVisible()) await verifyBtn.tap();
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
  } finally {
    await browser.close();
    rl.close();
    process.exit(0);
  }
})();
