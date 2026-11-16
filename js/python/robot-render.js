
const RobotRender = (function () {
  "use strict";

  // How each world looks. The worlds are pictures, so they have colours
  // of their own. The grid marks are dark enough to count squares by:
  // at least 3 to 1 against the background.
  const LOOKS = {
    mars:      { shape: "rock",   background: "#F2E1D2", grid: "#9E7353", wall: "#4A2A1A", robot: "#C8102E", item: "#5B5B5B" },
    warehouse: { shape: "parcel", background: "#EBEBEB", grid: "#808080", wall: "#1A1A1A", robot: "#000000", item: "#B9834A" },
    ocean:     { shape: "bottle", background: "#D7E8F0", grid: "#5A8496", wall: "#20363F", robot: "#800029", item: "#3E8FB0" }
  };

  const CELL = 52;   // the width and height of one square, in SVG units
  const PAD = 10;    // the empty edge round the grid

  // How far the robot is turned for each direction. It is drawn facing east.
  const TURN = { E: 0, S: 90, W: 180, N: 270 };

  // The four directions as words.
  const FACING = { N: "north", E: "east", S: "south", W: "west" };

  // ---------- where things are ----------

  // The middle of a square, in SVG units. SVG counts down from the top
  // and the world counts rows up from the bottom, so the row is turned
  // upside down here.
  function centreX(x) {
    return PAD + (x - 1) * CELL + CELL / 2;
  }
  function centreY(world, y) {
    return PAD + (world.rows - y) * CELL + CELL / 2;
  }

  // A key such as "4,3" as two numbers: { x: 4, y: 3 }.
  function squareOf(key) {
    const parts = key.split(",");
    return { x: Number(parts[0]), y: Number(parts[1]) };
  }

  // The squares that have something on them, bottom row first.
  function itemSquares(world) {
    const squares = [];
    for (const key in world.items) {
      const square = squareOf(key);
      squares.push({ x: square.x, y: square.y, count: Number(world.items[key]) });
    }
    return squares.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
  }

  // The walls inside the world, each one once, bottom row first. A wall
  // is stored on both of the squares it blocks. This keeps the copy on
  // the east or the north side of a square, and leaves out the other.
  function innerWalls(world) {
    const walls = [];
    for (const key in world.walls) {
      const parts = key.split(",");
      const wall = { x: Number(parts[0]), y: Number(parts[1]), side: parts[2] };
      const inside = wall.x >= 1 && wall.x <= world.cols && wall.y >= 1 && wall.y <= world.rows;
      const east = wall.side === "E" && wall.x < world.cols;
      const north = wall.side === "N" && wall.y < world.rows;
      if (inside && (east || north)) { walls.push(wall); }
    }
    return walls.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
  }

  // ---------- the picture ----------

  // The whole picture as SVG text. options.label names the picture for a
  // screen reader, options.describedBy is the id of the element that
  // holds the picture in words, and options.showRobot: false leaves the
  // robot out.
  function picture(world, worldName, options) {
    const look = LOOKS[worldName];
    const settings = options || {};
    const width = world.cols * CELL + PAD * 2;
    const height = world.rows * CELL + PAD * 2;
    const describedBy = settings.describedBy ? ` aria-describedby="${settings.describedBy}"` : "";

    let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${settings.label || "The world"}"${describedBy}>`;
    svg += `<rect width="${width}" height="${height}" fill="${look.background}"/>`;
    svg += gridMarks(world, look);
    // The robot is drawn before the things, so that a thing on the
    // robot's square can still be seen.
    if (settings.showRobot !== false) { svg += robotShape(world, look); }
    for (const square of itemSquares(world)) { svg += itemShape(world, look, square); }
    for (const wall of innerWalls(world)) { svg += wallLine(world, look, wall); }
    svg += `<rect x="${PAD}" y="${PAD}" width="${world.cols * CELL}" height="${world.rows * CELL}" fill="none" stroke="${look.wall}" stroke-width="6"/>`;
    // The crash star goes on last, on top of the wall that was hit.
    if (world.crashed && settings.showRobot !== false) { svg += crashStar(world); }
    return svg + "</svg>";
  }

  // Put a shape on the robot's square, turned the way the robot faces.
  function onRobotSquare(world) {
    return `transform="translate(${centreX(world.x)} ${centreY(world, world.y)}) rotate(${TURN[world.dir]})"`;
  }

  // A small cross in the middle of every square.
  function gridMarks(world, look) {
    let path = "";
    for (let x = 1; x <= world.cols; x++) {
      for (let y = 1; y <= world.rows; y++) {
        path += `M${centreX(x) - 5} ${centreY(world, y)}h10M${centreX(x)} ${centreY(world, y) - 5}v10`;
      }
    }
    return `<path d="${path}" stroke="${look.grid}" stroke-width="2"/>`;
  }

  // The robot: a body, four wheels, an eye, and a nose that points the
  // way it faces. After a crash the body is grey.
  function robotShape(world, look) {
    const fill = world.crashed ? "#777777" : look.robot;
    let shape = `<g class="robot" ${onRobotSquare(world)}>`;
    shape += `<rect x="-17" y="-14" width="30" height="28" rx="4" fill="${fill}" stroke="#000000" stroke-width="2.5"/>`;
    shape += `<path d="M13 -10L24 0L13 10Z" fill="#000000"/>`;
    shape += `<path d="M-14 -18h8v5h-8zM2 -18h8v5h-8zM-14 13h8v5h-8zM2 13h8v5h-8z" fill="#000000"/>`;
    shape += `<circle cx="-4" cy="0" r="5" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>`;
    return shape + "</g>";
  }

  // A yellow star on the robot's nose: the place where it hit something.
  // Colour alone must never carry information, so a crash has a shape too.
  function crashStar(world) {
    return `<path class="crash" ${onRobotSquare(world)} d="M22 -13l3 7 7-3-3 7 7 2-7 2 3 7-7-3-3 7-3-7-7 3 3-7-7-2 7-2-3-7 7 3z" fill="#FFB81C" stroke="#000000" stroke-width="1.5"/>`;
  }

  // What lies on one square: a rock, a parcel or a bottle. A stack of
  // two or more also shows its number.
  function itemShape(world, look, square) {
    const x = centreX(square.x);
    const y = centreY(world, square.y);
    let shape = `<g class="item" opacity="0.92">`;
    if (look.shape === "rock") {
      shape += `<path d="M${x - 13} ${y + 6}l4 -13 12 -5 10 9 -1 11 -9 5 -12 -1z" fill="${look.item}" stroke="#2B2B2B" stroke-width="2"/>`;
    } else if (look.shape === "parcel") {
      shape += `<rect x="${x - 12}" y="${y - 11}" width="24" height="22" fill="${look.item}" stroke="#3B2A15" stroke-width="2"/>`;
      shape += `<path d="M${x} ${y - 11}v22" stroke="#EAD9BF" stroke-width="4"/>`;
    } else {
      shape += `<rect x="${x - 6}" y="${y - 13}" width="12" height="26" rx="4" fill="${look.item}" stroke="#1F4A5C" stroke-width="2"/>`;
      shape += `<rect x="${x - 4}" y="${y - 16}" width="8" height="5" fill="#1F4A5C"/>`;
    }
    shape += "</g>";
    if (square.count > 1) {
      // In the top right corner of the square. The white edge keeps the
      // number readable on any background.
      shape += `<text x="${x + 21}" y="${y - 8}" text-anchor="end" font-family="Bebas Neue, Arial Narrow, sans-serif" font-size="18" fill="#000000" stroke="#FFFFFF" stroke-width="3" paint-order="stroke">${square.count}</text>`;
    }
    return shape;
  }

  // One wall: a thick line along the east or the north side of a square.
  function wallLine(world, look, wall) {
    const left = PAD + (wall.x - 1) * CELL;
    const top = PAD + (world.rows - wall.y) * CELL;
    const ends = wall.side === "E"
      ? [left + CELL, top, left + CELL, top + CELL]
      : [left, top, left + CELL, top];
    return `<line class="wall" x1="${ends[0]}" y1="${ends[1]}" x2="${ends[2]}" y2="${ends[3]}" stroke="${look.wall}" stroke-width="6" stroke-linecap="square"/>`;
  }

  // ---------- the picture in words ----------

  // Where the robot is: "column 1, row 3, facing east".
  function where(world) {
    return `column ${world.x}, row ${world.y}, facing ${FACING[world.dir]}`;
  }

  // "1 rock" or "3 rocks".
  function countOf(number, one, many) {
    return `${number} ${number === 1 ? one : many}`;
  }

  // The same world as the picture, in sentences. theme is the world's
  // entry in RobotWorld.WORLDS. Two options are for goal pictures:
  // showRobot: false when the robot may finish on any square, and
  // anyDirection: true when it may finish facing any way.
  function describe(world, theme, options) {
    const settings = options || {};
    const sentences = [];
    sentences.push(`The world is ${countOf(world.cols, "square", "squares")} wide and ${countOf(world.rows, "square", "squares")} high.`);

    if (settings.showRobot === false) {
      sentences.push(`${theme.robotName} can be on any square.`);
    } else if (settings.anyDirection) {
      sentences.push(`${theme.robotName} is in column ${world.x}, row ${world.y}. It can face any way.`);
    } else {
      sentences.push(`${theme.robotName} is in ${where(world)}.${world.crashed ? " It has crashed." : ""}`);
    }

    const squares = itemSquares(world);
    if (squares.length === 0) {
      sentences.push(`There are no ${theme.items}.`);
    } else {
      let total = 0;
      const places = [];
      for (const square of squares) {
        total += square.count;
        const stack = square.count > 1 ? ` (${square.count})` : "";
        places.push(`column ${square.x}, row ${square.y}${stack}`);
      }
      sentences.push(`There ${total === 1 ? "is" : "are"} ${countOf(total, theme.item, theme.items)}: ${places.join("; ")}.`);
    }

    const walls = innerWalls(world);
    if (walls.length === 0) {
      sentences.push("There are no walls inside the world.");
    } else {
      const places = walls.map(function (wall) {
        return `on the ${FACING[wall.side]} side of column ${wall.x}, row ${wall.y}`;
      });
      sentences.push(`There ${walls.length === 1 ? "is" : "are"} ${countOf(walls.length, "wall", "walls")} inside the world: ${places.join("; ")}.`);
    }
    return sentences.join(" ");
  }

  // Only these names can be seen from outside this file.
  return { picture: picture, describe: describe, where: where };
})();

// In the browser there is no "module", so this line does nothing.
// In Node it hands RobotRender to the tests.
if (typeof module !== "undefined") { module.exports = RobotRender; }