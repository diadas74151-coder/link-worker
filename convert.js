const { chromium } = require("playwright");
const fs = require("fs");

const PRODUCT_LINK = process.argv[2];
if (!PRODUCT_LINK) {
  console.error("❌ Product link missing");
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  // Load the session (Cookies + Local Storage)
  const context = await browser.newContext({
    storageState: JSON.parse(process.env.WISHLINK_STORAGE),
    permissions: ["clipboard-read", "clipboard-write"],
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to Wishlink...");
    
    // 1️⃣ Go to Create Page
    // We wait for 'networkidle' to ensure any redirects (like login) happen before we check
    await page.goto("https://creator.wishlink.com/new-product", {
      waitUntil: "networkidle",
      timeout: 60000
    });

    // 🔴 CHECK: Did we get redirected to Login?
    if (page.url().includes("/login") || page.url().includes("signin")) {
      throw new Error("❌ SESSION EXPIRED: The bot was redirected to the Login page. Please update WISHLINK_STORAGE with a new JSON.");
    }

    // 2️⃣ Wait for Input (FIXED: Case Insensitive Regex)
    // Matches "PASTE YOUR PRODUCT LINK HERE" regardless of uppercase/lowercase
    const input = page.getByPlaceholder(/paste your product link/i);
    await input.waitFor({ state: "visible", timeout: 30000 });

    // 3️⃣ Fill Link
    console.log("Filling product link...");
    await input.fill(PRODUCT_LINK);

    // 4️⃣ Click Create Button
    console.log("Clicking Create...");
    await page.getByRole("button", { name: /create wishlink/i }).click();

    // 5️⃣ Wait for Success Modal
    console.log("Waiting for success...");
    // We wait for the 'Share Wishlink' button to appear, which confirms the product was created
    const shareButton = page.getByRole("button", { name: /share wishlink/i });
    await shareButton.waitFor({ timeout: 60000 });

    // 6️⃣ Click Share (Triggers Auto-Copy)
    console.log("Clicking Share to trigger copy...");
    await shareButton.click();

    // 7️⃣ Read Clipboard
    await page.waitForTimeout(2000); // Wait for system clipboard to update
    const wishlink = await page.evaluate(() => navigator.clipboard.readText());

    if (!wishlink || !wishlink.startsWith("http")) {
      throw new Error(`❌ Clipboard was empty or invalid. Got: "${wishlink}"`);
    }

    // 8️⃣ Save Output
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
