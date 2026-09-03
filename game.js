// ============================================================
// NEON DODGE — GAME.JS
// Dynamic Events / Endless Chaos / Buffs / Lasers / Hunter
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;
let dpr = 1;

// ============================================================
// SAVE
// ============================================================

const SAVE_KEY = "neonDodgeData";

const defaultData = {
    crystals: 300,
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

let saveData = {};

try {
    saveData = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
} catch {
    saveData = {};
}

saveData = {
    ...defaultData,
    ...saveData
};

if (typeof saveData.crystals !== "number") saveData.crystals = 300;

function save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

// ============================================================
// DOM
// ============================================================

const menu = document.getElementById("menu");
const shop = document.getElementById("shop");
const settings = document.getElementById("settings");
const feedback = document.getElementById("feedback");
const daily = document.getElementById("daily");
const gameOverScreen = document.getElementById("gameOver");
const pauseScreen = document.getElementById("pause");

const hud = document.getElementById("hud");

const scoreEl = document.getElementById("score");
const multiplierEl = document.getElementById("multiplier");
const bestEl = document.getElementById("best");
const crystalsEl = document.getElementById("crystals");

const healthEl = document.getElementById("health");
const shieldButton = document.getElementById("shieldButton");
const empButton = document.getElementById("empButton");

const finalScoreEl = document.getElementById("finalScore");
const finalBestEl = document.getElementById("finalBest");
const finalRewardEl = document.getElementById("finalReward");

const toast = document.getElementById("toast");
const eventWarning = document.getElementById("eventWarning");


// ============================================================
// SAFE ELEMENT HELPERS
// ============================================================

function on(id, event, fn) {
    const el = document.getElementById(id);

    if (!el) return;

    el.addEventListener(event, function (e) {
        e.preventDefault();
        e.stopPropagation();
        fn(e);
    });
}

function text(id, value) {
    const el = document.getElementById(id);

    if (el) {
        el.textContent = value;
    }
}


// ============================================================
// RESIZE
// ============================================================

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (player) {
        player.x = Math.max(
            player.radius,
            Math.min(W - player.radius, player.x)
        );

        player.y = Math.max(
            player.radius,
            Math.min(H - player.radius, player.y)
        );
    }
}

window.addEventListener("resize", resize);


// ============================================================
// GAME STATE
// ============================================================

let running = false;
let paused = false;
let gameOver = false;

let lastTime = 0;

let score = 0;
let gameTime = 0;
let multiplier = 1;

let player = null;

let obstacles = [];
let particles = [];
let projectiles = [];
let stars = [];
let crystalsOnMap = [];

let eventObjects = [];

let spawnTimer = 0;
let crystalTimer = 0;
let buffTimer = 0;
let weaponTimer = 0;

let eventTimer = 0;
let nextEvent = 12;

let shake = 0;

let reviveUsed = false;

let activeBuffs = {};

let shieldCooldown = 0;
let empCooldown = 0;

let invincibleTimer = 0;

let eventBusy = false;

let currentEra = 0;


// ============================================================
// PLAYER
// ============================================================

function createPlayer() {
    return {
        x: W / 2,
        y: H * 0.72,

        targetX: W / 2,
        targetY: H * 0.72,

        radius: 13,

        speed: 520,

        lives: saveData.lives,

        invincible: 0,

        shield: false,

        trail: []
    };
}


// ============================================================
// STARS
// ============================================================

function createStars() {
    stars = [];

    const amount = Math.max(70, Math.floor((W * H) / 10000));

    for (let i = 0; i < amount; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: Math.random() * 1.8 + 0.4,
            speed: Math.random() * 25 + 10,
            alpha: Math.random() * 0.7 + 0.2
        });
    }
}


// ============================================================
// SCREENS
// ============================================================

function showScreen(screen) {
    const screens = [
        menu,
        shop,
        settings,
        feedback,
        daily,
        gameOverScreen,
        pauseScreen
    ];

    screens.forEach(s => {
        if (s) s.classList.remove("active");
    });

    if (screen) {
        screen.classList.add("active");
    }
}

function hideScreens() {
    const screens = [
        menu,
        shop,
        settings,
        feedback,
        daily,
        gameOverScreen,
        pauseScreen
    ];

    screens.forEach(s => {
        if (s) s.classList.remove("active");
    });
}


// ============================================================
// MENU
// ============================================================

function updateMenuUI() {
    text("crystals", saveData.crystals);
    text("best", Math.floor(saveData.best));

    text("lifeLevel", saveData.lives);
    text("weaponLevel", saveData.weapon);
    text("damageLevel", saveData.damage);
    text("shieldLevel", saveData.shield);
    text("empLevel", saveData.emp);

    updateShopButtons();
}

function updateShopButtons() {
    const costs = {
        buyLife: 80 + Math.max(0, saveData.lives - 1) * 120,
        buyWeapon: 250 + saveData.weapon * 180,
        buyDamage: 160 + Math.max(0, saveData.damage - 1) * 100,
        buyShield: 100 + Math.max(0, saveData.shield - 1) * 100,
        buyEmp: 120 + Math.max(0, saveData.emp - 1) * 110
    };

    const max = {
        buyLife: 5,
        buyWeapon: 3,
        buyDamage: 5,
        buyShield: 5,
        buyEmp: 5
    };

    Object.keys(costs).forEach(id => {
        const btn = document.getElementById(id);

        if (!btn) return;

        const type =
            id === "buyLife" ? "lives" :
            id === "buyWeapon" ? "weapon" :
            id === "buyDamage" ? "damage" :
            id === "buyShield" ? "shield" :
            "emp";

        if (saveData[type] >= max[id]) {
            btn.disabled = true;
            btn.textContent = "MAX";
        } else {
            btn.disabled = saveData.crystals < costs[id];
            btn.textContent = `${costs[id]} 💎`;
        }
    });
}


// ============================================================
// SHOP
// ============================================================

function buyUpgrade(type) {
    let cost = 0;
    let max = 5;

    if (type === "lives") {
        cost = 80 + Math.max(0, saveData.lives - 1) * 120;
        max = 5;
    }

    if (type === "weapon") {
        cost = 250 + saveData.weapon * 180;
        max = 3;
    }

    if (type === "damage") {
        cost = 160 + Math.max(0, saveData.damage - 1) * 100;
        max = 5;
    }

    if (type === "shield") {
        cost = 100 + Math.max(0, saveData.shield - 1) * 100;
        max = 5;
    }

    if (type === "emp") {
        cost = 120 + Math.max(0, saveData.emp - 1) * 110;
        max = 5;
    }

    if (saveData[type] >= max) {
        showToast("MAX LEVEL");
        return;
    }

    if (saveData.crystals < cost) {
        showToast("NOT ENOUGH CRYSTALS");
        return;
    }

    saveData.crystals -= cost;
    saveData[type]++;

    save();
    updateMenuUI();

    showToast("UPGRADE PURCHASED");

    burst(W / 2, H / 2, 20);
}

