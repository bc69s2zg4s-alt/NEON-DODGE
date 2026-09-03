const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const multiplierEl = document.getElementById("multiplier");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const finalScoreEl = document.getElementById("finalScore");
const finalBestEl = document.getElementById("finalBest");


/* =========================================================
   CANVAS
========================================================= */

let W = 0;
let H = 0;
let DPR = 1;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;

    DPR = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resize);
resize();


/* =========================================================
   GAME STATE
========================================================= */

let running = false;
let gameTime = 0;
let score = 0;
let multiplier = 1;
let best = Number(localStorage.getItem("neonDodgeBest") || 0);

bestEl.textContent = best;


/* =========================================================
   PLAYER
========================================================= */

const player = {
    x: 0,
    y: 0,

    targetX: 0,
    targetY: 0,

    radius: 9,

    vx: 0,
    vy: 0,

    trail: []
};


/* =========================================================
   OBJECTS
========================================================= */

let obstacles = [];
let particles = [];
let stars = [];

let spawnTimer = 0;
let lastTime = 0;


/* =========================================================
   COLORS
========================================================= */

const cyan = "#00e5ff";
const blue = "#168cff";
const red = "#ff315f";


/* =========================================================
   RANDOM
========================================================= */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}


/* =========================================================
   STARS
========================================================= */

function createStars() {
    stars = [];

    const amount = Math.floor((W * H) / 7000);

    for (let i = 0; i < amount; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: random(0.5, 1.5),
            alpha: random(0.15, 0.7),
            speed: random(5, 18)
        });
    }
}

createStars();


/* =========================================================
   RESET GAME
========================================================= */

function resetGame() {
    gameTime = 0;
    score = 0;
    multiplier = 1;

    obstacles = [];
    particles = [];

    spawnTimer = 0;

    player.x = W / 2;
    player.y = H / 2;

    player.targetX = player.x;
    player.targetY = player.y;

    player.vx = 0;
    player.vy = 0;

    player.trail = [];

    scoreEl.textContent = "0";
    multiplierEl.textContent = "×1.00";
}


/* =========================================================
   START
========================================================= */

function startGame() {
    resetGame();

    running = true;

    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");

    lastTime = performance.now();

    requestAnimationFrame(loop);
}


/* =========================================================
   GAME OVER
========================================================= */

function gameOver() {
    if (!running) return;

    running = false;

    createExplosion(
        player.x,
        player.y,
        45,
        red
    );

    if (score > best) {
        best = Math.floor(score);

        localStorage.setItem(
            "neonDodgeBest",
            best
        );
    }

    finalScoreEl.textContent = Math.floor(score);
    finalBestEl.textContent = best;

    bestEl.textContent = best;

    setTimeout(() => {
        gameOverScreen.classList.remove("hidden");
    }, 350);
}


/* =========================================================
   PLAYER MOVEMENT
========================================================= */

function movePlayer(x, y) {
    player.targetX = x;
    player.targetY = y;
}


/* =========================================================
   TOUCH
========================================================= */

canvas.addEventListener(
    "touchstart",
    event => {
        if (!running) return;

        const touch = event.touches[0];

        movePlayer(
            touch.clientX,
            touch.clientY
        );
    },
    { passive: true }
);

canvas.addEventListener(
    "touchmove",
    event => {
        if (!running) return;

        const touch = event.touches[0];

        movePlayer(
            touch.clientX,
            touch.clientY
        );
    },
    { passive: true }
);


/* =========================================================
   MOUSE
========================================================= */

canvas.addEventListener(
    "mousemove",
    event => {
        if (!running) return;

        movePlayer(
            event.clientX,
            event.clientY
        );
    }
);


/* =========================================================
   KEYBOARD
========================================================= */

const keys = {};

window.addEventListener("keydown", event => {
    keys[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", event => {
    keys[event.key.toLowerCase()] = false;
});


/* =========================================================
   SPAWN OBSTACLE
========================================================= */

function spawnObstacle() {

    const side = Math.floor(Math.random() * 4);

    const margin = 50;

    let x;
    let y;

    if (side === 0) {
        x = random(margin, W - margin);
        y = -40;
    }

    if (side === 1) {
        x = W + 40;
        y = random(margin, H - margin);
    }

    if (side === 2) {
        x = random(margin, W - margin);
        y = H + 40;
    }

    if (side === 3) {
        x = -40;
        y = random(margin, H - margin);
    }

    const angle = Math.atan2(
        H / 2 - y,
        W / 2 - x
    );

    const speed =
        90 +
        gameTime * 2.5 +
        random(0, 35);

    obstacles.push({
        x,
        y,

        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,

        radius: random(11, 17),

        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-2, 2),

        type: Math.random() < 0.75
            ? "mine"
            : "diamond"
    });
}


