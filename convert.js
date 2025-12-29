const fs = require("fs");

const inputLink = process.argv[2];

const convertedLink = `https://wishlink.in/demo-converted?src=${encodeURIComponent(inputLink)}`;

// Write output to file for GitHub Actions
fs.writeFileSync("output.txt", convertedLink);

console.log("CONVERTED_LINK:", convertedLink);
