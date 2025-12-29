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

  const context = await browser.newContext({
    storageState: JSON.parse(process.env.WISHLINK_STORAGE),
    permissions: ["clipboard-read", "clipboard-write"], // Required for auto-copy
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to Wishlink...");
    // 1️⃣ Go to Create Page and wait for network to be idle (handles redirects)
    await page.goto("https://creator.wishlink.com/new-product", {
      waitUntil: "networkidle",
      timeout: 60000
    });

    // 🔴 CHECK: Are we on the login page?
    if (page.url().includes("/login") || page.url().includes("signin")) {
      throw new Error("❌ SESSION EXPIRED: The bot was redirected to the Login page. Please generate a new WISHLINK_STORAGE json.");
    }

    // 2️⃣ Wait for Input
    // Matches "PASTE YOUR PRODUCT LINK HERE" (Case Insensitive)
    const input = page.getByPlaceholder(/paste your product link/i);
    await input.waitFor({ state: "visible", timeout: 30000 });

    // 3️⃣ Fill Link
    console.log("Filling product link...");
    await input.fill(PRODUCT_LINK);

    // 4️⃣ Click Create Button
    console.log("Clicking Create...");
    await page.getByRole("button", { name: /create wishlink/i }).click();

    // 5️⃣ Wait for Success & Share
    console.log("Waiting for completion...");
    // Wait for the 'Congratulations' text or the 'Share Wishlink' button
    await page.getByRole("button", { name: /share wishlink/i }).waitFor({ timeout: 60000 });

    // 6️⃣ Click Share (Triggers Auto-Copy)
    console.log("Clicking Share to trigger copy...");
    await page.getByRole("button", { name: /share wishlink/i }).click();

    // 7️⃣ Read Clipboard
    // Give the browser a second to update the clipboard
    await page.waitForTimeout(2000);
    const wishlink = await page.evaluate(() => navigator.clipboard.readText());

    if (!wishlink || !wishlink.startsWith("http")) {
      // Fallback: Sometimes the link is shown on screen, we can try to grab it if clipboard fails
      throw new Error(`❌ Clipboard was empty. Got: "${wishlink}"`);
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
    console.error("Current Page URL:", page.url());
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