/* =========================================================
   PARTICLES
========================================================= */

function createParticle(
    x,
    y,
    color = cyan,
    power = 1
) {
    particles.push({
        x,
        y,

        vx: random(-100, 100) * power,
        vy: random(-100, 100) * power,

        life: random(0.3, 0.8),
        maxLife: 0.8,

        size: random(1, 3),

        color
    });
}


function createExplosion(
    x,
    y,
    amount,
    color
) {
    for (let i = 0; i < amount; i++) {
        createParticle(
            x,
            y,
            color,
            1.8
        );
    }
}


/* =========================================================
   UPDATE PLAYER
========================================================= */

function updatePlayer(dt) {

    let keyboardX = 0;
    let keyboardY = 0;

    if (keys["w"] || keys["arrowup"]) {
        keyboardY -= 1;
    }

    if (keys["s"] || keys["arrowdown"]) {
        keyboardY += 1;
    }

    if (keys["a"] || keys["arrowleft"]) {
        keyboardX -= 1;
    }

    if (keys["d"] || keys["arrowright"]) {
        keyboardX += 1;
    }

    if (keyboardX !== 0 || keyboardY !== 0) {

        const length = Math.sqrt(
            keyboardX * keyboardX +
            keyboardY * keyboardY
        );

        keyboardX /= length;
        keyboardY /= length;

        player.targetX += keyboardX * 350 * dt;
        player.targetY += keyboardY * 350 * dt;
    }

    player.targetX = clamp(
        player.targetX,
        25,
        W - 25
    );

    player.targetY = clamp(
        player.targetY,
        25,
        H - 25
    );

    const dx =
        player.targetX - player.x;

    const dy =
        player.targetY - player.y;

    player.vx += dx * 14 * dt;
    player.vy += dy * 14 * dt;

    player.vx *= Math.pow(0.02, dt);
    player.vy *= Math.pow(0.02, dt);

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    player.x = clamp(
        player.x,
        20,
        W - 20
    );

    player.y = clamp(
        player.y,
        20,
        H - 20
    );

    player.trail.push({
        x: player.x,
        y: player.y,
        life: 1
    });

    if (player.trail.length > 18) {
        player.trail.shift();
    }
}


/* =========================================================
   UPDATE OBSTACLES
========================================================= */

function updateObstacles(dt) {

    for (let i = obstacles.length - 1; i >= 0; i--) {

        const obstacle = obstacles[i];

        obstacle.x += obstacle.vx * dt;
        obstacle.y += obstacle.vy * dt;

        obstacle.rotation +=
            obstacle.rotationSpeed * dt;

        const dx =
            player.x - obstacle.x;

        const dy =
            player.y - obstacle.y;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (
            distance <
            player.radius +
            obstacle.radius * 0.85
        ) {
            gameOver();
            return;
        }

        if (
            obstacle.x < -100 ||
            obstacle.x > W + 100 ||
            obstacle.y < -100 ||
            obstacle.y > H + 100
        ) {
            obstacles.splice(i, 1);
        }
    }
}


/* =========================================================
   UPDATE PARTICLES
========================================================= */

