const { chromium } = require("playwright");
const fs = require("fs");

const PRODUCT_LINK = process.argv[2];
if (!PRODUCT_LINK) {
  console.error("❌ Product link missing");
  process.exit(1);
}

// 👇 THIS USER AGENT MUST MATCH THE ONE WE USED LOCALLY
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  // 1. Load Session safely
  let storageState;
  try {
      if (!process.env.WISHLINK_STORAGE) throw new Error("Secret is empty");
      storageState = JSON.parse(process.env.WISHLINK_STORAGE);
  } catch(e) {
      console.error("❌ CRITICAL: WISHLINK_STORAGE secret is missing or invalid.");
      process.exit(1);
  }

  // 2. Create Context (Pretending to be your PC)
  const context = await browser.newContext({
    storageState: storageState,
    userAgent: USER_AGENT, // 👈 MATCHING THE SIGNATURE
    viewport: { width: 1280, height: 720 },
    permissions: ["clipboard-read", "clipboard-write"],
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to Wishlink...");
    // 3. Go to Create Page
    await page.goto("https://creator.wishlink.com/new-product", {
      waitUntil: "networkidle",
      timeout: 60000
    });

    // 🔴 CHECK: Did the session survive?
    const url = page.url();
    if (url.includes("/welcome") || url.includes("/login") || url.includes("signin")) {
      throw new Error("❌ SESSION EXPIRED: The bot was redirected to the Login page. Please generate a new WISHLINK_STORAGE json.");
    }
    
    console.log("✅ Session is Alive! Converting link...");

    // 4. Wait for Input
    const input = page.getByPlaceholder(/paste your product link/i);
    await input.waitFor({ state: "visible", timeout: 30000 });

    // 5. Fill Link
    console.log("Filling product link...");
    await input.fill(PRODUCT_LINK);

    // 6. Click Create Button
    console.log("Clicking Create...");
    await page.getByRole("button", { name: /create wishlink/i }).click();

    // 7. Wait for Success Modal
    console.log("Waiting for success...");
    const shareButton = page.getByRole("button", { name: /share wishlink/i });
    await shareButton.waitFor({ timeout: 60000 });

    // 8. Click Share (Triggers Auto-Copy)
    console.log("Clicking Share to trigger copy...");
    await shareButton.click();

    // 9. Read Clipboard
    await page.waitForTimeout(2000); 
    const wishlink = await page.evaluate(() => navigator.clipboard.readText());

    if (!wishlink || !wishlink.startsWith("http")) {
      throw new Error(`❌ Clipboard was empty or invalid. Got: "${wishlink}"`);
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
    console.error("❌ Error during conversion:", error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
