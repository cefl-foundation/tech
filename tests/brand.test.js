
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
// samples/ and exercises/ are copied websites with their own colours;
// tests/ is skipped because this file names the old colours.
const SKIP = [".git", "node_modules", "samples", "exercises", "tests"];

// Every file under ROOT whose name ends with one of the endings.
function files(endings, dir = ROOT) {
  let found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found = found.concat(files(endings, full));
    else if (endings.some((ending) => entry.name.endsWith(ending))) found.push(full);
  }
  return found;
}
const name = (file) => path.relative(ROOT, file);
const read = (file) => fs.readFileSync(file, "utf8");

test("base.css has the brand guide's colours", () => {
  const css = read(path.join(ROOT, "css", "base.css"));
  const wanted = { "--red": "#C8102E", "--maroon": "#800029", "--uob-green": "#64A70B" };
  for (const [variable, colour] of Object.entries(wanted)) {
    const rule = new RegExp(variable + ":\\s*" + colour, "i");
    assert.ok(rule.test(css), `css/base.css should say ${variable}: ${colour}`);
  }
});

test("no old colour and no pale red is left", () => {
  // The old site's reds, its green, its "passed" and "warning" colours, and pale reds.
  const banned = ["#D0112B", "#8A0A2E", "#78BE20", "#0E7A3E", "#B8860B",
                  "#FBEAEC", "#F6DFE2", "#FFD6DC", "#F0B9BC", "#FF6B7A"];
  for (const file of files([".css", ".html", ".js"])) {
    const text = read(file).toUpperCase();
    for (const colour of banned) {
      assert.ok(!text.includes(colour), `${name(file)} still has ${colour}`);
    }
  }
});

test("the three font files are in fonts/ and nothing comes from Google", () => {
  for (const font of ["BebasNeue-Regular.ttf", "lte50138.ttf", "lte50140.ttf"]) {
    assert.ok(fs.existsSync(path.join(ROOT, "fonts", font)), `fonts/${font} is missing`);
  }
  for (const file of files([".css", ".html"])) {
    const fromGoogle = /fonts\.(googleapis|gstatic)\.com/.test(read(file));
    assert.ok(!fromGoogle, `${name(file)} loads a font from Google`);
  }
});

test("every page has one h1 at most, and every picture has alt text", () => {
  for (const file of files([".html", ".js"])) {
    const text = read(file);
    if (file.endsWith(".html")) {
      const count = (text.match(/<h1[\s>]/g) || []).length;
      assert.ok(count <= 1, `${name(file)} has ${count} h1 headings`);
    }
    for (const tag of text.match(/<img\b[^>]*>/g) || []) {
      assert.ok(/\balt=/.test(tag), `${name(file)} has a picture without alt text: ${tag.slice(0, 60)}`);
    }
  }
});