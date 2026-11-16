
const RobotWorld = (function () {
  "use strict";

  // ---------- the three worlds ----------

  // The rules are the same in every world. Only the words differ: the
  // robot's name, the thing it carries, and the names of four commands.
  const WORLDS = {
    mars: {
      robotName: "Rover BED-1", item: "rock", items: "rocks",
      cmds: { pick: "pick_rock", put: "put_rock", present: "rock_present", absent: "no_rock_present" }
    },
    warehouse: {
      robotName: "Robot LU-7", item: "parcel", items: "parcels",
      cmds: { pick: "pick_parcel", put: "put_parcel", present: "parcel_present", absent: "no_parcel_present" }
    },
    ocean: {
      robotName: "Drone TIDE-3", item: "bottle", items: "bottles",
      cmds: { pick: "pick_bottle", put: "put_bottle", present: "bottle_present", absent: "no_bottle_present" }
    }
  };

  // ---------- directions ----------

  // One step in each direction, as [columns, rows]. North is up the
  // picture, so a step north is one row more.
  const DIRS = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] };

  // The direction after a turn to the left, after a turn to the right,
  // and the one straight behind.
  const LEFT = { N: "W", W: "S", S: "E", E: "N" };
  const RIGHT = { N: "E", E: "S", S: "W", W: "N" };
  const OPPOSITE = { N: "S", S: "N", E: "W", W: "E" };

  // ---------- errors ----------

  // What can go wrong in a robot world: a crash into a wall, or picking
  // up something that is not there. msg is a sentence for the student.
  // line is the line of the program that gave the command.
  function RobotError(msg, line) {
    this.msg = msg;
    this.line = line;
  }
  RobotError.prototype.toString = function () {
    return this.msg;
  };

  // ---------- making a world ----------

  // Make a world from a task's map. The map itself is never changed, so
  // every run can start again from a fresh copy.
  function makeWorld(map) {
    const world = {
      cols: map.cols,
      rows: map.rows,
      x: map.robot.x,              // the robot's column
      y: map.robot.y,              // the robot's row
      dir: map.robot.dir || "E",   // the way it faces: "N", "E", "S" or "W"
      items: {},                   // how many things lie on a square: { "4,3": 1 }
      walls: {},                   // the blocked sides of squares: { "2,2,E": true }
      bag: 0,                      // how many things the robot has picked up
      crashed: false
    };
    for (const square in (map.items || {})) {
      world.items[square] = map.items[square];
    }
    for (const wall of (map.walls || [])) {
      addWall(world, wall[0], wall[1], wall[2]);
    }
    return world;
  }

  // A wall on one side of a square. The same wall is also on the opposite
  // side of the square next door, so it is stored twice: once for each
  // square that it blocks.
  function addWall(world, x, y, side) {
    world.walls[`${x},${y},${side}`] = true;
    const step = DIRS[side];
    world.walls[`${x + step[0]},${y + step[1]},${OPPOSITE[side]}`] = true;
  }

  // The world as the task's goal describes it: the goal's things on the
  // squares, and the robot on the goal square if the goal names one.
  function goalWorld(task) {
    const world = makeWorld(task.map);
    world.items = {};
    for (const square in task.goal.items) {
      world.items[square] = task.goal.items[square];
    }
    if (task.goal.robot) {
      world.x = task.goal.robot.x;
      world.y = task.goal.robot.y;
      world.dir = task.goal.robot.dir || world.dir;
    }
    return world;
  }

  // Can the robot leave its square in this direction? Not over the edge
  // of the world, and not through a wall.
  function clearIn(world, dir) {
    const step = DIRS[dir];
    const x = world.x + step[0];
    const y = world.y + step[1];
    if (x < 1 || x > world.cols || y < 1 || y > world.rows) { return false; }
    return !world.walls[`${world.x},${world.y},${dir}`];
  }

  // ---------- commands and sensors ----------

  // Everything a Python program can call in one world, in the form that
  // MiniPy asks for. A command changes the world. "step: true" makes
  // MiniPy pause after it, so that the page can draw. A sensor only
  // answers True or False. "arity: 0" means: called with empty brackets.
  function worldBuiltins(world, theme) {
    const names = theme.cmds;
    const builtins = {};

    function command(action) {
      return { fn: function (args, kwargs, line) { action(line); return null; }, step: true, arity: 0 };
    }

    function sensor(question) {
      return { fn: function () { return Boolean(question()); }, arity: 0 };
    }

    // The key of the square the robot is on, such as "4,3".
    function here() {
      return `${world.x},${world.y}`;
    }

    builtins.move = command(function (line) {
      if (!clearIn(world, world.dir)) {
        world.crashed = true;
        throw new RobotError(`${theme.robotName} crashed: it tried to move but the way ahead is blocked (a wall or the edge of the world). Use front_is_clear() to check first.`, line);
      }
      world.x += DIRS[world.dir][0];
      world.y += DIRS[world.dir][1];
    });

    builtins.turn_left = command(function () {
      world.dir = LEFT[world.dir];
    });

    builtins[names.pick] = command(function (line) {
      if (!world.items[here()]) {
        throw new RobotError(`${theme.robotName} tried to pick up a ${theme.item}, but there is no ${theme.item} on this square. Use ${names.present}() to check first.`, line);
      }
      world.items[here()] -= 1;
      if (world.items[here()] === 0) { delete world.items[here()]; }
      world.bag += 1;
    });

    // The robot never runs out, so putting down always works.
    builtins[names.put] = command(function () {
      world.items[here()] = (world.items[here()] || 0) + 1;
    });

    builtins.front_is_clear = sensor(function () { return clearIn(world, world.dir); });
    builtins.front_is_blocked = sensor(function () { return !clearIn(world, world.dir); });
    builtins.left_is_clear = sensor(function () { return clearIn(world, LEFT[world.dir]); });
    builtins.left_is_blocked = sensor(function () { return !clearIn(world, LEFT[world.dir]); });
    builtins.right_is_clear = sensor(function () { return clearIn(world, RIGHT[world.dir]); });
    builtins.right_is_blocked = sensor(function () { return !clearIn(world, RIGHT[world.dir]); });

    builtins[names.present] = sensor(function () { return world.items[here()]; });
    builtins[names.absent] = sensor(function () { return !world.items[here()]; });

    builtins.facing_north = sensor(function () { return world.dir === "N"; });
    builtins.facing_east = sensor(function () { return world.dir === "E"; });
    builtins.facing_south = sensor(function () { return world.dir === "S"; });
    builtins.facing_west = sensor(function () { return world.dir === "W"; });
    builtins.not_facing_north = sensor(function () { return world.dir !== "N"; });
    builtins.not_facing_east = sensor(function () { return world.dir !== "E"; });
    builtins.not_facing_south = sensor(function () { return world.dir !== "S"; });
    builtins.not_facing_west = sensor(function () { return world.dir !== "W"; });

    return builtins;
  }

  // ---------- the goal ----------

  // Is the world as the task's goal describes it? null means yes. If not,
  // the answer is a sentence that says what is still different.
  function checkGoal(world, task) {
    const theme = WORLDS[task.world];
    const goal = task.goal;
    for (const square in goal.items) {
      if ((world.items[square] || 0) !== goal.items[square]) {
        return `The ${theme.items} are not where the goal picture shows them.`;
      }
    }
    for (const square in world.items) {
      if (!goal.items[square]) {
        return `There is a ${theme.item} on a square that should be empty in the goal.`;
      }
    }
    if (goal.robot) {
      if (world.x !== goal.robot.x || world.y !== goal.robot.y) {
        return `${theme.robotName} finished on the wrong square. Compare its position with the goal picture.`;
      }
      if (goal.robot.dir && world.dir !== goal.robot.dir) {
        return `${theme.robotName} is on the right square but facing the wrong way.`;
      }
    }
    return null;
  }

  // Only these names can be seen from outside this file.
  return {
    WORLDS: WORLDS,
    RobotError: RobotError,
    make: makeWorld,
    goalWorld: goalWorld,
    builtins: worldBuiltins,
    checkGoal: checkGoal
  };
})();

// In the browser there is no "module", so this line does nothing.
// In Node it hands RobotWorld to the tests.
if (typeof module !== "undefined") { module.exports = RobotWorld; }