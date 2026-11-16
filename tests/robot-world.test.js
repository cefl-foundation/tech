
const test = require("node:test");
const assert = require("node:assert/strict");
const MiniPy = require("../js/python/minipy.js");
const RobotWorld = require("../js/python/robot-world.js");

// First drive: the rover starts at the left of the top row, facing east.
// The rock is three squares ahead.
const task = {
  world: "mars",
  map: { cols: 6, rows: 3, robot: { x: 1, y: 3, dir: "E" }, items: { "4,3": 1 } },
  goal: { items: {}, robot: { x: 4, y: 3 } }
};
const mars = RobotWorld.WORLDS.mars;

// Give one command, or ask one sensor, the way MiniPy does:
// no arguments, and the number of the line it was called on.
function call(world, name, line = 1) {
  return RobotWorld.builtins(world, mars)[name].fn([], {}, line);
}

// Run a whole robot program and give back the world it leaves behind.
function runRobot(code) {
  const world = RobotWorld.make(task.map);
  const commands = RobotWorld.builtins(world, RobotWorld.WORLDS[task.world]);
  const runner = new MiniPy.Runner(code, { builtins: commands });
  for (const step of runner.run()) { /* one robot command per step */ }
  return world;
}

// ---------- making a world ----------

test("a world is a copy: changing it leaves the task's map as it was", () => {
  const world = RobotWorld.make(task.map);
  call(world, "move");
  world.items["1,1"] = 9;
  assert.equal(task.map.robot.x, 1);
  assert.deepEqual(task.map.items, { "4,3": 1 });
});

test("a map that names no direction starts the robot facing east", () => {
  const world = RobotWorld.make({ cols: 2, rows: 1, robot: { x: 1, y: 1 } });
  assert.equal(world.dir, "E");
});

// ---------- commands ----------

test("move() takes the robot one square the way it is facing", () => {
  const world = RobotWorld.make(task.map);
  call(world, "move");
  assert.deepEqual([world.x, world.y], [2, 3]);
  call(world, "turn_left");
  call(world, "turn_left");
  call(world, "turn_left");   // three left turns: the rover now faces south
  call(world, "move");
  assert.deepEqual([world.x, world.y], [2, 2]);
});

test("four left turns go east, north, west, south and back to east", () => {
  const world = RobotWorld.make(task.map);
  const seen = [];
  for (let i = 0; i < 4; i++) {
    call(world, "turn_left");
    seen.push(world.dir);
  }
  assert.deepEqual(seen, ["N", "W", "S", "E"]);
});

test("the edge of the world stops the robot and marks it as crashed", () => {
  const world = RobotWorld.make(task.map);
  call(world, "turn_left");   // facing north, on the top row
  assert.throws(() => call(world, "move", 8), (error) => {
    return error instanceof RobotWorld.RobotError && error.line === 8 && error.msg.includes("crashed");
  });
  assert.equal(world.crashed, true);
  assert.deepEqual([world.x, world.y], [1, 3]);   // it did not move
});

test("a wall blocks the way from both sides", () => {
  const map = { cols: 3, rows: 1, robot: { x: 2, y: 1, dir: "E" }, walls: [[2, 1, "E"]] };
  const west = RobotWorld.make(map);              // on square 2, looking east at the wall
  assert.equal(call(west, "front_is_clear"), false);

  const east = RobotWorld.make(map);
  east.x = 3;
  east.dir = "W";                                 // on square 3, looking west at the same wall
  assert.equal(call(east, "front_is_blocked"), true);
});

test("picking up and putting down change the number on the square", () => {
  const world = RobotWorld.make({ cols: 2, rows: 1, robot: { x: 1, y: 1 }, items: {} });
  call(world, "put_rock");
  call(world, "put_rock");
  assert.equal(world.items["1,1"], 2);
  call(world, "pick_rock");
  call(world, "pick_rock");
  assert.deepEqual(world.items, {});   // an empty square is not listed at all
  assert.equal(world.bag, 2);
});

test("picking up from an empty square is an error that names the sensor to use", () => {
  const world = RobotWorld.make(task.map);
  assert.throws(() => call(world, "pick_rock", 9), (error) => {
    return error instanceof RobotWorld.RobotError && error.line === 9 && error.msg.includes("rock_present()");
  });
  assert.equal(world.crashed, false);
});

