const { chromium } = require("playwright");
const fs = require("fs");

const PRODUCT_LINK = process.argv[2];
if (!PRODUCT_LINK) {
  console.error("❌ Product link missing");
  process.exit(1);
}

(async () => {
  // Launch Browser
  const browser = await chromium.launch({
    headless: true,
    channel: "chromium", // Kept as per your original file
  });

  const context = await browser.newContext({
    storageState: JSON.parse(process.env.WISHLINK_STORAGE),
    permissions: ["clipboard-read", "clipboard-write"],
  });

  const page = await context.newPage();

  try {
    // 1️⃣ Go directly to Create Wishlink page
    await page.goto("https://creator.wishlink.com/new-product", {
      waitUntil: "domcontentloaded",
    });

    // 2️⃣ Wait for input (SPA safe)
    const input = page.locator('input[placeholder*="product link"]');
    await input.waitFor({ timeout: 60000 });

    // 3️⃣ Fill product link
    await input.fill(PRODUCT_LINK);

    // 4️⃣ Click Create Wishlink
    await page.getByRole("button", { name: /create wishlink/i }).click();

    // 5️⃣ Wait for success screen
    await page.getByText(/congratulations/i, { timeout: 60000 });

    // 6️⃣ Click Share Wishlink
    await page.getByRole("button", { name: /share wishlink/i }).click();

    // 7️⃣ Clipboard auto-copy
    await page.waitForTimeout(2000);
    const wishlink = await page.evaluate(() => navigator.clipboard.readText());

    if (!wishlink || !wishlink.startsWith("http")) {
      throw new Error("❌ Wishlink not copied");
    }

    // 8️⃣ Save output
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

    console.log("✅ Wishlink created:", wishlink);

  } catch (error) {
    console.error("❌ Error during conversion:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