on("buyLife", "click", () => buyUpgrade("lives"));
on("buyWeapon", "click", () => buyUpgrade("weapon"));
on("buyDamage", "click", () => buyUpgrade("damage"));
on("buyShield", "click", () => buyUpgrade("shield"));
on("buyEmp", "click", () => buyUpgrade("emp"));


// ============================================================
// SETTINGS
// ============================================================

function updateSettingsUI() {
    const music = document.getElementById("musicToggle");
    const sound = document.getElementById("soundToggle");
    const vibration = document.getElementById("vibrationToggle");

    if (music) music.checked = !!saveData.music;
    if (sound) sound.checked = !!saveData.sound;
    if (vibration) vibration.checked = !!saveData.vibration;
}

on("musicToggle", "change", e => {
    saveData.music = e.target.checked;
    save();
});

on("soundToggle", "change", e => {
    saveData.sound = e.target.checked;
    save();
});

on("vibrationToggle", "change", e => {
    saveData.vibration = e.target.checked;
    save();
});


// ============================================================
// DAILY
// ============================================================

function updateDailyUI() {
    const button = document.getElementById("claimDaily");

    if (!button) return;

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    if (now - saveData.lastDaily >= day) {
        button.disabled = false;
        button.textContent = "CLAIM";
    } else {
        button.disabled = true;
        button.textContent = "CLAIMED";
    }
}

on("claimDaily", "click", () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    if (now - saveData.lastDaily < day) {
        showToast("COME BACK TOMORROW");
        return;
    }

    saveData.crystals += 100;
    saveData.lastDaily = now;

    save();
    updateMenuUI();
    updateDailyUI();

    showToast("+100 CRYSTALS");
});


// ============================================================
// TOAST
// ============================================================

let toastTimer = null;

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 1800);
}


// ============================================================
// INPUT
// ============================================================

function setPlayerTarget(x, y) {
    if (!player || !running || paused || gameOver) return;

    player.targetX = Math.max(
        player.radius,
        Math.min(W - player.radius, x)
    );

    player.targetY = Math.max(
        player.radius,
        Math.min(H - player.radius, y)
    );
}

canvas.addEventListener("pointerdown", e => {
    setPlayerTarget(e.clientX, e.clientY);
});

canvas.addEventListener("pointermove", e => {
    if (e.buttons) {
        setPlayerTarget(e.clientX, e.clientY);
    }
});

let keys = {};

window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;

    if (
        e.key === " " ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
    ) {
        e.preventDefault();
    }

    if (e.key === " ") {
        shoot();
    }

    if (e.key.toLowerCase() === "e") {
        useEMP();
    }

    if (e.key.toLowerCase() === "q") {
        useShield();
    }

    if (e.key === "Escape") {
        togglePause();
    }
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});


// ============================================================
// GAME START
// ============================================================

function startGame() {
    hideScreens();

    if (hud) {
        hud.style.display = "flex";
    }

    running = true;
    paused = false;
    gameOver = false;

    score = 0;
    gameTime = 0;
    multiplier = 1;

    spawnTimer = 0;
    crystalTimer = 0;
    buffTimer = 0;
    weaponTimer = 0;

    eventTimer = 0;
    nextEvent = 10 + Math.random() * 4;

    shake = 0;

    reviveUsed = false;

    activeBuffs = {};

    shieldCooldown = 0;
    empCooldown = 0;
    invincibleTimer = 0;

    eventBusy = false;
    currentEra = 0;

    obstacles = [];
    particles = [];
    projectiles = [];
    crystalsOnMap = [];
    eventObjects = [];

    player = createPlayer();

    createStars();

    lastTime = performance.now();

    requestAnimationFrame(loop);
}


// ============================================================
// PAUSE
// ============================================================

function togglePause() {
    if (!running || gameOver) return;

    if (paused) {
        resumeGame();
    } else {
        paused = true;
        showScreen(pauseScreen);
    }
}

function resumeGame() {
    paused = false;
    hideScreens();

    if (hud) {
        hud.style.display = "flex";
    }

    lastTime = performance.now();
}

on("pauseButton", "click", togglePause);
on("resumeButton", "click", resumeGame);

on("pauseMenuButton", "click", () => {
    running = false;
    paused = false;

    if (hud) hud.style.display = "none";

    updateMenuUI();
    showScreen(menu);
});


// ============================================================
// NAVIGATION
// ============================================================

on("playButton", "click", startGame);

on("shopButton", "click", () => {
    updateMenuUI();
    showScreen(shop);
});

on("settingsButton", "click", () => {
    updateSettingsUI();
    showScreen(settings);
});

on("feedbackButton", "click", () => {
    showScreen(feedback);
});

on("dailyButton", "click", () => {
    updateDailyUI();
    showScreen(daily);
});


// BACK BUTTONS
[
    "shopBack",
    "settingsBack",
    "feedbackBack",
    "dailyBack"
].forEach(id => {
    on(id, "click", () => {
        updateMenuUI();
        showScreen(menu);
    });
});


// ============================================================
// DIFFICULTY
// ============================================================

function difficulty() {
    const t = gameTime;

    let speed = 170;
    let spawn = 0.75;
    let size = 15;
    let amount = 1;

    // 0–60 sec
    if (t < 60) {
        const p = t / 60;

        speed = 170 + p * 65;
        spawn = 0.75 - p * 0.08;
        size = 15 + p * 3;
        amount = 1;
    }

    // 60–120 sec
    else if (t < 120) {
        const p = (t - 60) / 60;

        speed = 235 + p * 70;
        spawn = 0.67 - p * 0.10;
        size = 18 + p * 4;
        amount = 1 + Math.floor(p);
    }

    // 120–180 sec
    else if (t < 180) {
        const p = (t - 120) / 60;

        speed = 305 + p * 70;
        spawn = 0.57 - p * 0.10;
        size = 22 + p * 4;
        amount = 2;
    }

    // 180–300 sec
    else if (t < 300) {
        const p = (t - 180) / 120;

        speed = 375 + p * 90;
        spawn = 0.47 - p * 0.12;
        size = 25 + p * 5;
        amount = 2 + Math.floor(p * 2);
    }

    // 5+ minutes
    else {
        const p = Math.min((t - 300) / 300, 2);

        speed = 465 + p * 100;
        spawn = 0.35 - p * 0.06;
        size = 30 + p * 7;
        amount = 3 + Math.floor(p);
    }

    return {
        speed,
        spawn: Math.max(0.19, spawn),
        size,
        amount
    };
}


