
const test = require("node:test");
const assert = require("node:assert/strict");
const RobotWorld = require("../js/python/robot-world.js");
const RobotRender = require("../js/python/robot-render.js");

// First drive: the rover on the left of the top row, the rock three squares ahead.
const map = { cols: 6, rows: 3, robot: { x: 1, y: 3, dir: "E" }, items: { "4,3": 1 } };
const mars = RobotWorld.WORLDS.mars;

// How many times a piece of text appears in a longer text.
function count(text, piece) {
  return text.split(piece).length - 1;
}

// ---------- the picture ----------

test("the picture has 52 units for every square and an edge of 10 all round", () => {
  const svg = RobotRender.picture(RobotWorld.make(map), "mars");
  assert.ok(svg.includes('viewBox="0 0 332 176"'));   // 6 x 52 + 20 wide, 3 x 52 + 20 high
});

test("row 1 is at the bottom, so the top row of three is drawn at the top", () => {
  const svg = RobotRender.picture(RobotWorld.make(map), "mars");
  assert.ok(svg.includes('class="robot" transform="translate(36 36) rotate(0)"'));
});

test("the robot is turned the way it faces", () => {
  const world = RobotWorld.make(map);
  world.dir = "N";
  assert.ok(RobotRender.picture(world, "mars").includes("rotate(270)"));
});

test("a wall is stored on both of its squares but drawn once", () => {
  const world = RobotWorld.make({ cols: 3, rows: 2, robot: { x: 1, y: 1 }, walls: [[2, 1, "E"], [1, 1, "N"]] });
  assert.equal(Object.keys(world.walls).length, 4);
  assert.equal(count(RobotRender.picture(world, "mars"), 'class="wall"'), 2);
});

test("a stack shows its number and a single thing does not", () => {
  const world = RobotWorld.make({ cols: 2, rows: 1, robot: { x: 1, y: 1 }, items: { "1,1": 5, "2,1": 1 } });
  const svg = RobotRender.picture(world, "warehouse");
  assert.equal(count(svg, 'class="item"'), 2);
  assert.equal(count(svg, "<text"), 1);
  assert.ok(svg.includes(">5</text>"));
});

test("a goal picture can leave the robot out", () => {
  const svg = RobotRender.picture(RobotWorld.make(map), "mars", { showRobot: false });
  assert.equal(count(svg, 'class="robot"'), 0);
});

test("a crash is shown by a star as well as by a colour", () => {
  const world = RobotWorld.make(map);
  assert.equal(count(RobotRender.picture(world, "mars"), 'class="crash"'), 0);
  world.crashed = true;
  assert.equal(count(RobotRender.picture(world, "mars"), 'class="crash"'), 1);
});

test("each world has its own colours", () => {
  const world = RobotWorld.make(map);
  assert.ok(RobotRender.picture(world, "mars").includes('fill="#F2E1D2"'));
  assert.ok(RobotRender.picture(world, "ocean").includes('fill="#D7E8F0"'));
});

test("the picture has a name, and points to its description", () => {
  const svg = RobotRender.picture(RobotWorld.make(map), "mars", { label: "The world now", describedBy: "now-words" });
  assert.ok(svg.includes('role="img" aria-label="The world now" aria-describedby="now-words"'));
});

// ---------- the picture in words ----------

test("where() says the column, the row and the direction", () => {
  assert.equal(RobotRender.where(RobotWorld.make(map)), "column 1, row 3, facing east");
});

test("the description gives the size, the robot, the things and the walls", () => {
  assert.equal(RobotRender.describe(RobotWorld.make(map), mars),
    "The world is 6 squares wide and 3 squares high. " +
    "Rover BED-1 is in column 1, row 3, facing east. " +
    "There is 1 rock: column 4, row 3. " +
    "There are no walls inside the world.");
});

test("stacks and walls are listed from the bottom row up", () => {
  const world = RobotWorld.make({
    cols: 4, rows: 1, robot: { x: 1, y: 1, dir: "N" },
    items: { "4,1": 5, "2,1": 1 }, walls: [[3, 1, "W"]]
  });
  assert.equal(RobotRender.describe(world, RobotWorld.WORLDS.warehouse),
    "The world is 4 squares wide and 1 square high. " +
    "Robot LU-7 is in column 1, row 1, facing north. " +
    "There are 6 parcels: column 2, row 1; column 4, row 1 (5). " +
    "There is 1 wall inside the world: on the east side of column 2, row 1.");
});

test("a crashed robot is described as crashed", () => {
  const world = RobotWorld.make(map);
  world.crashed = true;
  assert.ok(RobotRender.describe(world, mars).includes("facing east. It has crashed."));
});

test("a goal can leave the square or the direction open", () => {
  const world = RobotWorld.make(map);
  assert.ok(RobotRender.describe(world, mars, { showRobot: false }).includes("Rover BED-1 can be on any square."));
  assert.ok(RobotRender.describe(world, mars, { anyDirection: true }).includes("Rover BED-1 is in column 1, row 3. It can face any way."));
});