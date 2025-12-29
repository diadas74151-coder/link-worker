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
    permissions: ["clipboard-read", "clipboard-write"], // Grant clipboard permissions
  });

  const page = await context.newPage();

  try {
    // 1️⃣ Go to Create Page
    console.log("Navigating to Wishlink...");
    await page.goto("https://creator.wishlink.com/new-product", {
      waitUntil: "domcontentloaded",
    });

    // 🔴 DEBUG: Check if we were redirected to login
    if (page.url().includes("login") || await page.getByText("Login to your account").isVisible()) {
      throw new Error("❌ Session Expired: The bot was redirected to the Login page. Please update your WISHLINK_STORAGE secret.");
    }

    // 2️⃣ Wait for Input (Case Insensitive Fix)
    // The placeholder is "PASTE YOUR PRODUCT LINK HERE", so we use a regex /.../i to match it
    const input = page.getByPlaceholder(/paste your product link/i);
    await input.waitFor({ state: "visible", timeout: 30000 });

    // 3️⃣ Fill Link
    console.log("Filling product link...");
    await input.fill(PRODUCT_LINK);

    // 4️⃣ Click Create Button
    console.log("Clicking Create...");
    await page.getByRole("button", { name: /create wishlink/i }).click();

    // 5️⃣ Wait for Success Modal ("Congratulations")
    console.log("Waiting for success...");
    await page.getByText(/congratulations/i, { timeout: 60000 }).waitFor();

    // 6️⃣ Click "Share Wishlink" (This triggers the auto-copy)
    console.log("Clicking Share to copy...");
    await page.getByRole("button", { name: /share wishlink/i }).click();

    // 7️⃣ Capture Clipboard
    // We wait a moment for the system to write to the clipboard
    await page.waitForTimeout(2000);
    const wishlink = await page.evaluate(() => navigator.clipboard.readText());

    if (!wishlink || !wishlink.startsWith("http")) {
      throw new Error(`❌ Clipboard empty or invalid. Got: "${wishlink}"`);
    }

    // 8️⃣ Save Output
    fs.writeFileSync(
      "wishlink.json",
      JSON.stringify(
        {
          input: PRODUCT_LINK,
          wishlink,
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