// ============================================================
// ERA SYSTEM
// ============================================================

function updateEra() {
    let era = 0;

    if (gameTime >= 300) era = 5;
    else if (gameTime >= 180) era = 4;
    else if (gameTime >= 120) era = 3;
    else if (gameTime >= 60) era = 2;
    else if (gameTime >= 30) era = 1;

    if (era !== currentEra) {
        currentEra = era;

        if (era === 1) {
            showEventMessage("SYSTEM ONLINE");
        }

        if (era === 2) {
            showEventMessage("THREAT LEVEL: HIGH");
        }

        if (era === 3) {
            showEventMessage("CHAOS PROTOCOL");
        }

        if (era === 4) {
            showEventMessage("CRITICAL LEVEL");
        }

        if (era === 5) {
            showEventMessage("ENDLESS CHAOS");
        }
    }
}


// ============================================================
// OBSTACLES
// ============================================================

function spawnObstacle() {
    const d = difficulty();

    const typeRoll = Math.random();

    let type = "normal";

    if (gameTime >= 30 && typeRoll < 0.20) {
        type = "fast";
    }

    if (gameTime >= 60 && typeRoll < 0.35) {
        type = "zigzag";
    }

    if (gameTime >= 120 && typeRoll < 0.25) {
        type = "seeker";
    }

    const radius = d.size * (0.8 + Math.random() * 0.7);

    obstacles.push({
        x: radius + Math.random() * (W - radius * 2),
        y: -radius - 20,

        radius,

        speed:
            d.speed *
            (type === "fast" ? 1.35 :
             type === "seeker" ? 0.8 :
             0.85 + Math.random() * 0.35),

        type,

        hp:
            1 +
            (gameTime >= 90 ? 1 : 0) +
            (gameTime >= 180 ? 1 : 0),

        phase: Math.random() * Math.PI * 2,
        angle: Math.random() * Math.PI * 2
    });
}

function spawnObstacleWave() {
    const d = difficulty();

    for (let i = 0; i < d.amount; i++) {
        setTimeout(() => {
            if (!running || paused || gameOver) return;

            spawnObstacle();
        }, i * 100);
    }
}


// ============================================================
// CRYSTALS
// ============================================================

function spawnCrystal() {
    crystalsOnMap.push({
        x: 25 + Math.random() * (W - 50),
        y: -30,
        radius: 8,
        speed: difficulty().speed * 0.55,
        rotation: Math.random() * Math.PI
    });
}


// ============================================================
// BUFFS
// ============================================================

const buffList = [
    {
        type: "LASER",
        duration: 9
    },
    {
        type: "MAGNET",
        duration: 10
    },
    {
        type: "SHIELD",
        duration: 8
    },
    {
        type: "DOUBLE",
        duration: 10
    },
    {
        type: "SLOW",
        duration: 7
    }
];

function spawnBuff() {
    const b = buffList[Math.floor(Math.random() * buffList.length)];

    eventObjects.push({
        kind: "buff",
        type: b.type,

        x: 25 + Math.random() * (W - 50),
        y: -30,

        radius: 12,
        speed: difficulty().speed * 0.5,

        life: 20
    });
}

function activateBuff(type, duration) {
    activeBuffs[type] = duration;

    showEventMessage(type + " ACTIVATED");

    burst(player.x, player.y, 25);
}

function updateBuffs(dt) {
    Object.keys(activeBuffs).forEach(type => {
        activeBuffs[type] -= dt;

        if (activeBuffs[type] <= 0) {
            delete activeBuffs[type];
        }
    });
}

function hasBuff(type) {
    return activeBuffs[type] > 0;
}


// ============================================================
// EVENTS
// ============================================================

function showEventMessage(message) {
    if (!eventWarning) return;

    eventWarning.textContent = message;
    eventWarning.classList.add("show");

    setTimeout(() => {
        if (eventWarning) {
            eventWarning.classList.remove("show");
        }
    }, 1500);
}

function scheduleNextEvent() {
    let min = 13;
    let max = 20;

    if (gameTime >= 60) {
        min = 9;
        max = 16;
    }

    if (gameTime >= 120) {
        min = 7;
        max = 13;
    }

    if (gameTime >= 180) {
        min = 5;
        max = 11;
    }

    if (gameTime >= 300) {
        min = 4;
        max = 9;
    }

    nextEvent = min + Math.random() * (max - min);
}

function chooseEvent() {
    if (eventBusy) return;

    let pool = [
        "laserSweep",
        "laserStrike"
    ];

    if (gameTime >= 60) {
        pool.push("hunter");
        pool.push("meteor");
    }

    if (gameTime >= 120) {
        pool.push("electric");
        pool.push("crystalRush");
    }

    if (gameTime >= 180) {
        pool.push("redAlert");
        pool.push("overcharge");
        pool.push("laserStorm");
    }

    if (gameTime >= 300) {
        pool.push("chaos");
        pool.push("hunter");
        pool.push("meteor");
        pool.push("laserStorm");
    }

    const event =
        pool[Math.floor(Math.random() * pool.length)];

    runEvent(event);
}


// ============================================================
// LASER SWEEP
// ============================================================

function laserSweep() {
    eventBusy = true;

    showEventMessage("LASER SWEEP");

    const y = H * (0.25 + Math.random() * 0.55);

    setTimeout(() => {
        if (!running || gameOver) {
            eventBusy = false;
            return;
        }

        eventObjects.push({
            kind: "laser",
            orientation: "horizontal",
            x: 0,
            y,

            width: 8,

            life: 2.2,

            damage: true
        });

        shake = 8;

        setTimeout(() => {
            eventBusy = false;
        }, 2200);

    }, 1100);
}


// ============================================================
// LASER STRIKE
// ============================================================

function laserStrike() {
    eventBusy = true;

    showEventMessage("LASER STRIKE");

    const vertical = Math.random() < 0.5;

    const position =
        vertical
            ? W * (0.12 + Math.random() * 0.76)
            : H * (0.20 + Math.random() * 0.60);

    setTimeout(() => {
        if (!running || gameOver) {
            eventBusy = false;
            return;
        }

        eventObjects.push({
            kind: "laser",
            orientation: vertical ? "vertical" : "horizontal",

            x: vertical ? position : 0,
            y: vertical ? 0 : position,

            width: 12,

            life: 1.6,

            damage: true
        });

        shake = 12;

        setTimeout(() => {
            eventBusy = false;
        }, 1600);

    }, 1000);
}


