const WIDTH = 400;
const HEIGHT = 600;
const BACKGROUND_COLOR = "olivedrab";
const LEAF_COLOR = "darkgreen";
const VEIN_RADIUS = 3;
const VEIN_COLOR = "limegreen";
const VEIN_CORE_COLOR = "limegreen";
const AUXIN_COUNT = 1;
const AUXIN_RADIUS = 3;
const AUXIN_COLOR = "red";
const AUXIN_REMOVAL_RADIUS = 40;
const ARROW_SIZE = 7;

let veins = [];
let auxins = [];
let to_remove = [];
let showClosest = false;
let showDirection = false;
let showRemovalRadius = false;
let showAuxins = false;

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

    // if (drawArrow) {
    //     rotate(v2.heading());
    //     // translate(v2.mag() - ARROW_SIZE, 0);
    //     triangle(v2.x - ARROW_SIZE, v2.y, v2.x, v2.y + ARROW_SIZE / 2, v2.x + ARROW_SIZE, v2.y);
    // }
    pop();
}

function purgeAuxins() {
    // Remove any auxins that are within AUXIN_REMOVAL_RADIUS of any vein
    auxins.forEach((auxin, index) => {
        for (const vein of veins) {
            if (auxin.dist(vein.position) < AUXIN_REMOVAL_RADIUS) {
                to_remove.push(index);
                break;
            }
        }
    });

    auxins = auxins.filter((_, index) => !to_remove.includes(index));
    to_remove = [];
}

function addAuxins() {
    for (let i = 0; i < AUXIN_COUNT; i++) {
        let x = random(0, WIDTH);
        let y = random(0, HEIGHT);
        let a = createVector(x, y);
        auxins.push(a);
    }
}

function calculateClosestVeins() {
    // For each auxin, find the closest vein
    // Associate that vein with that auxin
    veins.forEach(vein => {
        vein.auxins = [];
    });
    auxins.forEach(auxin => {
        let closest_index = 0;
        for (let index = 1; index < veins.length; index++) {
            let a = veins[index];
            let b = veins[closest_index];
            if (a.position.dist(auxin) < b.position.dist(auxin)) {
                closest_index = index;
            }
        }

        veins[closest_index].auxins.push(auxin);
    });
}

function calculateDirection() {
    veins.forEach(vein => {
        vein.direction = createVector(0, 0);
    });
    veins.forEach(vein => {
        vein.auxins.forEach(auxin => {
            vein.direction.add(p5.Vector.sub(auxin, vein.position));
        });
        vein.direction.normalize();
    });
}

function growVeins() {
    // Grow veins in the direction in which they are being
    // pulled by the auxins
    let newVeins = [];
    veins.forEach(vein => {
        if (vein.direction.mag() > 0) {
            let newVein = new Vein(createVector(
                vein.position.x + vein.direction.x * VEIN_RADIUS * 2,
                vein.position.y + vein.direction.y * VEIN_RADIUS * 2
            ));
            newVeins.push(newVein);
        }
    });
    newVeins.forEach(vein => {
        veins.push(vein);
    });
}

function keyPressed() {
    if (keyCode === 32) { // Space
        addAuxins();
        purgeAuxins();
        calculateClosestVeins();
        calculateDirection();
        growVeins();
    }

    if (key === 'c') {
        calculateClosestVeins();
        showClosest = !showClosest;
    }
    if (key === 'r') {
        showRemovalRadius = !showRemovalRadius;
    }
    if (key === 'a') {
        showAuxins = !showAuxins;
    }
    if (key === 'n') {
        calculateDirection();
        showDirection = !showDirection;
    }

    return false;
}

let x1 = WIDTH / 2
let y1 = HEIGHT * 0.03
let x2 = -300
let y2 = HEIGHT + 150
let x3 = WIDTH + 300
let y3 = HEIGHT + 150
let x4 = x1;
let y4 = y1;
function drawLeaf() {
    push();
    fill(LEAF_COLOR);
    stroke(LEAF_COLOR);
    bezier(x1, y1, x2, y2, x3, y3, x4, y4);
    pop();
}

function setup() {
    let origin = createVector(WIDTH / 2, HEIGHT * 7 / 8);
    veins.push(new Vein(origin));
    addAuxins();

    createCanvas(WIDTH, HEIGHT);
}

function draw() {
    background(BACKGROUND_COLOR);
    drawLeaf();

    if (showAuxins) {
        auxins.forEach(auxin => {
            drawCircle(auxin.x, auxin.y, AUXIN_RADIUS, AUXIN_COLOR);
            if (showRemovalRadius) {
                drawRing(auxin.x, auxin.y, AUXIN_REMOVAL_RADIUS, AUXIN_COLOR, 2);
            }
        });
    }

    veins.forEach(vein => {
        drawCircle(vein.position.x, vein.position.y, VEIN_RADIUS, VEIN_COLOR);
        drawCircle(vein.position.x, vein.position.y, VEIN_RADIUS / 2, VEIN_CORE_COLOR);

        if (showClosest) {
            vein.auxins.forEach(auxin => {
                drawLine(vein.position, auxin, AUXIN_COLOR, 1, false);
            });
        }

        if (showDirection) {
            drawLine(vein.position, p5.Vector.add(vein.position, p5.Vector.mult(vein.direction, 20)), "purple", 3, true);
        }
    });

    let t = 0.5 * sin(frameCount * 0.005) + 0.5;
    let x = bezierPoint(x1, x2, x3, x4, t);
    let y = bezierPoint(y1, y2, y3, y4, t);
    fill(255);
    circle(x, y, 5);
}
