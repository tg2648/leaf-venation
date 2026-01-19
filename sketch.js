const WIDTH = 400;
const HEIGHT = 600;
const BACKGROUND_COLOR = "olivedrab";
const LEAF_COLOR = "darkgreen";
const VEIN_RADIUS = 2;
const VEIN_COLOR = "limegreen";
const VEIN_CORE_COLOR = "limegreen";
const AUXIN_COUNT = 3;
const AUXIN_RADIUS = 2;
const AUXIN_COLOR = "red";
const AUXIN_REMOVAL_RADIUS = 20;

let veins = [];
let auxins = [];
let toRemove = [];
let showClosest = false;
let showDirection = false;
let showRemovalRadius = false;
let showAuxins = true;
let leaf = {
  // bezier curve points:
  x1: WIDTH / 2,
  y1: HEIGHT * 0.03,
  x2: -300,
  y2: HEIGHT + 150,
  x3: WIDTH + 300,
  y3: HEIGHT + 150,
  x4: WIDTH / 2,
  y4: HEIGHT * 0.03,
  vertices: [], // approximation of the bezier curve using a polygon
};

class Vein {
  constructor(position) {
    this.position = position;
    this.auxins = []; // which auxins influence the vein
    this.direction = createVector(0, 0); // normalized sum of vectors to each auxin that influences it
  }
}

function drawCircle(x, y, radius, color) {
  push();
  fill(color);
  stroke(color);
  circle(x, y, radius * 2);
  pop();
}

function drawRing(x, y, radius, color, thickness) {
  push();
  fill(0, 0, 0, 1);
  stroke(color);
  strokeWeight(thickness);
  circle(x, y, radius * 2);
  pop();
}

function drawLine(v1, v2, color, thickness, drawArrow) {
  // Draw a line between two vectors v1 and v2
  push();
  fill(color);
  stroke(color);
  strokeWeight(thickness);
  line(v1.x, v1.y, v2.x, v2.y);
  pop();
}

function drawLeaf(drawPolygon) {
  push();
  fill(LEAF_COLOR);
  stroke(LEAF_COLOR);
  bezier(
    leaf.x1,
    leaf.y1,
    leaf.x2,
    leaf.y2,
    leaf.x3,
    leaf.y3,
    leaf.x4,
    leaf.y4,
  );
  pop();

  if (drawPolygon) {
    push();
    noFill();
    stroke("blue");
    beginShape();
    for (let p of leaf.vertices) {
      vertex(p.x, p.y);
    }
    endShape(CLOSE);

    for (let [i, p] of leaf.vertices.entries()) {
      strokeWeight(5);
      point(p.x, p.y);
      strokeWeight(1);
      text(i, p.x, p.y);
    }
    pop();
  }
}

function purgeAuxins() {
  // Remove any auxins that are within AUXIN_REMOVAL_RADIUS of any vein
  auxins.forEach((auxin, index) => {
    for (const vein of veins) {
      if (auxin.dist(vein.position) < AUXIN_REMOVAL_RADIUS) {
        toRemove.push(index);
        break;
      }
    }
  });

  auxins = auxins.filter((_, index) => !toRemove.includes(index));
  toRemove = [];
}

function isInsideLeaf(x, y) {
  // https://stackoverflow.com/a/34689268
  let pos = 0;
  let neg = 0;

  for (let i = 0; i < leaf.vertices.length; i++) {
    // Point is the same as one of the vertices
    if (x === leaf.vertices[i].x && y === leaf.vertices[i].y) {
      return true;
    }

    // Form a segment between the i'th point
    const x1 = leaf.vertices[i].x;
    const y1 = leaf.vertices[i].y;

    // And the i+1'th, or if i is the last, with the first point
    const i2 = (i + 1) % leaf.vertices.length;
    const x2 = leaf.vertices[i2].x;
    const y2 = leaf.vertices[i2].y;

    // Compute cross product
    const d = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
    if (d > 0) pos++;
    if (d < 0) neg++;

    // If the sign changes, then point is outside
    if (pos > 0 && neg > 0) {
      return false;
    }
  }

  // If no change in direction, then on same side of all segments, and thus inside
  return true;
}