// ============================================================
// HUNTER
// ============================================================

function hunterEvent() {
    eventBusy = true;

    showEventMessage("HUNTER DETECTED");

    setTimeout(() => {
        if (!running || gameOver) {
            eventBusy = false;
            return;
        }

        const side = Math.floor(Math.random() * 4);

        let x;
        let y;

        if (side === 0) {
            x = -30;
            y = Math.random() * H;
        } else if (side === 1) {
            x = W + 30;
            y = Math.random() * H;
        } else if (side === 2) {
            x = Math.random() * W;
            y = -30;
        } else {
            x = Math.random() * W;
            y = H + 30;
        }

        eventObjects.push({
            kind: "hunter",

            x,
            y,

            radius: 19,

            speed: 160 + Math.min(gameTime * 0.6, 150),

            life: 10,

            rotation: 0
        });

        setTimeout(() => {
            eventBusy = false;
        }, 1000);

    }, 800);
}


// ============================================================
// METEOR
// ============================================================

function meteorEvent() {
    eventBusy = true;

    showEventMessage("METEOR RAIN");

    const amount =
        gameTime >= 300 ? 18 :
        gameTime >= 180 ? 15 :
        11;

    for (let i = 0; i < amount; i++) {
        setTimeout(() => {
            if (!running || gameOver) return;

            eventObjects.push({
                kind: "meteor",

                x: Math.random() * W,
                y: -50,

                radius: 9 + Math.random() * 12,

                speed: difficulty().speed *
                    (1.0 + Math.random() * 0.7),

                rotation: Math.random() * Math.PI
            });
        }, i * 160);
    }

    setTimeout(() => {
        eventBusy = false;
    }, amount * 160 + 1000);
}


// ============================================================
// ELECTRIC FIELD
// ============================================================

function electricEvent() {
    eventBusy = true;

    showEventMessage("ELECTRIC FIELD");

    const x = W * (0.15 + Math.random() * 0.7);

    eventObjects.push({
        kind: "electric",

        x,
        y: H / 2,

        width: 75,
        height: H,

        life: 6
    });

    setTimeout(() => {
        eventBusy = false;
    }, 6000);
}


// ============================================================
// CRYSTAL RUSH
// ============================================================

function crystalRush() {
    eventBusy = true;

    showEventMessage("CRYSTAL RUSH");

    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            if (!running || gameOver) return;

            crystalsOnMap.push({
                x: 20 + Math.random() * (W - 40),
                y: -20,
                radius: 8,
                speed: difficulty().speed * 0.45,
                rotation: Math.random() * Math.PI
            });
        }, i * 90);
    }

    setTimeout(() => {
        eventBusy = false;
    }, 4500);
}


// ============================================================
// RED ALERT
// ============================================================

function redAlert() {
    eventBusy = true;

    showEventMessage("RED ALERT");

    eventObjects.push({
        kind: "alert",
        life: 5
    });

    setTimeout(() => {
        eventBusy = false;
    }, 5000);
}


// ============================================================
// OVERCHARGE
// ============================================================

function overcharge() {
    eventBusy = true;

    showEventMessage("OVERCHARGE");

    activateBuff("LASER", 6);
    activateBuff("DOUBLE", 8);
    activateBuff("SHIELD", 6);
    activateBuff("SLOW", 5);

    burst(player.x, player.y, 70);

    setTimeout(() => {
        eventBusy = false;
    }, 3000);
}


// ============================================================
// LASER STORM
// ============================================================

function laserStorm() {
    eventBusy = true;

    showEventMessage("LASER STORM");

    const amount = gameTime >= 300 ? 7 : 5;

    for (let i = 0; i < amount; i++) {
        setTimeout(() => {
            if (!running || gameOver) return;

            const vertical = Math.random() < 0.5;

            const position =
                vertical
                    ? 40 + Math.random() * (W - 80)
                    : 100 + Math.random() * (H - 200);

            eventObjects.push({
                kind: "laser",
                orientation: vertical ? "vertical" : "horizontal",

                x: vertical ? position : 0,
                y: vertical ? 0 : position,

                width: 9,

                life: 1.2,

                damage: true
            });

            shake = 7;
        }, i * 500);
    }

    setTimeout(() => {
        eventBusy = false;
    }, amount * 500 + 1500);
}


// ============================================================
// CHAOS
// ============================================================

function chaosEvent() {
    eventBusy = true;

    showEventMessage("CHAOS MODE");

    laserStorm();

    setTimeout(() => {
        if (running && !gameOver) {
            meteorEvent();
        }
    }, 1800);

    setTimeout(() => {
        if (running && !gameOver) {
            hunterEvent();
        }
    }, 3500);

    setTimeout(() => {
        eventBusy = false;
    }, 7000);
}


// ============================================================
// EVENT DISPATCH
// ============================================================

function runEvent(type) {
    switch (type) {
        case "laserSweep":
            laserSweep();
            break;

        case "laserStrike":
            laserStrike();
            break;

        case "hunter":
            hunterEvent();
            break;

        case "meteor":
            meteorEvent();
            break;

        case "electric":
            electricEvent();
            break;

        case "crystalRush":
            crystalRush();
            break;

        case "redAlert":
            redAlert();
            break;

        case "overcharge":
            overcharge();
            break;

        case "laserStorm":
            laserStorm();
            break;

        case "chaos":
            chaosEvent();
            break;
    }
}


// ============================================================
// EVENT UPDATE
// ============================================================

