const WIDTH = 400;
const HEIGHT = 600;
const BACKGROUND_COLOR = "olivedrab";
const LEAF_COLOR = "darkgreen";
const VEIN_COLOR = "limegreen";
const VEIN_CORE_COLOR = "limegreen";
const AUXIN_COUNT = 1;
const AUXIN_COLOR = "red";
const FAST_FORWARD_AMOUNT = 500;

const showAuxinsCheckbox = document.getElementById("showAuxins");
const showDirectionCheckbox = document.getElementById("showDirection");
const showRemovalRadiusCheckbox = document.getElementById("showRemovalRadius");
const showClosestNodeCheckbox = document.getElementById("showClosestNode");
const veinRadiusSlider = document.getElementById("veinRadius");
const auxinRadiusSlider = document.getElementById("auxinRadius");
const auxinRemovalRadiusSlider = document.getElementById("auxinRemovalRadius");
const resetButton = document.getElementById("reset");
const stepButton = document.getElementById("step");
const fastForwardButton = document.getElementById("step500");
const feedbackDiv = document.getElementById("feedback");

let veins;
let auxins;
let toRemove;
let settings = {
  veinRadius: veinRadiusSlider.value,
  auxinRadius: auxinRadiusSlider.value,
  auxinRemovalRadius: auxinRemovalRadiusSlider.value,
  showClosestNode: showClosestNodeCheckbox.checked,
  showDirection: showDirectionCheckbox.checked,
  showRemovalRadius: showRemovalRadiusCheckbox.checked,
  showAuxins: showAuxinsCheckbox.checked,
};

showAuxinsCheckbox.addEventListener("change", (e) => {
  settings.showAuxins = e.target.checked;
  redraw();
});
showDirectionCheckbox.addEventListener("change", (e) => {
  settings.showDirection = e.target.checked;
  redraw();
});
showRemovalRadiusCheckbox.addEventListener("change", (e) => {
  settings.showRemovalRadius = e.target.checked;
  redraw();
});
showClosestNodeCheckbox.addEventListener("change", (e) => {
  settings.showClosestNode = e.target.checked;
  redraw();
});
veinRadiusSlider.addEventListener("input", (e) => {
  settings.veinRadius = e.target.value;
  redraw();
});
auxinRadiusSlider.addEventListener("input", (e) => {
  settings.auxinRadius = e.target.value;
  redraw();
});
auxinRemovalRadiusSlider.addEventListener("input", (e) => {
  settings.auxinRemovalRadius = e.target.value;
  redraw();
});

resetButton.addEventListener("click", () => {
  initState();
  redraw();
});
fastForwardButton.addEventListener("click", () => {
  for (let i = 0; i < FAST_FORWARD_AMOUNT; i++) {
    doSimulationStep();
  }
  redraw();
});
stepButton.addEventListener("click", () => {
  doSimulationStep();
  redraw();
});

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
  // Remove any auxins that are within settings.auxinRemovalRadius of any vein
  auxins.forEach((auxin, index) => {
    for (const vein of veins) {
      if (auxin.dist(vein.position) < settings.auxinRemovalRadius) {
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
          vein.position.x + vein.direction.x * settings.veinRadius * 2,
          vein.position.y + vein.direction.y * settings.veinRadius * 2,
        ),
      );
      newVeins.push(newVein);
    }
  });
  newVeins.forEach((vein) => {
    veins.push(vein);
  });
}

function doSimulationStep() {
  addAuxins();
  purgeAuxins();
  calculateClosestVeins();
  calculateDirection();
  growVeins();
  calculateClosestVeins();
  calculateDirection();
}
function keyPressed() {
  // On Space
  if (keyCode === 32) {
    doSimulationStep();
  }
  redraw();
  return false;
}

function initState() {
  veins = [];
  auxins = [];
  toRemove = [];
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
}

function setup() {
  initState();
  createCanvas(WIDTH, HEIGHT, document.getElementById("sketch"));
  noLoop();
}

function draw() {
  background(BACKGROUND_COLOR);
  drawLeaf(false);

  if (settings.showAuxins) {
    auxins.forEach((auxin) => {
      drawCircle(auxin.x, auxin.y, settings.auxinRadius, AUXIN_COLOR);
      if (settings.showRemovalRadius) {
        drawRing(auxin.x, auxin.y, settings.auxinRemovalRadius, AUXIN_COLOR, 2);
      }
    });
  }

  veins.forEach((vein) => {
    drawCircle(
      vein.position.x,
      vein.position.y,
      settings.veinRadius,
      VEIN_COLOR,
    );
    drawCircle(
      vein.position.x,
      vein.position.y,
      settings.veinRadius / 2,
      VEIN_CORE_COLOR,
    );

    if (settings.showClosestNode) {
      vein.auxins.forEach((auxin) => {
        drawLine(vein.position, auxin, AUXIN_COLOR, 1, false);
      });
    }

    if (settings.showDirection) {
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
