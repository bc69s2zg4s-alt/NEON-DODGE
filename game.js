const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

    createStars();
}

window.addEventListener("resize", resize);


/* =========================================================
   ELEMENTS
========================================================= */

const hud = document.getElementById("hud");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const multiplierEl = document.getElementById("multiplier");

const menuScreen = document.getElementById("menuScreen");
const shopScreen = document.getElementById("shopScreen");
const settingsScreen = document.getElementById("settingsScreen");
const feedbackScreen = document.getElementById("feedbackScreen");
const dailyScreen = document.getElementById("dailyScreen");

const gameOverScreen = document.getElementById("gameOverScreen");
const pauseScreen = document.getElementById("pauseScreen");

const playButton = document.getElementById("playButton");
const restartButton = document.getElementById("restartButton");
const menuButton = document.getElementById("menuButton");

const pauseButton = document.getElementById("pauseButton");
const resumeButton = document.getElementById("resumeButton");
const pauseMenuButton = document.getElementById("pauseMenuButton");

const shopButton = document.getElementById("shopButton");
const settingsButton = document.getElementById("settingsButton");
const feedbackButton = document.getElementById("feedbackButton");
const dailyButton = document.getElementById("dailyButton");

const claimDaily = document.getElementById("claimDaily");

const reviveButton = document.getElementById("reviveButton");

const shieldButton = document.getElementById("shieldButton");
const empButton = document.getElementById("empButton");

const warning = document.getElementById("warning");

const menuCrystals = document.getElementById("menuCrystals");
const shopCrystals = document.getElementById("shopCrystals");
const gameCrystals = document.getElementById("gameCrystals");

const finalScoreEl = document.getElementById("finalScore");
const finalBestEl = document.getElementById("finalBest");
const earnedCrystalsEl = document.getElementById("earnedCrystals");
const newBestEl = document.getElementById("newBest");

const healthHud = document.getElementById("healthHud");

const weaponCooldown = document.getElementById("weaponCooldown");


/* =========================================================
   SAVE DATA
========================================================= */

const defaultData = {
    crystals: 50,

    best: 0,

    lives: 1,
    weapon: 0,
    damage: 1,
    shield: 1,
    emp: 1,

    music: true,
    sound: true,
    vibration: true,

    lastDaily: 0
};

let saveData = {
    ...defaultData,
    ...JSON.parse(
        localStorage.getItem("neonDodgeData") || "{}"
    )
};

function save() {
    localStorage.setItem(
        "neonDodgeData",
        JSON.stringify(saveData)
    );
}


/* =========================================================
   GAME
========================================================= */

let running = false;
let paused = false;

let gameTime = 0;
let score = 0;
let multiplier = 1;

let runCrystals = 0;

let obstacles = [];
let projectiles = [];
let particles = [];
let stars = [];

let spawnTimer = 0;

let lastTime = 0;

let reviveUsed = false;

let warningTimer = 0;


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

    lives: 1,

    shieldTime: 0,

    shieldCooldown: 0,

    empCooldown: 0,

    shotCooldown: 0,

    trail: []
};


/* =========================================================
   COLORS
========================================================= */

const CYAN = "#00e5ff";
const BLUE = "#168cff";
const RED = "#ff315f";
const YELLOW = "#ffe45c";


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

    const amount =
        Math.floor((W * H) / 7000);

    for (let i = 0; i < amount; i++) {

        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,

            size: random(.5, 1.5),

            alpha: random(.15, .65),

            speed: random(5, 18)
        });
    }
}


/* =========================================================
   UI
========================================================= */