function updateEvents(dt) {
    for (let i = eventObjects.length - 1; i >= 0; i--) {
        const obj = eventObjects[i];

        if (obj.kind === "buff") {
            obj.y += obj.speed * dt;

            obj.life -= dt;

            if (
                obj.y > H + 50 ||
                obj.life <= 0
            ) {
                eventObjects.splice(i, 1);
                continue;
            }

            if (distance(
                obj.x,
                obj.y,
                player.x,
                player.y
            ) < obj.radius + player.radius) {

                const buff = buffList.find(
                    b => b.type === obj.type
                );

                if (buff) {
                    activateBuff(
                        buff.type,
                        buff.duration
                    );
                }

                eventObjects.splice(i, 1);

                continue;
            }
        }


        if (obj.kind === "hunter") {
            obj.life -= dt;

            const dx = player.x - obj.x;
            const dy = player.y - obj.y;

            const len = Math.hypot(dx, dy) || 1;

            obj.x += dx / len * obj.speed * dt;
            obj.y += dy / len * obj.speed * dt;

            obj.rotation = Math.atan2(dy, dx);

            if (
                distance(
                    obj.x,
                    obj.y,
                    player.x,
                    player.y
                ) < obj.radius + player.radius
            ) {
                damagePlayer();

                obj.x -= dx / len * 35;
                obj.y -= dy / len * 35;
            }

            if (obj.life <= 0) {
                eventObjects.splice(i, 1);
            }
        }


        if (obj.kind === "meteor") {
            obj.y += obj.speed * dt;

            obj.rotation += dt * 3;

            if (
                distance(
                    obj.x,
                    obj.y,
                    player.x,
                    player.y
                ) < obj.radius + player.radius
            ) {
                damagePlayer();
                burst(obj.x, obj.y, 15);

                eventObjects.splice(i, 1);
                continue;
            }

            if (obj.y > H + 70) {
                eventObjects.splice(i, 1);
            }
        }


        if (obj.kind === "laser") {
            obj.life -= dt;

            let hit = false;

            if (obj.orientation === "horizontal") {
                hit =
                    Math.abs(player.y - obj.y) <
                    player.radius + obj.width;
            } else {
                hit =
                    Math.abs(player.x - obj.x) <
                    player.radius + obj.width;
            }

            if (hit) {
                damagePlayer();
            }

            if (obj.life <= 0) {
                eventObjects.splice(i, 1);
            }
        }


        if (obj.kind === "electric") {
            obj.life -= dt;

            if (
                Math.abs(player.x - obj.x) <
                obj.width / 2
            ) {
                damagePlayer();
            }

            if (obj.life <= 0) {
                eventObjects.splice(i, 1);
            }
        }


        if (obj.kind === "alert") {
            obj.life -= dt;

            if (obj.life <= 0) {
                eventObjects.splice(i, 1);
            }
        }
    }
}


// ============================================================
// OBSTACLE UPDATE
// ============================================================

function updateObstacles(dt) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];

        o.y += o.speed * dt;

        if (o.type === "zigzag") {
            o.x += Math.sin(
                gameTime * 3 + o.phase
            ) * 90 * dt;
        }

        if (o.type === "seeker") {
            const dx = player.x - o.x;
            const dy = player.y - o.y;

            const len = Math.hypot(dx, dy) || 1;

            o.x +=
                dx / len *
                70 *
                dt;
        }

        o.x = Math.max(
            o.radius,
            Math.min(W - o.radius, o.x)
        );

        if (
            distance(
                o.x,
                o.y,
                player.x,
                player.y
            ) <
            o.radius + player.radius
        ) {
            damagePlayer();

            o.hp--;

            if (o.hp <= 0) {
                burst(o.x, o.y, 15);
                obstacles.splice(i, 1);
            }

            continue;
        }

        if (o.y > H + o.radius + 60) {
            obstacles.splice(i, 1);
        }
    }
}


// ============================================================
// CRYSTAL UPDATE
// ============================================================

function updateCrystals(dt) {
    for (let i = crystalsOnMap.length - 1; i >= 0; i--) {
        const c = crystalsOnMap[i];

        c.y += c.speed * dt;
        c.rotation += dt * 3;

        let pickupDistance = 45;

        if (hasBuff("MAGNET")) {
            pickupDistance = 150;

            const dx = player.x - c.x;
            const dy = player.y - c.y;

            const len = Math.hypot(dx, dy) || 1;

            c.x += dx / len * 260 * dt;
            c.y += dy / len * 260 * dt;
        }

        if (
            distance(
                c.x,
                c.y,
                player.x,
                player.y
            ) < pickupDistance
        ) {
            saveData.crystals += 1;

            burst(c.x, c.y, 10);

            crystalsOnMap.splice(i, 1);

            continue;
        }

        if (c.y > H + 40) {
            crystalsOnMap.splice(i, 1);
        }
    }
}


// ============================================================
// PLAYER UPDATE
// ============================================================

function updatePlayer(dt) {
    if (!player) return;

    if (keys["arrowleft"] || keys["a"]) {
        player.targetX -= player.speed * dt;
    }

    if (keys["arrowright"] || keys["d"]) {
        player.targetX += player.speed * dt;
    }

    if (keys["arrowup"] || keys["w"]) {
        player.targetY -= player.speed * dt;
    }

    if (keys["arrowdown"] || keys["s"]) {
        player.targetY += player.speed * dt;
    }

    player.targetX = Math.max(
        player.radius,
        Math.min(W - player.radius, player.targetX)
    );

    player.targetY = Math.max(
        player.radius,
        Math.min(H - player.radius, player.targetY)
    );

    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;

    const smoothing = Math.min(1, dt * 12);

    player.x += dx * smoothing;
    player.y += dy * smoothing;

    player.trail.push({
        x: player.x,
        y: player.y,
        life: 0.35
    });

    if (player.trail.length > 18) {
        player.trail.shift();
    }

    player.trail.forEach(p => {
        p.life -= dt;
    });

    player.invincible -= dt;

    if (invincibleTimer > 0) {
        invincibleTimer -= dt;
    }
}


// ============================================================
// DAMAGE
// ============================================================

function damagePlayer() {
    if (!player) return;

    if (
        player.invincible > 0 ||
        invincibleTimer > 0
    ) {
        return;
    }

    if (player.shield) {
        player.shield = false;
        player.invincible = 1.2;

        burst(player.x, player.y, 30);

        showToast("SHIELD BROKEN");

        return;
    }

    if (hasBuff("SHIELD")) {
        delete activeBuffs.SHIELD;

        player.invincible = 1.5;

        burst(player.x, player.y, 30);

        showToast("ENERGY SHIELD BROKEN");

        return;
    }

    player.lives--;

    shake = 16;

    burst(player.x, player.y, 30);

    if (saveData.vibration && navigator.vibrate) {
        navigator.vibrate(80);
    }

    if (player.lives <= 0) {
        endGame();
    } else {
        player.invincible = 2;

        showToast("HIT!");
    }
}


// ============================================================
// WEAPON
// ============================================================

function shoot() {
    if (!running || paused || gameOver) return;

    if (saveData.weapon <= 0 && !hasBuff("LASER")) {
        return;
    }

    const target = findNearestObstacle();

    let angle = -Math.PI / 2;

    if (target) {
        angle = Math.atan2(
            target.y - player.y,
            target.x - player.x
        );
    }

    projectiles.push({
        x: player.x,
        y: player.y,

        vx: Math.cos(angle) * 850,
        vy: Math.sin(angle) * 850,

        radius: 4,

        damage:
            saveData.damage +
            (hasBuff("DOUBLE") ? 1 : 0)
    });
}

