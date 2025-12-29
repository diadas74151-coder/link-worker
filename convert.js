const fs = require("fs");

const inputLink = process.argv[2];

// 🔁 TODO: replace this with real Wishlink logic later
const convertedLink = "https://wishlink.com/demo123";

const output = {
  input: inputLink,
  result: convertedLink,
  time: new Date().toISOString()
};

// ✅ Write output to file
fs.writeFileSync("result.json", JSON.stringify(output, null, 2));

console.log("✅ Conversion done");
console.log("RESULT:", convertedLink);