function updateMenuUI() {

    menuCrystals.textContent =
        saveData.crystals;

    shopCrystals.textContent =
        saveData.crystals;

    bestEl.textContent =
        saveData.best;

    document.getElementById("lifeLevel").textContent =
        `LEVEL ${saveData.lives} / 3`;

    document.getElementById("weaponLevel").textContent =
        saveData.weapon
            ? "UNLOCKED"
            : "LOCKED";

    document.getElementById("damageLevel").textContent =
        `LEVEL ${saveData.damage} / 3`;

    document.getElementById("shieldLevel").textContent =
        `LEVEL ${saveData.shield} / 3`;

    document.getElementById("empLevel").textContent =
        `LEVEL ${saveData.emp} / 3`;

    document.getElementById("buyLife").disabled =
        saveData.lives >= 3;

    document.getElementById("buyWeapon").disabled =
        saveData.weapon >= 1;

    document.getElementById("buyDamage").disabled =
        !saveData.weapon ||
        saveData.damage >= 3;

    document.getElementById("buyShield").disabled =
        saveData.shield >= 3;

    document.getElementById("buyEmp").disabled =
        saveData.emp >= 3;

    updateToggle(
        document.getElementById("musicToggle"),
        saveData.music
    );

    updateToggle(
        document.getElementById("soundToggle"),
        saveData.sound
    );

    updateToggle(
        document.getElementById("vibrationToggle"),
        saveData.vibration
    );
}

function updateToggle(button, state) {

    button.textContent =
        state ? "ON" : "OFF";

    button.classList.toggle(
        "off",
        !state
    );
}


/* =========================================================
   HEALTH
========================================================= */

function drawHealth() {

    healthHud.innerHTML = "";

    for (
        let i = 0;
        i < saveData.lives;
        i++
    ) {

        const span =
            document.createElement("span");

        span.textContent =
            i < player.lives
                ? "❤️"
                : "🖤";

        if (i >= player.lives) {
            span.className =
                "heart-empty";
        }

        healthHud.appendChild(span);
    }
}


/* =========================================================
   RESET
========================================================= */

function resetGame() {

    gameTime = 0;

    score = 0;

    multiplier = 1;

    runCrystals = 0;

    obstacles = [];
    projectiles = [];
    particles = [];

    spawnTimer = .4;

    reviveUsed = false;

    warningTimer = 0;

    player.x = W / 2;
    player.y = H / 2;

    player.targetX = player.x;
    player.targetY = player.y;

    player.vx = 0;
    player.vy = 0;

    player.lives = saveData.lives;

    player.shieldTime = 0;

    player.shieldCooldown = 0;

    player.empCooldown = 0;

    player.shotCooldown = 0;

    player.trail = [];

    scoreEl.textContent = "0";

    multiplierEl.textContent =
        "×1.00";

    gameCrystals.textContent =
        "0";

    drawHealth();
}


/* =========================================================
   START
========================================================= */

function startGame() {

    resetGame();

    running = true;
    paused = false;

    menuScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");

    hud.classList.remove("hidden");

    lastTime = performance.now();

    requestAnimationFrame(loop);
}


/* =========================================================
   MENU
========================================================= */

function returnToMenu() {

    running = false;
    paused = false;

    hud.classList.add("hidden");

    gameOverScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");

    menuScreen.classList.remove("hidden");

    updateMenuUI();

    draw();
}


/* =========================================================
   GAME OVER
========================================================= */

function endGame() {

    if (!running) {
        return;
    }

    running = false;

    createExplosion(
        player.x,
        player.y,
        60,
        RED
    );

    const finalScore =
        Math.floor(score);

    const previousBest =
        saveData.best;

    if (finalScore > saveData.best) {

        saveData.best =
            finalScore;

        save();
    }

    const reward =
        Math.max(
            5,
            Math.min(
                35,
                Math.floor(
                    finalScore / 300
                ) + 5
            )
        );

    runCrystals = reward;

    saveData.crystals += reward;

    save();

    finalScoreEl.textContent =
        finalScore;

    finalBestEl.textContent =
        saveData.best;

    earnedCrystalsEl.textContent =
        reward;

    newBestEl.classList.toggle(
        "hidden",
        finalScore <= previousBest
    );

    hud.classList.add("hidden");

    updateMenuUI();

    setTimeout(() => {

        gameOverScreen.classList.remove(
            "hidden"
        );

    }, 300);
}


/* =========================================================
   REVIVE
========================================================= */

