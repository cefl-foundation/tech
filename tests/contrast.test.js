
const test = require("node:test");
const assert = require("node:assert/strict");
const Contrast = require("../js/web/contrast.js");

const WHITE = [255, 255, 255, 1];
const BLACK = [0, 0, 0, 1];

test("black on white is 21, the highest ratio there is", () => {
  assert.equal(Contrast.ratio(BLACK, WHITE).toFixed(2), "21.00");
});

test("a colour against itself is 1, the lowest", () => {
  assert.equal(Contrast.ratio([200, 16, 46, 1], [200, 16, 46, 1]), 1);
});

test("it does not matter which colour comes first", () => {
  assert.equal(Contrast.ratio(WHITE, BLACK), Contrast.ratio(BLACK, WHITE));
});

test("grey #767676 on white just passes 4.5, and #777777 just fails", () => {
  assert.ok(Contrast.ratio([118, 118, 118, 1], WHITE) >= 4.5);
  assert.ok(Contrast.ratio([119, 119, 119, 1], WHITE) < 4.5);
});

test("white on the brand red #C8102E is 5.9 to 1", () => {
  assert.equal(Contrast.ratio(WHITE, [200, 16, 46, 1]).toFixed(1), "5.9");
});

test("reads the colours the browser gives", () => {
  assert.deepEqual(Contrast.parse("rgb(200, 16, 46)"), [200, 16, 46, 1]);
  assert.deepEqual(Contrast.parse("rgba(0, 0, 0, 0.5)"), [0, 0, 0, 0.5]);
});

test("anything else gives null", () => {
  assert.equal(Contrast.parse("red"), null);
  assert.equal(Contrast.parse(""), null);
});

test("half see-through black in front of white looks mid grey", () => {
  assert.deepEqual(Contrast.blend([0, 0, 0, 0.5], WHITE), [128, 128, 128, 1]);
});