function updateParticles(dt) {

    for (let i = particles.length - 1; i >= 0; i--) {

        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vx *= Math.pow(0.08, dt);
        p.vy *= Math.pow(0.08, dt);

        p.life -= dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


/* =========================================================
   UPDATE STARS
========================================================= */

function updateStars(dt) {

    for (const star of stars) {

        star.y += star.speed * dt;

        if (star.y > H + 5) {
            star.y = -5;
            star.x = Math.random() * W;
        }
    }
}


/* =========================================================
   DRAW BACKGROUND
========================================================= */

function drawBackground() {

    ctx.fillStyle = "#05060b";
    ctx.fillRect(0, 0, W, H);

    /* radial glow */

    const gradient =
        ctx.createRadialGradient(
            W / 2,
            H / 2,
            0,
            W / 2,
            H / 2,
            Math.max(W, H) * 0.7
        );

    gradient.addColorStop(
        0,
        "rgba(0,130,180,0.10)"
    );

    gradient.addColorStop(
        0.45,
        "rgba(0,40,80,0.05)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(0, 0, W, H);


    /* grid */

    const gridSize = 70;

    ctx.lineWidth = 1;

    ctx.strokeStyle =
        "rgba(0,180,255,0.045)";

    for (
        let x = 0;
        x < W;
        x += gridSize
    ) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }

    for (
        let y = 0;
        y < H;
        y += gridSize
    ) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }


    /* stars */

    for (const star of stars) {

        ctx.globalAlpha = star.alpha;

        ctx.fillStyle = "#ffffff";

        ctx.beginPath();

        ctx.arc(
            star.x,
            star.y,
            star.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


/* =========================================================
   DRAW PLAYER
========================================================= */

function drawPlayer() {

    /* trail */

    for (
        let i = 0;
        i < player.trail.length;
        i++
    ) {

        const point =
            player.trail[i];

        const alpha =
            (i / player.trail.length) * 0.35;

        ctx.globalAlpha = alpha;

        ctx.fillStyle = cyan;

        ctx.beginPath();

        ctx.arc(
            point.x,
            point.y,
            player.radius *
            (i / player.trail.length),
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;


    /* outer glow */

    ctx.save();

    ctx.shadowBlur = 35;
    ctx.shadowColor = cyan;

    ctx.fillStyle = cyan;

    ctx.beginPath();

    ctx.arc(
        player.x,
        player.y,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();


    /* white core */

    ctx.fillStyle = "#ffffff";

    ctx.beginPath();

    ctx.arc(
        player.x,
        player.y,
        player.radius * 0.42,
        0,
        Math.PI * 2
    );

    ctx.fill();
}


/* =========================================================
   DRAW OBSTACLE
========================================================= */

function drawObstacle(obstacle) {

    ctx.save();

    ctx.translate(
        obstacle.x,
        obstacle.y
    );

    ctx.rotate(obstacle.rotation);

    ctx.shadowBlur = 25;
    ctx.shadowColor = red;

    ctx.strokeStyle = red;
    ctx.fillStyle =
        "rgba(255,30,80,0.08)";

    ctx.lineWidth = 2;


    if (obstacle.type === "mine") {

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            obstacle.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();


        for (
            let i = 0;
            i < 8;
            i++
        ) {

            const angle =
                (Math.PI * 2 / 8) * i;

            const x1 =
                Math.cos(angle) *
                obstacle.radius;

            const y1 =
                Math.sin(angle) *
                obstacle.radius;

            const x2 =
                Math.cos(angle) *
                (obstacle.radius + 6);

            const y2 =
                Math.sin(angle) *
                (obstacle.radius + 6);

            ctx.beginPath();

            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);

            ctx.stroke();
        }

    } else {

        ctx.beginPath();

        ctx.moveTo(
            0,
            -obstacle.radius
        );

        ctx.lineTo(
            obstacle.radius,
            0
        );

        ctx.lineTo(
            0,
            obstacle.radius
        );

        ctx.lineTo(
            -obstacle.radius,
            0
        );

        ctx.closePath();

        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}


/* =========================================================
   DRAW PARTICLES
========================================================= */

function drawParticles() {

    for (const p of particles) {

        ctx.globalAlpha =
            Math.max(
                0,
                p.life / p.maxLife
            );

        ctx.fillStyle = p.color;

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;
}


/* =========================================================
   UPDATE
========================================================= */

function update(dt) {

    gameTime += dt;

    updatePlayer(dt);

    updateObstacles(dt);

    updateParticles(dt);

    updateStars(dt);


    /* score */

    score += dt * 10 * multiplier;

    multiplier += dt * 0.025;

    multiplier = Math.min(
        multiplier,
        9.99
    );


    /* spawn */

    spawnTimer -= dt;

    const spawnInterval =
        Math.max(
            0.28,
            0.9 - gameTime * 0.008
        );

    if (spawnTimer <= 0) {

        spawnObstacle();

        spawnTimer =
            spawnInterval;
    }


    /* UI */

    scoreEl.textContent =
        Math.floor(score);

    multiplierEl.textContent =
        "×" + multiplier.toFixed(2);
}


/* =========================================================
   DRAW
========================================================= */

function draw() {

    drawBackground();

    for (const obstacle of obstacles) {
        drawObstacle(obstacle);
    }

    drawParticles();

    drawPlayer();
}


/* =========================================================
   GAME LOOP
========================================================= */

function loop(time) {

    if (!running) {

        draw();

        return;
    }

    const dt =
        Math.min(
            (time - lastTime) / 1000,
            0.033
        );

    lastTime = time;

    update(dt);

    draw();

    requestAnimationFrame(loop);
}


/* =========================================================
   BUTTONS
========================================================= */

startButton.addEventListener(
    "click",
    startGame
);

restartButton.addEventListener(
    "click",
    startGame
);


/* =========================================================
   INITIAL DRAW
========================================================= */

resetGame();
draw();