function revivePlayer() {

    if (reviveUsed) {
        return;
    }

    reviveUsed = true;

    /*
        Здесь позже подключим реальную рекламу.

        Сейчас это симуляция:
        игрок получает воскрешение сразу.
    */

    reviveButton.disabled = true;
    reviveButton.textContent =
        "REVIVING...";

    setTimeout(() => {

        player.lives = Math.max(
            1,
            Math.ceil(saveData.lives / 2)
        );

        player.shieldTime = 3.5;

        player.x = W / 2;
        player.y = H / 2;

        player.targetX = player.x;
        player.targetY = player.y;

        obstacles = obstacles.filter(
            obstacle => {

                const dx =
                    obstacle.x - player.x;

                const dy =
                    obstacle.y - player.y;

                return (
                    Math.sqrt(
                        dx * dx + dy * dy
                    ) > 180
                );
            }
        );

        score += 150;

        multiplier = Math.max(
            1,
            multiplier * .75
        );

        gameOverScreen.classList.add(
            "hidden"
        );

        hud.classList.remove(
            "hidden"
        );

        running = true;

        drawHealth();

        reviveButton.disabled = false;
        reviveButton.textContent =
            "🎬 REVIVE";

        lastTime = performance.now();

        requestAnimationFrame(loop);

    }, 700);
}


/* =========================================================
   PLAYER MOVEMENT
========================================================= */

function movePlayer(x, y) {

    if (!running || paused) {
        return;
    }

    player.targetX = x;
    player.targetY = y;
}


canvas.addEventListener(
    "touchstart",
    event => {

        const touch =
            event.touches[0];

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

        const touch =
            event.touches[0];

        movePlayer(
            touch.clientX,
            touch.clientY
        );

    },
    { passive: true }
);