function findNearestObstacle() {
    let nearest = null;
    let bestDistance = Infinity;

    obstacles.forEach(o => {
        const d = distance(
            o.x,
            o.y,
            player.x,
            player.y
        );

        if (d < bestDistance) {
            bestDistance = d;
            nearest = o;
        }
    });

    return nearest;
}

function updateWeapon(dt) {
    if (
        saveData.weapon > 0 ||
        hasBuff("LASER")
    ) {
        weaponTimer -= dt;

        if (weaponTimer <= 0) {
            weaponTimer =
                Math.max(
                    0.18,
                    0.65 - saveData.weapon * 0.1
                );

            shoot();
        }
    }

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        let removed = false;

        for (let j = obstacles.length - 1; j >= 0; j--) {
            const o = obstacles[j];

            if (
                distance(
                    p.x,
                    p.y,
                    o.x,
                    o.y
                ) <
                p.radius + o.radius
            ) {
                o.hp -= p.damage;

                burst(p.x, p.y, 7);

                if (o.hp <= 0) {
                    score += 20;
                    burst(o.x, o.y, 18);
                    obstacles.splice(j, 1);
                }

                projectiles.splice(i, 1);
                removed = true;

                break;
            }
        }

        if (removed) continue;

        if (
            p.x < -50 ||
            p.x > W + 50 ||
            p.y < -50 ||
            p.y > H + 50
        ) {
            projectiles.splice(i, 1);
        }
    }


    // Temporary LASER buff
    if (hasBuff("LASER")) {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];

            if (
                Math.abs(o.x - player.x) <
                o.radius + 12
            ) {
                burst(o.x, o.y, 10);
                obstacles.splice(i, 1);
                score += 15;
            }
        }
    }
}


// ============================================================
// SHIELD
// ============================================================

function useShield() {
    if (!running || paused || gameOver) return;

    if (shieldCooldown > 0) {
        return;
    }

    if (saveData.shield <= 0) {
        showToast("NO SHIELD");
        return;
    }

    player.shield = true;

    shieldCooldown =
        Math.max(
            8,
            20 - saveData.shield * 2
        );

    showToast("SHIELD ONLINE");
}

on("shieldButton", "click", useShield);


// ============================================================
// EMP
// ============================================================

function useEMP() {
    if (!running || paused || gameOver) return;

    if (empCooldown > 0) {
        return;
    }

    if (saveData.emp <= 0) {
        showToast("NO EMP");
        return;
    }

    const radius =
        220 +
        saveData.emp * 55;

    let destroyed = 0;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];

        if (
            distance(
                player.x,
                player.y,
                o.x,
                o.y
            ) < radius
        ) {
            burst(o.x, o.y, 12);

            obstacles.splice(i, 1);

            destroyed++;
        }
    }

    for (let i = eventObjects.length - 1; i >= 0; i--) {
        const o = eventObjects[i];

        if (
            o.kind === "hunter" ||
            o.kind === "meteor"
        ) {
            if (
                distance(
                    player.x,
                    player.y,
                    o.x,
                    o.y
                ) < radius
            ) {
                eventObjects.splice(i, 1);
                destroyed++;
            }
        }
    }

    empCooldown =
        Math.max(
            12,
            30 - saveData.emp * 3
        );

    showToast("EMP: " + destroyed + " TARGETS");

    burst(player.x, player.y, 60);
}

on("empButton", "click", useEMP);


// ============================================================
// COLLISION HELPERS
// ============================================================

function distance(x1, y1, x2, y2) {
    return Math.hypot(
        x2 - x1,
        y2 - y1
    );
}


// ============================================================
// PARTICLES
// ============================================================