test("each world has its own names for the same four commands", () => {
  const world = RobotWorld.make(task.map);
  const inWarehouse = Object.keys(RobotWorld.builtins(world, RobotWorld.WORLDS.warehouse));
  assert.ok(inWarehouse.includes("pick_parcel"));
  assert.ok(inWarehouse.includes("no_parcel_present"));
  assert.ok(!inWarehouse.includes("pick_rock"));
});

// ---------- sensors ----------

test("the sensors look ahead, to the left and to the right", () => {
  // Bottom left corner, facing east: open ahead, open to the left
  // (north), and the edge of the world to the right (south).
  const world = RobotWorld.make({ cols: 3, rows: 3, robot: { x: 1, y: 1, dir: "E" } });
  assert.equal(call(world, "front_is_clear"), true);
  assert.equal(call(world, "left_is_clear"), true);
  assert.equal(call(world, "right_is_blocked"), true);
});

test("a sensor answers True or False, also for a stack of five", () => {
  const world = RobotWorld.make({ cols: 1, rows: 1, robot: { x: 1, y: 1 }, items: { "1,1": 5 } });
  assert.equal(call(world, "rock_present"), true);
  assert.equal(call(world, "no_rock_present"), false);
  assert.equal(call(world, "facing_east"), true);
  assert.equal(call(world, "not_facing_east"), false);
});

// ---------- the goal ----------

test("checkGoal answers null when the world is as the goal describes it", () => {
  const world = RobotWorld.make(task.map);
  world.x = 4;
  world.items = {};
  assert.equal(RobotWorld.checkGoal(world, task), null);
});

test("the wrong square is reported in a sentence", () => {
  const world = RobotWorld.make(task.map);
  world.items = {};
  assert.equal(RobotWorld.checkGoal(world, task),
    "Rover BED-1 finished on the wrong square. Compare its position with the goal picture.");
});

test("things in the wrong place are reported before the robot's square", () => {
  const corners = { world: "warehouse", goal: { items: { "1,1": 5 }, robot: { x: 1, y: 1 } } };
  const world = RobotWorld.make({ cols: 4, rows: 4, robot: { x: 3, y: 3 }, items: { "1,1": 4 } });
  assert.equal(RobotWorld.checkGoal(world, corners), "The parcels are not where the goal picture shows them.");
});

test("the direction counts only when the goal names one", () => {
  const world = RobotWorld.make(task.map);
  world.x = 4;
  world.items = {};
  world.dir = "S";
  assert.equal(RobotWorld.checkGoal(world, task), null);

  const strict = { world: "mars", goal: { items: {}, robot: { x: 4, y: 3, dir: "E" } } };
  assert.equal(RobotWorld.checkGoal(world, strict), "Rover BED-1 is on the right square but facing the wrong way.");
});

test("the goal world has the goal's things, and the robot on the goal square", () => {
  const goal = RobotWorld.goalWorld(task);
  assert.deepEqual(goal.items, {});
  assert.deepEqual([goal.x, goal.y, goal.dir], [4, 3, "E"]);
  assert.equal(RobotWorld.checkGoal(goal, task), null);
});

// ---------- whole programs, run by MiniPy ----------

test("a correct program reaches the goal", () => {
  const world = runRobot("def main():\n    move()\n    move()\n    move()\n    pick_rock()\n\nmain()");
  assert.equal(RobotWorld.checkGoal(world, task), null);
});

test("leaving the rock behind is reported in a sentence", () => {
  const world = runRobot("def main():\n    move()\n    move()\n    move()\n\nmain()");
  assert.equal(RobotWorld.checkGoal(world, task), "There is a rock on a square that should be empty in the goal.");
});

test("driving off the map stops the program with a robot error", () => {
  assert.throws(() => runRobot("def main():\n    while True:\n        move()\n\nmain()"), (error) => {
    return error instanceof RobotWorld.RobotError && error.line === 3;
  });
});

test("a command with something in its brackets is a TypeError", () => {
  assert.throws(() => runRobot("def main():\n    move(3)\n\nmain()"), (error) => error.kind === "TypeError");
});

test("MiniPy pauses once for every command and never for a sensor", () => {
  const world = RobotWorld.make(task.map);
  const commands = RobotWorld.builtins(world, mars);
  const code = "def main():\n    while no_rock_present():\n        move()\n    pick_rock()\n\nmain()";
  const runner = new MiniPy.Runner(code, { builtins: commands });
  let pauses = 0;
  for (const step of runner.run()) { pauses += 1; }
  assert.equal(pauses, 4);   // three moves and one pick; four sensor calls did not count
});