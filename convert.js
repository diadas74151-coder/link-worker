const { chromium } = require("playwright");
const fs = require("fs");

const PRODUCT_LINK = process.argv[2];
if (!PRODUCT_LINK) {
  console.error("❌ Product link missing");
  process.exit(1);
}

// 👇 SELECTED PROXY FROM YOUR LIST (Fastest: 76ms)
const PROXY_SERVER = "http://108.165.152.35:80"; 

// 👇 STRICT USER AGENT
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

(async () => {
  console.log(`🚀 Launching Browser via Proxy: ${PROXY_SERVER}...`);

  const browser = await chromium.launch({
    headless: true,
    proxy: { server: PROXY_SERVER }
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

  const context = await browser.newContext({
    storageState: storageState,
    userAgent: USER_AGENT,
    viewport: { width: 1280, height: 720 },
    permissions: ["clipboard-read", "clipboard-write"],
    navigationTimeout: 120000, 
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to Wishlink...");
    
    // 2. Go to Create Page
    await page.goto("https://creator.wishlink.com/new-product", {
      waitUntil: "domcontentloaded", 
      timeout: 120000
    });

    // 🔴 CHECK SESSION
    const url = page.url();
    if (url.includes("/welcome") || url.includes("/login")) {
      throw new Error("❌ SESSION EXPIRED: The proxy IP didn't work. Try the next one in the list.");
    }
    
    console.log("✅ IP Check Passed! Session is Alive.");

    // 3. Input Link
    const input = page.getByPlaceholder(/paste your product link/i);
    await input.waitFor({ state: "visible", timeout: 60000 });
    await input.fill(PRODUCT_LINK);

    // 4. Create
    console.log("Clicking Create...");
    await page.getByRole("button", { name: /create wishlink/i }).click();

    // 5. Wait for Share
    console.log("Waiting for success...");
    const shareButton = page.getByRole("button", { name: /share wishlink/i });
    await shareButton.waitFor({ timeout: 120000 });
    await shareButton.click();

    // 6. Copy
    await page.waitForTimeout(2000); 
    const wishlink = await page.evaluate(() => navigator.clipboard.readText());

    if (!wishlink || !wishlink.startsWith("http")) {
      throw new Error(`❌ Clipboard empty. Got: "${wishlink}"`);
    }

    // 7. Save
    fs.writeFileSync(
      "wishlink.json",
      JSON.stringify({ input: PRODUCT_LINK, wishlink: wishlink }, null, 2)
    );

    console.log("✅ Wishlink created successfully:", wishlink);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
