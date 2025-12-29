const { chromium } = require("playwright");
const fs = require("fs");

const PRODUCT_LINK = process.argv[2];
if (!PRODUCT_LINK) {
  console.error("❌ Product link missing");
  process.exit(1);
}

// 👇 PROXY SETTING (From your list)
// If this fails later, just change the IP:PORT here to another one from your list.
const PROXY_SERVER = "http://27.34.242.98:80"; 

// 👇 STRICT USER AGENT (Must match what you used to save the session)
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

(async () => {
  console.log(`🚀 Launching Browser via Proxy: ${PROXY_SERVER}...`);

  const browser = await chromium.launch({
    headless: true,
    proxy: { server: PROXY_SERVER } // 👈 Forces traffic through India
  });

  // 1. Load Session
  let storageState;
  try {
      if (!process.env.WISHLINK_STORAGE) throw new Error("Secret is empty");
      storageState = JSON.parse(process.env.WISHLINK_STORAGE);
  } catch(e) {
      console.error("❌ CRITICAL: WISHLINK_STORAGE secret is missing.");
      process.exit(1);
  }

  // 2. Create Context (Pretending to be your PC + Indian IP)
  const context = await browser.newContext({
    storageState: storageState,
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 720 },
    permissions: ["clipboard-read", "clipboard-write"],
    // Increase timeout for navigation because proxies are slow
    navigationTimeout: 90000, 
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to Wishlink...");
    
    // 3. Go to Create Page
    // We increase timeout to 90s because free proxies can be slow
    await page.goto("https://creator.wishlink.com/new-product", {
      waitUntil: "domcontentloaded", // Faster than networkidle
      timeout: 90000
    });

    // 🔴 CHECK: Did the session survive?
    const url = page.url();
    if (url.includes("/welcome") || url.includes("/login")) {
      throw new Error("❌ SESSION EXPIRED: The proxy didn't fool them, or the session is dead.");
    }
    
    console.log("✅ IP Check Passed! Session is Alive.");

    // 4. Wait for Input
    const input = page.getByPlaceholder(/paste your product link/i);
    await input.waitFor({ state: "visible", timeout: 60000 });

    // 5. Fill Link
    console.log("Filling product link...");
    await input.fill(PRODUCT_LINK);

    // 6. Click Create Button
    console.log("Clicking Create...");
    await page.getByRole("button", { name: /create wishlink/i }).click();

    // 7. Wait for Success Modal
    console.log("Waiting for success...");
    const shareButton = page.getByRole("button", { name: /share wishlink/i });
    await shareButton.waitFor({ timeout: 90000 });

    // 8. Click Share (Triggers Auto-Copy)
    console.log("Clicking Share to trigger copy...");
    await shareButton.click();

    // 9. Read Clipboard
    await page.waitForTimeout(2000); 
    const wishlink = await page.evaluate(() => navigator.clipboard.readText());

    if (!wishlink || !wishlink.startsWith("http")) {
      throw new Error(`❌ Clipboard was empty. Got: "${wishlink}"`);
    }

    // 10. Save Output
    fs.writeFileSync(
      "wishlink.json",
      JSON.stringify(
        {
          input: PRODUCT_LINK,
          wishlink: wishlink,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    console.log("✅ Wishlink created successfully:", wishlink);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
