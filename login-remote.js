const { chromium } = require('playwright');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

(async () => {
  console.log("\n🚀 Launching Browser on GitHub Server...");
  
  // We launch headless because the server has no screen
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log("🌍 Navigating to Wishlink...");
    await page.goto('https://creator.wishlink.com', { waitUntil: 'networkidle' });

    // 1️⃣ Enter Mobile Number
    console.log("👉 Page Loaded.");
    // Wait for the input to appear
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="Mobile"], input[placeholder*="Phone"]').first();
    await phoneInput.waitFor({ state: 'visible', timeout: 15000 });
    
    const phone = await askQuestion("\n📱 Enter your Mobile Number (e.g. +919999999999): ");
    await phoneInput.fill(phone);

    // 2️⃣ Click Continue
    console.log("👆 Clicking Continue...");
    const continueBtn = page.locator('button', { hasText: /continue|get otp|proceed/i }).first();
    await continueBtn.click();

    // 3️⃣ Enter OTP
    console.log("\n📩 OTP Sent! Check your phone.");
    const otp = await askQuestion("🔑 Enter the 6-digit OTP: ");
    
    // Find OTP input (generic selector that works on most sites)
    const otpInput = page.locator('input[autocomplete="one-time-code"], input[aria-label*="OTP"], input[type="number"]').first();
    await otpInput.fill(otp);

    // Click Verify if needed (sometimes it auto-submits)
    try {
        const verifyBtn = page.locator('button', { hasText: /verify|login|submit/i }).first();
        if (await verifyBtn.isVisible()) {
            await verifyBtn.click();
        }
    } catch (e) {}

    console.log("⏳ Waiting for Dashboard...");
    // Wait until we are logged in (URL changes to /new-product or dashboard)
    await page.waitForTimeout(5000); 
    
    console.log("✅ Login Successful! Capturing Session...");

    // 4️⃣ Output the JSON
    const storageState = await context.storageState();
    
    console.log("\n👇 COPY THE JSON BELOW THIS LINE 👇\n");
    console.log(JSON.stringify(storageState));
    console.log("\n👆 COPY THE JSON ABOVE THIS LINE 👆\n");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await browser.close();
    rl.close();
    process.exit(0);
  }
})();
