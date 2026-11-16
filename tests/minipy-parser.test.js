
const test = require("node:test");
const assert = require("node:assert/strict");
const MiniPy = require("../js/python/minipy.js");

// The tree of a program. A Runner reads its program into a tree as soon as
// it is made and keeps the tree in .ast. Nothing has run yet.
function tree(code) {
  return new MiniPy.Runner(code).ast;
}

// ---------- statements ----------

test("a call on a line of its own: the whole node", () => {
  assert.deepEqual(tree("move()"), [
    { k: "expr", expr: { k: "call", name: "move", args: [], kwargs: {}, line: 1 }, line: 1 }
  ]);
});

test("if with an indented line: the line sits inside the if", () => {
  const code = [
    "if front_is_clear():",
    "    move()"
  ].join("\n");
  const [node] = tree(code);
  assert.equal(node.k, "if");
  assert.equal(node.branches.length, 1);
  assert.equal(node.branches[0].test.name, "front_is_clear");   // the test
  assert.equal(node.branches[0].body.length, 1);                // its block: one line
  assert.equal(node.branches[0].body[0].expr.name, "move");
  assert.equal(node.orelse, null);                              // no else
});

test("if, elif and else: two tests, three blocks", () => {
  const code = [
    "if mark >= 70:",
    '    print("Distinction")',
    "elif mark >= 40:",
    '    print("Pass")',
    "else:",
    '    print("Fail")'
  ].join("\n");
  const [node] = tree(code);
  assert.equal(node.branches.length, 2);          // the if and the elif
  assert.equal(node.branches[0].test.op, ">=");
  assert.equal(node.branches[1].test.r.v, 40);
  assert.equal(node.orelse.length, 1);            // the else block
});

test("while keeps its test and its block", () => {
  const code = [
    "while front_is_clear():",
    "    move()"
  ].join("\n");
  const [node] = tree(code);
  assert.equal(node.k, "while");
  assert.equal(node.test.name, "front_is_clear");
  assert.equal(node.body[0].expr.name, "move");
});

test("for ... in range(): the variable, what to go through, the block", () => {
  const code = [
    "for i in range(4):",
    "    move()"
  ].join("\n");
  const [node] = tree(code);
  assert.equal(node.k, "for");
  assert.equal(node.v, "i");
  assert.equal(node.iter.name, "range");
  assert.equal(node.iter.args[0].v, 4);
  assert.equal(node.body.length, 1);
});

test("def with parameters: the name, the parameters, the block", () => {
  const code = [
    "def area(width, height):",
    "    return width * height"
  ].join("\n");
  const [node] = tree(code);
  assert.equal(node.k, "def");
  assert.equal(node.name, "area");
  assert.deepEqual(node.params, ["width", "height"]);
  assert.equal(node.body[0].k, "return");
});

test("an assignment keeps the name, the sign and the value", () => {
  const [node] = tree("steps += 1");
  assert.equal(node.k, "assign");
  assert.equal(node.name, "steps");
  assert.equal(node.op, "+=");
  assert.equal(node.value.v, 1);
});

// ---------- values ----------

test("multiplication is read before addition", () => {
  // 2 + 3 * 4: the + is at the top, and 3 * 4 is its right side.
  const value = tree("total = 2 + 3 * 4")[0].value;
  assert.equal(value.op, "+");
  assert.equal(value.l.v, 2);
  assert.equal(value.r.op, "*");
});

test("brackets change which symbol is at the top", () => {
  // (2 + 3) * 4: the * is at the top, and 2 + 3 is its left side.
  const value = tree("total = (2 + 3) * 4")[0].value;
  assert.equal(value.op, "*");
  assert.equal(value.l.op, "+");
});

test("and is read before or", () => {
  // a or b and c: the or is at the top, and b and c is its right side.
  const value = tree("ok = a or b and c")[0].value;
  assert.equal(value.op, "or");
  assert.equal(value.r.op, "and");
});

test("a number with a decimal point becomes a PyFloat", () => {
  assert.equal(tree("x = 2")[0].value.v, 2);
  assert.deepEqual(tree("x = 2.5")[0].value.v, new MiniPy.PyFloat(2.5));
});

// ---------- mistakes ----------

test("a missing colon is a SyntaxError with its line number", () => {
  const code = [
    "def main():",
    "    if front_is_clear()",
    "        move()"
  ].join("\n");
  const error = MiniPy.check(code);
  assert.equal(error.kind, "SyntaxError");
  assert.equal(error.line, 2);
  assert.equal(error.msg, 'expected a colon ":" at the end of this line but found the end of the line');
});

test("a single = where a comparison belongs gets its own message", () => {
  const error = MiniPy.check("if steps = 3:\n    move()");
  assert.equal(error.kind, "SyntaxError");
  assert.equal(error.line, 1);
  assert.ok(error.msg.includes('use "=="'), error.msg);
});

test("a colon with nothing indented under it is an IndentationError", () => {
  const error = MiniPy.check("def main():\nmove()");
  assert.equal(error.kind, "IndentationError");
  assert.equal(error.line, 2);
});

test("check() gives null when the parser finds no mistake", () => {
  assert.equal(MiniPy.check("def main():\n    move()\n\nmain()"), null);
});