const fs = require("fs");
const { execSync } = require("child_process");

const { version } = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const out = `dist/no-kings-${version}.zip`;
const files = [
  "manifest.json",
  "background.js",
  "resolver.js",
  "data.js",
  "popup.html",
  "popup.js",
  "popup.css",
  "icons"
];

fs.mkdirSync("dist", { recursive: true });
try { fs.unlinkSync(out); } catch {}

execSync(`zip -r ${out} ${files.join(" ")} -x "*.DS_Store"`, { stdio: "inherit" });
console.log(`Created ${out} — upload this file to the Chrome Web Store.`);