function burst(x, y, amount = 20) {
    for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 300;

        particles.push({
            x,
            y,

            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,

            life: 0.3 + Math.random() * 0.7,

            maxLife: 1,

            size: 1 + Math.random() * 3
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        p.vx *= 0.97;
        p.vy *= 0.97;

        p.life -= dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}


// ============================================================
// BACKGROUND
// ============================================================

function updateStars(dt) {
    stars.forEach(s => {
        s.y += s.speed * dt;

        if (s.y > H) {
            s.y = -5;
            s.x = Math.random() * W;
        }
    });
}

function drawBackground() {
    ctx.fillStyle = "#05060b";
    ctx.fillRect(0, 0, W, H);

    // stars
    stars.forEach(s => {
        ctx.globalAlpha = s.alpha;

        ctx.fillStyle = "#8ca7ff";

        ctx.beginPath();
        ctx.arc(
            s.x,
            s.y,
            s.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    ctx.globalAlpha = 1;

    // grid
    const grid = 60;

    ctx.strokeStyle = "rgba(50,100,180,0.08)";
    ctx.lineWidth = 1;

    for (let x = 0; x < W; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }

    for (let y = 0; y < H; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    // danger vignette
    if (gameTime > 180) {
        const intensity =
            Math.min(
                0.32,
                (gameTime - 180) / 500
            );

        const gradient = ctx.createRadialGradient(
            W / 2,
            H / 2,
            H * 0.15,
            W / 2,
            H / 2,
            H * 0.8
        );

        gradient.addColorStop(
            0,
            "rgba(255,0,80,0)"
        );

        gradient.addColorStop(
            1,
            `rgba(255,0,80,${intensity})`
        );

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
    }
}


// ============================================================
// DRAW PLAYER
// ============================================================

function drawPlayer() {
    if (!player) return;

    // trail
    player.trail.forEach(p => {
        ctx.globalAlpha =
            Math.max(0, p.life) * 0.45;

        ctx.fillStyle = "#00eaff";

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            player.radius * 0.6,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    ctx.globalAlpha = 1;

    // shield
    if (
        player.shield ||
        hasBuff("SHIELD")
    ) {
        ctx.strokeStyle = "#55f7ff";
        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.arc(
            player.x,
            player.y,
            player.radius + 9 +
            Math.sin(performance.now() / 100) * 2,
            0,
            Math.PI * 2
        );

        ctx.stroke();
    }

    // player glow
    ctx.shadowBlur = 25;
    ctx.shadowColor = "#00eaff";

    ctx.fillStyle = "#00eaff";

    ctx.beginPath();

    ctx.moveTo(
        player.x,
        player.y - player.radius
    );

    ctx.lineTo(
        player.x + player.radius,
        player.y + player.radius
    );

    ctx.lineTo(
        player.x,
        player.y + player.radius * 0.45
    );

    ctx.lineTo(
        player.x - player.radius,
        player.y + player.radius
    );

    ctx.closePath();

    ctx.fill();

    ctx.shadowBlur = 0;

    if (
        player.invincible > 0 ||
        invincibleTimer > 0
    ) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;

        ctx.beginPath();

        ctx.arc(
            player.x,
            player.y,
            player.radius + 14,
            0,
            Math.PI * 2
        );

        ctx.stroke();
    }
}


// ============================================================
// DRAW OBSTACLES
// ============================================================

function drawObstacles() {
    obstacles.forEach(o => {
        ctx.save();

        ctx.translate(o.x, o.y);

        ctx.rotate(o.angle);

        ctx.shadowBlur = 18;

        if (o.type === "fast") {
            ctx.shadowColor = "#ff3d81";
            ctx.fillStyle = "#ff3d81";
        } else if (o.type === "zigzag") {
            ctx.shadowColor = "#b45cff";
            ctx.fillStyle = "#b45cff";
        } else if (o.type === "seeker") {
            ctx.shadowColor = "#ff9d00";
            ctx.fillStyle = "#ff9d00";
        } else {
            ctx.shadowColor = "#ff3158";
            ctx.fillStyle = "#ff3158";
        }

        ctx.beginPath();

        const points = 6;

        for (let i = 0; i < points; i++) {
            const a =
                (Math.PI * 2 / points) * i;

            const r =
                o.radius *
                (i % 2 === 0 ? 1 : 0.65);

            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.restore();
    });
}


// ============================================================
// DRAW CRYSTALS
// ============================================================

function drawCrystals() {
    crystalsOnMap.forEach(c => {
        ctx.save();

        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);

        ctx.shadowBlur = 18;
        ctx.shadowColor = "#d05cff";

        ctx.fillStyle = "#d05cff";

        ctx.beginPath();

        ctx.moveTo(0, -c.radius);
        ctx.lineTo(c.radius * 0.75, 0);
        ctx.lineTo(0, c.radius);
        ctx.lineTo(-c.radius * 0.75, 0);

        ctx.closePath();

        ctx.fill();

        ctx.shadowBlur = 0;

        ctx.restore();
    });
}


// ============================================================
// DRAW PROJECTILES
// ============================================================

function drawProjectiles() {
    projectiles.forEach(p => {
        ctx.shadowBlur = 16;
        ctx.shadowColor = "#fff";

        ctx.fillStyle = "#fff";

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.shadowBlur = 0;
    });
}


// ============================================================
// DRAW BUFFS
// ============================================================

function drawBuffs() {
    eventObjects.forEach(o => {
        if (o.kind !== "buff") return;

        const colors = {
            LASER: "#ff2d75",
            MAGNET: "#d05cff",
            SHIELD: "#4deeff",
            DOUBLE: "#ffd84d",
            SLOW: "#59a8ff"
        };

        ctx.save();

        ctx.translate(o.x, o.y);

        ctx.shadowBlur = 20;
        ctx.shadowColor =
            colors[o.type] || "#fff";

        ctx.strokeStyle =
            colors[o.type] || "#fff";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            o.radius,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        ctx.fillStyle =
            colors[o.type] || "#fff";

        ctx.font = "bold 8px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            o.type.substring(0, 1),
            0,
            0
        );

        ctx.restore();
    });
}


// ============================================================
// DRAW EVENTS
// ============================================================

function drawEvents() {
    eventObjects.forEach(o => {

        if (o.kind === "laser") {
            const alpha =
                Math.min(
                    1,
                    o.life < 0.35
                        ? o.life / 0.35
                        : 1
                );

            ctx.globalAlpha = alpha;

            ctx.shadowBlur = 30;
            ctx.shadowColor = "#ff174f";

            ctx.fillStyle = "#ff174f";

            if (o.orientation === "horizontal") {
                ctx.fillRect(
                    0,
                    o.y - o.width / 2,
                    W,
                    o.width
                );
            } else {
                ctx.fillRect(
                    o.x - o.width / 2,
                    0,
                    o.width,
                    H
                );
            }

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }


        if (o.kind === "hunter") {
            ctx.save();

            ctx.translate(o.x, o.y);

            ctx.rotate(o.rotation);

            ctx.shadowBlur = 25;
            ctx.shadowColor = "#ff174f";

            ctx.fillStyle = "#ff174f";

            ctx.beginPath();

            ctx.moveTo(25, 0);
            ctx.lineTo(-14, -13);
            ctx.lineTo(-8, 0);
            ctx.lineTo(-14, 13);

            ctx.closePath();

            ctx.fill();

            ctx.restore();
        }


        if (o.kind === "meteor") {
            ctx.save();

            ctx.translate(o.x, o.y);
            ctx.rotate(o.rotation);

            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ff7b00";

            ctx.fillStyle = "#ff7b00";

            ctx.beginPath();

            ctx.arc(
                0,
                0,
                o.radius,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.restore();
        }


        if (o.kind === "electric") {
            ctx.globalAlpha =
                0.25 +
                Math.sin(performance.now() / 100) *
                0.08;

            ctx.fillStyle = "#3c8cff";

            ctx.fillRect(
                o.x - o.width / 2,
                0,
                o.width,
                H
            );

            ctx.globalAlpha = 1;

            ctx.strokeStyle = "#5cb7ff";
            ctx.lineWidth = 2;

            for (
                let y = 0;
                y < H;
                y += 45
            ) {
                ctx.beginPath();

                ctx.moveTo(
                    o.x - 20,
                    y
                );

                ctx.lineTo(
                    o.x + 20,
                    y + 20
                );

                ctx.stroke();
            }
        }


        if (o.kind === "alert") {
            const alpha =
                0.06 +
                Math.sin(performance.now() / 90) *
                0.04;

            ctx.fillStyle =
                `rgba(255,0,60,${alpha})`;

            ctx.fillRect(
                0,
                0,
                W,
                H
            );
        }
    });
}


// ============================================================
// DRAW PARTICLES
// ============================================================

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha =
            Math.max(0, p.life);

        ctx.fillStyle = "#d8f8ff";

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    });

    ctx.globalAlpha = 1;
}


// ============================================================
// DRAW LASER BUFF BEAM
// ============================================================

function drawLaserBuff() {
    if (!hasBuff("LASER")) return;

    ctx.save();

    ctx.globalAlpha =
        0.25 +
        Math.sin(performance.now() / 80) *
        0.1;

    ctx.shadowBlur = 35;
    ctx.shadowColor = "#ff2d75";

    ctx.fillStyle = "#ff2d75";

    ctx.fillRect(
        player.x - 5,
        0,
        10,
        player.y
    );

    ctx.restore();
}


// ============================================================
// HUD
// ============================================================

function updateHUD() {
    text("score", Math.floor(score));
    text("multiplier", "x" + multiplier);
    text("best", Math.floor(saveData.best));

    if (healthEl) {
        healthEl.textContent =
            "♥".repeat(
                Math.max(0, player.lives)
            );
    }

    if (crystalsEl) {
        crystalsEl.textContent =
            saveData.crystals;
    }

    if (shieldButton) {
        shieldButton.disabled =
            shieldCooldown > 0 ||
            player.shield;

        shieldButton.textContent =
            player.shield
                ? "SHIELD ACTIVE"
                : shieldCooldown > 0
                    ? Math.ceil(shieldCooldown) + "s"
                    : "SHIELD";
    }

    if (empButton) {
        empButton.disabled =
            empCooldown > 0;

        empButton.textContent =
            empCooldown > 0
                ? Math.ceil(empCooldown) + "s"
                : "EMP";
    }
}


// ============================================================
// SCORE
// ============================================================

function updateScore(dt) {
    score +=
        dt *
        10 *
        multiplier;

    multiplier =
        1 +
        Math.floor(gameTime / 25) * 0.1;

    if (hasBuff("DOUBLE")) {
        multiplier *= 2;
    }

    if (score > saveData.best) {
        saveData.best = Math.floor(score);
    }
}


// ============================================================
// MAIN UPDATE
// ============================================================

function update(dt) {
    if (!running || paused || gameOver) {
        return;
    }

    gameTime += dt;

    shieldCooldown =
        Math.max(0, shieldCooldown - dt);

    empCooldown =
        Math.max(0, empCooldown - dt);

    updateEra();

    updatePlayer(dt);

    updateStars(
        dt *
        (1 + Math.min(gameTime / 180, 1))
    );

    updateBuffs(dt);

    // obstacle spawning
    spawnTimer += dt;

    const d = difficulty();

    if (spawnTimer >= d.spawn) {
        spawnTimer = 0;

        spawnObstacleWave();
    }

    // crystals
    crystalTimer += dt;

    const crystalInterval =
        hasBuff("MAGNET")
            ? 2.5
            : 4.2;

    if (crystalTimer >= crystalInterval) {
        crystalTimer = 0;
        spawnCrystal();
    }

    // buffs
    buffTimer += dt;

    if (
        buffTimer >=
        Math.max(
            7,
            17 - gameTime * 0.015
        )
    ) {
        buffTimer = 0;

        if (Math.random() < 0.72) {
            spawnBuff();
        }
    }

    // events
    eventTimer += dt;

    if (
        eventTimer >= nextEvent
    ) {
        eventTimer = 0;

        chooseEvent();

        scheduleNextEvent();
    }

    updateObstacles(dt);
    updateCrystals(dt);
    updateEvents(dt);
    updateWeapon(dt);
    updateParticles(dt);

    updateScore(dt);

    shake *= 0.90;

    if (shake < 0.1) {
        shake = 0;
    }

    updateHUD();

    // occasional autosave
    if (
        Math.floor(gameTime) % 10 === 0
    ) {
        saveData.crystals =
            Math.floor(saveData.crystals);

        save();
    }
}


// ============================================================
// DRAW
// ============================================================

function draw() {
    ctx.save();

    if (shake > 0) {
        ctx.translate(
            (Math.random() - 0.5) * shake,
            (Math.random() - 0.5) * shake
        );
    }

    drawBackground();

    drawEvents();

    drawCrystals();

    drawObstacles();

    drawLaserBuff();

    drawProjectiles();

    drawBuffs();

    drawPlayer();

    drawParticles();

    ctx.restore();
}


// ============================================================
// LOOP
// ============================================================

function loop(timestamp) {
    if (!running) {
        return;
    }

    let dt =
        (timestamp - lastTime) / 1000;

    lastTime = timestamp;

    dt = Math.min(dt, 0.033);

    if (!paused && !gameOver) {
        update(dt);
    }

    draw();

    requestAnimationFrame(loop);
}


// ============================================================
// GAME OVER
// ============================================================

function endGame() {
    if (gameOver) return;

    gameOver = true;
    running = false;

    const finalScore =
        Math.floor(score);

    if (finalScore > saveData.best) {
        saveData.best = finalScore;
    }

    const reward =
        Math.max(
            5,
            Math.min(
                40,
                Math.floor(finalScore / 250) + 5
            )
        );

    saveData.crystals += reward;

    save();

    text(
        "finalScore",
        finalScore
    );

    text(
        "finalBest",
        Math.floor(saveData.best)
    );

    text(
        "finalReward",
        "+" + reward + " 💎"
    );

    if (hud) {
        hud.style.display = "none";
    }

    showScreen(gameOverScreen);
}


// ============================================================
// REVIVE
// ============================================================

on("reviveButton", "click", () => {
    if (reviveUsed || !gameOver) {
        return;
    }

    reviveUsed = true;

    const button =
        document.getElementById("reviveButton");

    if (button) {
        button.disabled = true;
        button.textContent = "REVIVING...";
    }

    // simulated advertisement
    setTimeout(() => {
        gameOver = false;
        running = true;
        paused = false;

        player.lives = Math.max(
            2,
            saveData.lives
        );

        player.x = W / 2;
        player.y = H * 0.72;

        player.targetX = player.x;
        player.targetY = player.y;

        player.invincible = 4;

        invincibleTimer = 4;

        player.shield = true;

        obstacles = [];
        eventObjects = [];

        hideScreens();

        if (hud) {
            hud.style.display = "flex";
        }

        lastTime = performance.now();

        showToast("REVIVED!");

        requestAnimationFrame(loop);

    }, 1200);
});


// ============================================================
// RESTART
// ============================================================

on("restartButton", "click", () => {
    startGame();
});


// ============================================================
// MENU AFTER GAME OVER
// ============================================================

on("menuButton", "click", () => {
    running = false;
    paused = false;
    gameOver = false;

    if (hud) {
        hud.style.display = "none";
    }

    updateMenuUI();

    showScreen(menu);
});


// ============================================================
// INITIALIZATION
// ============================================================

resize();

createStars();

updateMenuUI();
updateSettingsUI();
updateDailyUI();

if (hud) {
    hud.style.display = "none";
}

showScreen(menu);


// ============================================================
// DEBUG
// ============================================================

console.log(
    "%c NEON DODGE ONLINE ",
    "background:#05060b;color:#00eaff;font-size:16px;font-weight:bold"
);

console.log(
    "Dynamic events enabled."
);