function addAuxins() {
  let auxinsAdded = 0;
  while (auxinsAdded < AUXIN_COUNT) {
    let x = random(0, WIDTH);
    let y = random(0, HEIGHT);

    if (isInsideLeaf(x, y)) {
      // if (true) {
      let a = createVector(x, y);
      auxins.push(a);
      auxinsAdded++;
    }
  }
}

function calculateClosestVeins() {
  // For each auxin, find the closest vein
  // Associate that vein with that auxin
  veins.forEach((vein) => {
    vein.auxins = [];
  });
  auxins.forEach((auxin) => {
    let closestIndex = 0;
    for (let index = 1; index < veins.length; index++) {
      let a = veins[index];
      let b = veins[closestIndex];
      if (a.position.dist(auxin) < b.position.dist(auxin)) {
        closestIndex = index;
      }
    }

    veins[closestIndex].auxins.push(auxin);
  });
}

function calculateDirection() {
  veins.forEach((vein) => {
    vein.direction = createVector(0, 0);
  });
  veins.forEach((vein) => {
    vein.auxins.forEach((auxin) => {
      vein.direction.add(p5.Vector.sub(auxin, vein.position));
    });
    vein.direction.normalize();
  });
}

function growVeins() {
  // Grow veins in the direction in which they are being pulled by the auxins
  let newVeins = [];
  veins.forEach((vein) => {
    if (vein.direction.mag() > 0) {
      let newVein = new Vein(
        createVector(
          vein.position.x + vein.direction.x * VEIN_RADIUS * 2,
          vein.position.y + vein.direction.y * VEIN_RADIUS * 2,
        ),
      );
      newVeins.push(newVein);
    }
  });
  newVeins.forEach((vein) => {
    veins.push(vein);
  });
}

function keyPressed() {
  if (keyCode === 32) {
    // Space
    addAuxins();
    purgeAuxins();
    calculateClosestVeins();
    calculateDirection();
    growVeins();
    calculateClosestVeins();
    calculateDirection();
  }

  if (key === "c") {
    showClosest = !showClosest;
  }
  if (key === "r") {
    showRemovalRadius = !showRemovalRadius;
  }
  if (key === "a") {
    showAuxins = !showAuxins;
  }
  if (key === "n") {
    showDirection = !showDirection;
  }

  return false;
}
function setup() {
  let numVertices = 30;
  let delta = 1 / numVertices;
  t = 0;
  for (let i = 0; i < numVertices; i++) {
    let x = bezierPoint(leaf.x1, leaf.x2, leaf.x3, leaf.x4, t);
    let y = bezierPoint(leaf.y1, leaf.y2, leaf.y3, leaf.y4, t);
    t = t + delta;
    leaf.vertices.push({ x, y });
  }

  let origin = createVector(WIDTH / 2, (HEIGHT * 7) / 8);
  veins.push(new Vein(origin));
  createCanvas(WIDTH, HEIGHT);
}

function draw() {
  background(BACKGROUND_COLOR);
  drawLeaf(false);

  if (showAuxins) {
    auxins.forEach((auxin) => {
      drawCircle(auxin.x, auxin.y, AUXIN_RADIUS, AUXIN_COLOR);
      if (showRemovalRadius) {
        drawRing(auxin.x, auxin.y, AUXIN_REMOVAL_RADIUS, AUXIN_COLOR, 2);
      }
    });
  }

  veins.forEach((vein) => {
    drawCircle(vein.position.x, vein.position.y, VEIN_RADIUS, VEIN_COLOR);
    drawCircle(
      vein.position.x,
      vein.position.y,
      VEIN_RADIUS / 2,
      VEIN_CORE_COLOR,
    );

    if (showClosest) {
      vein.auxins.forEach((auxin) => {
        drawLine(vein.position, auxin, AUXIN_COLOR, 1, false);
      });
    }

    if (showDirection) {
      if (vein.direction.mag() > 0) {
        drawLine(
          vein.position,
          p5.Vector.add(vein.position, p5.Vector.mult(vein.direction, 20)),
          "purple",
          3,
          true,
        );
      }
    }
  });
}