canvas.addEventListener(
    "mousemove",
    event => {

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

window.addEventListener(
    "keydown",
    event => {

        keys[event.key.toLowerCase()] =
            true;

        if (
            event.key === " " &&
            running &&
            !paused
        ) {
            shoot();
        }

        if (
            event.key === "e" &&
            running &&
            !paused
        ) {
            activateEMP();
        }

        if (
            event.key === "q" &&
            running &&
            !paused
        ) {
            activateShield();
        }
    }
);


window.addEventListener(
    "keyup",
    event => {

        keys[event.key.toLowerCase()] =
            false;
    }
);


/* =========================================================
   SHOOT
========================================================= */

function shoot() {

    if (
        !running ||
        paused ||
        !saveData.weapon
    ) {
        return;
    }

    if (player.shotCooldown > 0) {
        return;
    }

    let nearest = null;
    let nearestDistance = Infinity;

    for (const obstacle of obstacles) {

        const dx =
            obstacle.x - player.x;

        const dy =
            obstacle.y - player.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (distance < nearestDistance) {

            nearestDistance =
                distance;

            nearest =
                obstacle;
        }
    }

    let angle;

    if (nearest) {

        angle = Math.atan2(
            nearest.y - player.y,
            nearest.x - player.x
        );

    } else {

        angle = -Math.PI / 2;
    }

    const amount =
        saveData.damage >= 3
            ? 3
            : saveData.damage >= 2
                ? 2
                : 1;

    for (let i = 0; i < amount; i++) {

        const spread =
            (i - (amount - 1) / 2) *
            .14;

        const finalAngle =
            angle + spread;

        projectiles.push({

            x: player.x,
            y: player.y,

            vx:
                Math.cos(finalAngle) *
                560,

            vy:
                Math.sin(finalAngle) *
                560,

            radius: 4,

            life: 1.3
        });
    }

    player.shotCooldown =
        saveData.damage >= 3
            ? .27
            : saveData.damage >= 2
                ? .36
                : .48;
}


/* =========================================================
   SHIELD
========================================================= */

function activateShield() {

    if (
        player.shieldCooldown > 0 ||
        player.shieldTime > 0
    ) {
        return;
    }

    const duration =
        saveData.shield === 1
            ? 2
            : saveData.shield === 2
                ? 3
                : 4;

    player.shieldTime =
        duration;

    player.shieldCooldown =
        saveData.shield === 1
            ? 12
            : saveData.shield === 2
                ? 10
                : 8;

    createExplosion(
        player.x,
        player.y,
        20,
        CYAN
    );

    vibrate(25);
}


/* =========================================================
   EMP
========================================================= */

function activateEMP() {

    if (
        player.empCooldown > 0
    ) {
        return;
    }

    const radius =
        saveData.emp === 1
            ? 180
            : saveData.emp === 2
                ? 240
                : 310;

    let destroyed = 0;

    for (
        let i = obstacles.length - 1;
        i >= 0;
        i--
    ) {

        const obstacle =
            obstacles[i];

        const dx =
            obstacle.x - player.x;

        const dy =
            obstacle.y - player.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        if (distance < radius) {

            createExplosion(
                obstacle.x,
                obstacle.y,
                15,
                CYAN
            );

            obstacles.splice(i, 1);

            destroyed++;

            score += 40;
        }
    }

    player.empCooldown =
        saveData.emp === 1
            ? 18
            : saveData.emp === 2
                ? 15
                : 12;

    createExplosion(
        player.x,
        player.y,
        40,
        CYAN
    );

    vibrate(60);
}


/* =========================================================
   SPAWN
========================================================= */

function spawnObstacle() {

    const side =
        Math.floor(
            Math.random() * 4
        );

    let x;
    let y;

    const margin = 50;

    if (side === 0) {

        x = random(
            margin,
            W - margin
        );

        y = -50;

    } else if (side === 1) {

        x = W + 50;

        y = random(
            margin,
            H - margin
        );

    } else if (side === 2) {

        x = random(
            margin,
            W - margin
        );

        y = H + 50;

    } else {

        x = -50;

        y = random(
            margin,
            H - margin
        );
    }


    const angle =
        Math.atan2(
            H / 2 - y,
            W / 2 - x
        );


    const speed =
        90 +
        gameTime * 2.1 +
        random(0, 35);


    obstacles.push({

        x,
        y,

        vx:
            Math.cos(angle) *
            speed,

        vy:
            Math.sin(angle) *
            speed,

        radius:
            random(11, 17),

        rotation:
            random(
                0,
                Math.PI * 2
            ),

        rotationSpeed:
            random(-2, 2),

        type:
            Math.random() < .8
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
    color = CYAN,
    power = 1
) {

    particles.push({

        x,
        y,

        vx:
            random(-100, 100) *
            power,

        vy:
            random(-100, 100) *
            power,

        life:
            random(.25, .8),

        maxLife: .8,

        size:
            random(1, 3),

        color
    });
}


function createExplosion(
    x,
    y,
    amount,
    color
) {

    for (
        let i = 0;
        i < amount;
        i++
    ) {

        createParticle(
            x,
            y,
            color,
            1.8
        );
    }
}


/* =========================================================
   DAMAGE
========================================================= */

function damagePlayer(obstacle) {

    if (player.shieldTime > 0) {

        createExplosion(
            obstacle.x,
            obstacle.y,
            18,
            CYAN
        );

        const index =
            obstacles.indexOf(
                obstacle
            );

        if (index !== -1) {
            obstacles.splice(
                index,
                1
            );
        }

        score += 25;

        return;
    }

    player.lives--;

    drawHealth();

    createExplosion(
        player.x,
        player.y,
        30,
        RED
    );

    vibrate(100);

    const index =
        obstacles.indexOf(
            obstacle
        );

    if (index !== -1) {
        obstacles.splice(
            index,
            1
        );
    }

    multiplier =
        Math.max(
            1,
            multiplier * .55
        );

    if (player.lives <= 0) {

        endGame();
    }
}


/* =========================================================
   UPDATE PLAYER
========================================================= */

function updatePlayer(dt) {

    let kx = 0;
    let ky = 0;

    if (
        keys["w"] ||
        keys["arrowup"]
    ) {
        ky--;
    }

    if (
        keys["s"] ||
        keys["arrowdown"]
    ) {
        ky++;
    }

    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {
        kx--;
    }

    if (
        keys["d"] ||
        keys["arrowright"]
    ) {
        kx++;
    }

    if (kx || ky) {

        const length =
            Math.sqrt(
                kx * kx +
                ky * ky
            );

        kx /= length;
        ky /= length;

        player.targetX +=
            kx * 350 * dt;

        player.targetY +=
            ky * 350 * dt;
    }

    player.targetX =
        clamp(
            player.targetX,
            20,
            W - 20
        );

    player.targetY =
        clamp(
            player.targetY,
            20,
            H - 20
        );


    const dx =
        player.targetX -
        player.x;

    const dy =
        player.targetY -
        player.y;


    player.vx +=
        dx * 14 * dt;

    player.vy +=
        dy * 14 * dt;


    player.vx *=
        Math.pow(
            .02,
            dt
        );

    player.vy *=
        Math.pow(
            .02,
            dt
        );


    player.x +=
        player.vx * dt;

    player.y +=
        player.vy * dt;


    player.x =
        clamp(
            player.x,
            20,
            W - 20
        );

    player.y =
        clamp(
            player.y,
            20,
            H - 20
        );


    player.trail.push({

        x: player.x,

        y: player.y,

        life: 1
    });


    if (
        player.trail.length >
        20
    ) {
        player.trail.shift();
    }
}


/* =========================================================
   UPDATE OBSTACLES
========================================================= */

function updateObstacles(dt) {

    for (
        let i = obstacles.length - 1;
        i >= 0;
        i--
    ) {

        const obstacle =
            obstacles[i];

        obstacle.x +=
            obstacle.vx * dt;

        obstacle.y +=
            obstacle.vy * dt;

        obstacle.rotation +=
            obstacle.rotationSpeed *
            dt;


        const dx =
            player.x -
            obstacle.x;

        const dy =
            player.y -
            obstacle.y;

        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        if (
            distance <
            player.radius +
            obstacle.radius * .85
        ) {

            damagePlayer(
                obstacle
            );

            if (!running) {
                return;
            }
        }


        if (
            obstacle.x < -100 ||
            obstacle.x > W + 100 ||
            obstacle.y < -100 ||
            obstacle.y > H + 100
        ) {

            obstacles.splice(
                i,
                1
            );
        }
    }
}


/* =========================================================
   PROJECTILES
========================================================= */

function updateProjectiles(dt) {

    for (
        let i = projectiles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            projectiles[i];

        p.x +=
            p.vx * dt;

        p.y +=
            p.vy * dt;

        p.life -= dt;


        let destroyed = false;


        for (
            let j = obstacles.length - 1;
            j >= 0;
            j--
        ) {

            const obstacle =
                obstacles[j];

            const dx =
                p.x -
                obstacle.x;

            const dy =
                p.y -
                obstacle.y;

            const distance =
                Math.sqrt(
                    dx * dx +
                    dy * dy
                );


            if (
                distance <
                p.radius +
                obstacle.radius
            ) {

                createExplosion(
                    obstacle.x,
                    obstacle.y,
                    18,
                    CYAN
                );

                obstacles.splice(
                    j,
                    1
                );

                projectiles.splice(
                    i,
                    1
                );

                score +=
                    55 * multiplier;

                destroyed = true;

                break;
            }
        }


        if (destroyed) {
            continue;
        }


        if (
            p.life <= 0 ||
            p.x < -50 ||
            p.x > W + 50 ||
            p.y < -50 ||
            p.y > H + 50
        ) {

            projectiles.splice(
                i,
                1
            );
        }
    }
}


/* =========================================================
   PARTICLES
========================================================= */

function updateParticles(dt) {

    for (
        let i = particles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            particles[i];

        p.x +=
            p.vx * dt;

        p.y +=
            p.vy * dt;

        p.vx *=
            Math.pow(
                .08,
                dt
            );

        p.vy *=
            Math.pow(
                .08,
                dt
            );

        p.life -= dt;


        if (p.life <= 0) {

            particles.splice(
                i,
                1
            );
        }
    }
}


/* =========================================================
   STARS
========================================================= */

function updateStars(dt) {

    for (const star of stars) {

        star.y +=
            star.speed * dt;

        if (star.y > H + 5) {

            star.y = -5;

            star.x =
                Math.random() * W;
        }
    }
}


/* =========================================================
   GAME UPDATE
========================================================= */

function update(dt) {

    gameTime += dt;


    updatePlayer(dt);

    updateObstacles(dt);

    updateProjectiles(dt);

    updateParticles(dt);

    updateStars(dt);


    player.shotCooldown =
        Math.max(
            0,
            player.shotCooldown - dt
        );

    player.shieldCooldown =
        Math.max(
            0,
            player.shieldCooldown - dt
        );

    player.empCooldown =
        Math.max(
            0,
            player.empCooldown - dt
        );

    player.shieldTime =
        Math.max(
            0,
            player.shieldTime - dt
        );


    /* score */

    score +=
        dt *
        10 *
        multiplier;


    multiplier +=
        dt * .025;


    multiplier =
        Math.min(
            9.99,
            multiplier
        );


    /* crystals */

    if (
        Math.floor(score) % 500 < 10
    ) {

        if (
            Math.random() < dt * .4
        ) {

            runCrystals++;

            gameCrystals.textContent =
                runCrystals;
        }
    }


    /* spawn */

    spawnTimer -= dt;


    const spawnInterval =
        Math.max(
            .25,
            .9 -
            gameTime * .006
        );


    if (spawnTimer <= 0) {

        spawnObstacle();

        spawnTimer =
            spawnInterval;
    }


    /* occasional warning */

    warningTimer -= dt;

    if (
        gameTime > 20 &&
        warningTimer <= 0
    ) {

        warningTimer =
            random(18, 28);

        warning.classList.add(
            "show"
        );

        setTimeout(() => {

            warning.classList.remove(
                "show"
            );

        }, 900);
    }


    /* UI */

    scoreEl.textContent =
        Math.floor(score);

    multiplierEl.textContent =
        "×" +
        multiplier.toFixed(2);

    weaponCooldown.style.width =
        saveData.weapon
            ? (
                100 *
                (1 -
                    player.shotCooldown /
                    .48)
            ) + "%"
            : "0%";


    shieldButton.classList.toggle(
        "disabled",
        player.shieldCooldown > 0
    );

    empButton.classList.toggle(
        "disabled",
        player.empCooldown > 0
    );
}


/* =========================================================
   DRAW BACKGROUND
========================================================= */

function drawBackground() {

    ctx.fillStyle =
        "#05060b";

    ctx.fillRect(
        0,
        0,
        W,
        H
    );


    const gradient =
        ctx.createRadialGradient(
            W / 2,
            H / 2,
            0,
            W / 2,
            H / 2,
            Math.max(W, H) * .7
        );


    gradient.addColorStop(
        0,
        "rgba(0,130,180,.11)"
    );

    gradient.addColorStop(
        .5,
        "rgba(0,40,80,.04)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );


    ctx.fillStyle =
        gradient;

    ctx.fillRect(
        0,
        0,
        W,
        H
    );


    /* grid */

    const size = 70;

    ctx.strokeStyle =
        "rgba(0,180,255,.045)";

    ctx.lineWidth = 1;


    for (
        let x = 0;
        x < W;
        x += size
    ) {

        ctx.beginPath();

        ctx.moveTo(
            x,
            0
        );

        ctx.lineTo(
            x,
            H
        );

        ctx.stroke();
    }


    for (
        let y = 0;
        y < H;
        y += size
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            W,
            y
        );

        ctx.stroke();
    }


    /* stars */

    for (const star of stars) {

        ctx.globalAlpha =
            star.alpha;

        ctx.fillStyle =
            "#ffffff";

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

        const p =
            player.trail[i];

        ctx.globalAlpha =
            (i /
                player.trail.length) *
            .3;

        ctx.fillStyle =
            CYAN;

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            player.radius *
            (i /
                player.trail.length),
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    ctx.globalAlpha = 1;


    /* shield */

    if (
        player.shieldTime > 0
    ) {

        ctx.save();

        ctx.shadowBlur = 30;
        ctx.shadowColor =
            CYAN;

        ctx.strokeStyle =
            CYAN;

        ctx.lineWidth = 2;

        ctx.globalAlpha =
            .55 +
            Math.sin(
                gameTime * 8
            ) * .2;

        ctx.beginPath();

        ctx.arc(
            player.x,
            player.y,
            22 +
            Math.sin(
                gameTime * 5
            ) * 2,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        ctx.restore();
    }


    /* player */

    ctx.save();

    ctx.shadowBlur = 35;
    ctx.shadowColor =
        CYAN;

    ctx.fillStyle =
        CYAN;

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


    ctx.fillStyle =
        "#ffffff";

    ctx.beginPath();

    ctx.arc(
        player.x,
        player.y,
        player.radius * .42,
        0,
        Math.PI * 2
    );

    ctx.fill();
}


/* =========================================================
   DRAW OBSTACLES
========================================================= */

function drawObstacles() {

    for (const obstacle of obstacles) {

        ctx.save();

        ctx.translate(
            obstacle.x,
            obstacle.y
        );

        ctx.rotate(
            obstacle.rotation
        );

        ctx.shadowBlur = 25;
        ctx.shadowColor =
            RED;

        ctx.strokeStyle =
            RED;

        ctx.fillStyle =
            "rgba(255,30,80,.08)";

        ctx.lineWidth = 2;


        if (
            obstacle.type === "mine"
        ) {

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
                    i *
                    Math.PI *
                    2 /
                    8;

                ctx.beginPath();

                ctx.moveTo(
                    Math.cos(angle) *
                    obstacle.radius,

                    Math.sin(angle) *
                    obstacle.radius
                );

                ctx.lineTo(
                    Math.cos(angle) *
                    (obstacle.radius + 6),

                    Math.sin(angle) *
                    (obstacle.radius + 6)
                );

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
}


/* =========================================================
   DRAW PROJECTILES
========================================================= */

function drawProjectiles() {

    for (const p of projectiles) {

        ctx.save();

        ctx.shadowBlur = 20;
        ctx.shadowColor =
            CYAN;

        ctx.fillStyle =
            CYAN;

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}


/* =========================================================
   DRAW PARTICLES
========================================================= */

function drawParticles() {

    for (const p of particles) {

        ctx.globalAlpha =
            Math.max(
                0,
                p.life /
                p.maxLife
            );

        ctx.fillStyle =
            p.color;

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
   DRAW
========================================================= */

function draw() {

    drawBackground();

    drawObstacles();

    drawProjectiles();

    drawParticles();

    drawPlayer();
}


/* =========================================================
   LOOP
========================================================= */

function loop(time) {

    if (!running) {

        draw();

        return;
    }

    if (paused) {

        lastTime = time;

        draw();

        requestAnimationFrame(loop);

        return;
    }


    const dt =
        Math.min(
            (time - lastTime) /
                1000,
            .033
        );


    lastTime = time;


    update(dt);

    draw();


    requestAnimationFrame(loop);
}


/* =========================================================
   PAUSE
========================================================= */

function pauseGame() {

    if (!running) {
        return;
    }

    paused = true;

    pauseScreen.classList.remove(
        "hidden"
    );
}


function resumeGame() {

    paused = false;

    pauseScreen.classList.add(
        "hidden"
    );

    lastTime =
        performance.now();
}


/* =========================================================
   VIBRATION
========================================================= */

function vibrate(ms) {

    if (
        saveData.vibration &&
        navigator.vibrate
    ) {
        navigator.vibrate(ms);
    }
}


/* =========================================================
   SHOP
========================================================= */

function buyUpgrade(
    type,
    level,
    max,
    cost
) {

    if (
        saveData[type] >= max ||
        saveData.crystals < cost
    ) {
        return;
    }

    saveData.crystals -= cost;

    saveData[type]++;

    save();

    updateMenuUI();
}


document.getElementById("buyLife")
    .addEventListener(
        "click",
        () => {

            const cost =
                80 +
                (saveData.lives - 1) *
                120;

            buyUpgrade(
                "lives",
                saveData.lives,
                3,
                cost
            );
        }
    );


document.getElementById("buyWeapon")
    .addEventListener(
        "click",
        () => {

            if (
                saveData.weapon ||
                saveData.crystals < 250
            ) {
                return;
            }

            saveData.crystals -= 250;

            saveData.weapon = 1;

            save();

            updateMenuUI();
        }
    );


document.getElementById("buyDamage")
    .addEventListener(
        "click",
        () => {

            const cost =
                160 +
                (saveData.damage - 1) *
                100;

            buyUpgrade(
                "damage",
                saveData.damage,
                3,
                cost
            );
        }
    );


document.getElementById("buyShield")
    .addEventListener(
        "click",
        () => {

            const cost =
                100 +
                (saveData.shield - 1) *
                100;

            buyUpgrade(
                "shield",
                saveData.shield,
                3,
                cost
            );
        }
    );


document.getElementById("buyEmp")
    .addEventListener(
        "click",
        () => {

            const cost =
                120 +
                (saveData.emp - 1) *
                110;

            buyUpgrade(
                "emp",
                saveData.emp,
                3,
                cost
            );
        }
    );


/* =========================================================
   DAILY REWARD
========================================================= */

dailyButton.addEventListener(
    "click",
    () => {

        dailyScreen.classList.remove(
            "hidden"
        );
    }
);


claimDaily.addEventListener(
    "click",
    () => {

        const now =
            Date.now();

        const day =
            86400000;


        if (
            now -
            saveData.lastDaily <
            day
        ) {
            return;
        }


        saveData.crystals += 25;

        saveData.lastDaily =
            now;

        save();

        updateMenuUI();

        dailyScreen.classList.add(
            "hidden"
        );
    }
);


/* =========================================================
   SETTINGS
========================================================= */

document.getElementById(
    "musicToggle"
).addEventListener(
    "click",
    () => {

        saveData.music =
            !saveData.music;

        save();

        updateMenuUI();
    }
);


document.getElementById(
    "soundToggle"
).addEventListener(
    "click",
    () => {

        saveData.sound =
            !saveData.sound;

        save();

        updateMenuUI();
    }
);


document.getElementById(
    "vibrationToggle"
).addEventListener(
    "click",
    () => {

        saveData.vibration =
            !saveData.vibration;

        save();

        updateMenuUI();
    }
);


/* =========================================================
   MENU BUTTONS
========================================================= */

playButton.addEventListener(
    "click",
    startGame
);

restartButton.addEventListener(
    "click",
    startGame
);

menuButton.addEventListener(
    "click",
    returnToMenu
);

pauseMenuButton.addEventListener(
    "click",
    returnToMenu
);

pauseButton.addEventListener(
    "click",
    pauseGame
);

resumeButton.addEventListener(
    "click",
    resumeGame
);


shopButton.addEventListener(
    "click",
    () => {

        updateMenuUI();

        shopScreen.classList.remove(
            "hidden"
        );
    }
);


settingsButton.addEventListener(
    "click",
    () => {

        settingsScreen.classList.remove(
            "hidden"
        );
    }
);


feedbackButton.addEventListener(
    "click",
    () => {

        feedbackScreen.classList.remove(
            "hidden"
        );
    }
);


/* =========================================================
   CLOSE PANELS
========================================================= */

document.querySelectorAll(
    "[data-close]"
).forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const id =
                button.dataset.close;

            document
                .getElementById(id)
                .classList.add(
                    "hidden"
                );
        }
    );
});


/* =========================================================
   INITIALIZATION
========================================================= */

resize();

updateMenuUI();

draw();