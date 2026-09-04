const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;
let dpr = 1;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = W * dpr;
    canvas.height = H * dpr;

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    createStars();
}

window.addEventListener("resize", resize);

/* =========================================================
   SAVE
========================================================= */

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

    lastDaily: 0,

    /* AdMob */
    adLossCount: 0
};

let saveData = JSON.parse(
    localStorage.getItem("neonDodgeData") || "null"
);

if (!saveData) {
    saveData = { ...defaultData };
} else {
    saveData = {
        ...defaultData,
        ...saveData
    };

    saveData.crystals = Math.max(
        saveData.crystals,
        300
    );

    saveData.adLossCount =
        Number.isFinite(
            Number(saveData.adLossCount)
        )
            ? Number(saveData.adLossCount)
            : 0;
}

function save() {
    localStorage.setItem(
        "neonDodgeData",
        JSON.stringify(saveData)
    );
}

/* =========================================================
   AUDIO
========================================================= */

function initAudio() {

    if (typeof AudioFX === "undefined") {
        return false;
    }

    try {
        AudioFX.init();
        AudioFX.resume();

        return true;

    } catch (error) {

        console.warn(
            "Audio init error:",
            error
        );

        return false;
    }
}

function audioClick() {

    if (
        typeof AudioFX === "undefined" ||
        !saveData.sound
    ) {
        return;
    }

    if (!initAudio()) {
        return;
    }

    try {

        AudioFX.click();

    } catch (error) {

        console.warn(
            "Audio click error:",
            error
        );
    }
}

/* =========================================================
   ADMOB
========================================================= */

const AdMob =
    window.Capacitor?.Plugins?.AdMob || null;

/*
    REAL ADMOB IDS
*/

const ADMOB_APP_ID =
    "ca-app-pub-7914086624525579~8190565290";

const ADMOB_REWARDED_ID =
    "ca-app-pub-7914086624525579/4837005615";

const ADMOB_INTERSTITIAL_ID =
    "ca-app-pub-7914086624525579/1314517401";

/*
    Interstitial показываем после
    каждого 4-го проигрыша.
*/

const INTERSTITIAL_LOSS_INTERVAL = 4;

let admobReady = false;

let rewardedPreparing = false;
let interstitialPreparing = false;

let rewardedLoaded = false;
let interstitialLoaded = false;

let rewardedRequestInProgress = false;
let interstitialRequestInProgress = false;

/* =========================================================
   ADMOB INITIALIZATION
========================================================= */

async function initAdMob() {

    if (!AdMob) {

        console.warn(
            "AdMob plugin not available"
        );

        return false;
    }

    if (admobReady) {
        return true;
    }

    try {

        await AdMob.initialize();

        admobReady = true;

        console.log(
            "AdMob initialized"
        );

        return true;

    } catch (error) {

        console.error(
            "AdMob initialization error:",
            error
        );

        return false;
    }
}

/* =========================================================
   PREPARE REWARDED
========================================================= */

async function prepareRewardedAd() {

    if (
        !AdMob ||
        rewardedPreparing
    ) {
        return false;
    }

    rewardedPreparing = true;
    rewardedLoaded = false;

    try {

        const initialized =
            await initAdMob();

        if (!initialized) {
            return false;
        }

        await AdMob.prepareRewardVideoAd({

            adId:
                ADMOB_REWARDED_ID

        });

        rewardedLoaded = true;

        console.log(
            "Rewarded ad loaded"
        );

        return true;

    } catch (error) {

        rewardedLoaded = false;

        console.warn(
            "Rewarded ad load error:",
            error
        );

        return false;

    } finally {

        rewardedPreparing = false;
    }
}

/* =========================================================
   SHOW REWARDED
========================================================= */

async function showRewardedReviveAd() {

    if (!AdMob) {

        showToast(
            "ADS AVAILABLE IN APP ONLY"
        );

        return false;
    }

    if (rewardedRequestInProgress) {
        return false;
    }

    rewardedRequestInProgress = true;

    try {

        const initialized =
            await initAdMob();

        if (!initialized) {

            showToast(
                "AD NOT AVAILABLE"
            );

            return false;
        }

        /*
            Если заранее загруженная реклама
            отсутствует — загружаем её сейчас.
        */

        if (!rewardedLoaded) {

            const loaded =
                await prepareRewardedAd();

            if (!loaded) {

                showToast(
                    "AD NOT AVAILABLE"
                );

                return false;
            }
        }

        /*
            ВАЖНО:
            showRewardVideoAd() возвращает
            AdMobRewardItem только после
            получения награды.
        */

        const reward =
            await AdMob.showRewardVideoAd();

        console.log(
            "Reward received:",
            reward
        );

        rewardedLoaded = false;

        /*
            Готовим следующую рекламу
            заранее.
        */

        setTimeout(() => {

            prepareRewardedAd();

        }, 500);

        if (
            reward &&
            Number(reward.amount) > 0
        ) {

            return true;
        }

        /*
            На случай если конкретная
            версия SDK вернула объект
            без amount.
        */

        if (reward) {
            return true;
        }

        return false;

    } catch (error) {

        rewardedLoaded = false;

        console.error(
            "Rewarded ad error:",
            error
        );

        return false;

    } finally {

        rewardedRequestInProgress = false;
    }
}

/* =========================================================
   PREPARE INTERSTITIAL
========================================================= */

async function prepareInterstitialAd() {

    if (
        !AdMob ||
        interstitialPreparing
    ) {
        return false;
    }

    interstitialPreparing = true;
    interstitialLoaded = false;

    try {

        const initialized =
            await initAdMob();

        if (!initialized) {
            return false;
        }

        await AdMob.prepareInterstitial({

            adId:
                ADMOB_INTERSTITIAL_ID

        });

        interstitialLoaded = true;

        console.log(
            "Interstitial ad loaded"
        );

        return true;

    } catch (error) {

        interstitialLoaded = false;

        console.warn(
            "Interstitial load error:",
            error
        );

        return false;

    } finally {

        interstitialPreparing = false;
    }
}

/* =========================================================
   SHOW INTERSTITIAL
========================================================= */

async function showInterstitialAd() {

    if (!AdMob) {
        return false;
    }

    if (interstitialRequestInProgress) {
        return false;
    }

    interstitialRequestInProgress = true;

    try {

        const initialized =
            await initAdMob();

        if (!initialized) {
            return false;
        }

        if (!interstitialLoaded) {

            const loaded =
                await prepareInterstitialAd();

            if (!loaded) {
                return false;
            }
        }

        await AdMob.showInterstitial();

        interstitialLoaded = false;

        /*
            Загружаем следующую
            interstitial-рекламу.
        */

        setTimeout(() => {

            prepareInterstitialAd();

        }, 500);

        return true;

    } catch (error) {

        interstitialLoaded = false;

        console.warn(
            "Interstitial ad error:",
            error
        );

        return false;

    } finally {

        interstitialRequestInProgress = false;
    }
}

/* =========================================================
   PRELOAD ADS
========================================================= */

async function preloadAds() {

    if (!AdMob) {
        return;
    }

    const initialized =
        await initAdMob();

    if (!initialized) {
        return;
    }

    /*
        Загружаем обе рекламы заранее.
    */

    prepareRewardedAd();

    prepareInterstitialAd();
}

/* =========================================================
   GAME STATE
========================================================= */

let running = false;
let paused = false;
let gameOver = false;

let score = 0;
let gameTime = 0;
let lastTime = 0;

let multiplier = 1;

let player;
let obstacles = [];
let particles = [];
let projectiles = [];
let stars = [];
let crystalsOnMap = [];

let eventObjects = [];

let spawnTimer = 0;
let crystalTimer = 0;
let eventTimer = 6;

let shake = 0;

let reviveUsed = false;

let activeBuffs = {};

let shieldCooldown = 0;
let empCooldown = 0;

let eventBusy = false;

let weaponTimer = 0;
let buffSpawnTimer = 8;

/* =========================================================
   DOM
========================================================= */

const hud = document.getElementById("hud");

const menu = document.getElementById("menu");
const shopPanel = document.getElementById("shopPanel");
const settingsPanel = document.getElementById("settingsPanel");
const feedbackPanel = document.getElementById("feedbackPanel");
const dailyPanel = document.getElementById("dailyPanel");

const gameOverScreen = document.getElementById("gameOver");
const pauseScreen = document.getElementById("pauseScreen");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const multiplierEl = document.getElementById("multiplier");
const healthEl = document.getElementById("health");

const crystalsEl = document.getElementById("crystals");
const menuCrystals = document.getElementById("menuCrystals");
const shopCrystals = document.getElementById("shopCrystals");

const buffContainer = document.getElementById("buffContainer");

const eventWarning = document.getElementById("eventWarning");
const eventWarningTitle = document.getElementById("eventWarningTitle");
const eventWarningText = document.getElementById("eventWarningText");

const toast = document.getElementById("toast");

/* =========================================================
   MENU
========================================================= */

function showScreen(screen) {

    [
        menu,
        shopPanel,
        settingsPanel,
        feedbackPanel,
        dailyPanel,
        gameOverScreen,
        pauseScreen
    ].forEach(x => x.classList.remove("active"));

    screen.classList.add("active");
}

function openMenu() {

    running = false;
    paused = false;

    hud.style.display = "none";

    showScreen(menu);

    updateMenuUI();
}

/* =========================================================
   PLAY
========================================================= */

document.getElementById("playButton").onclick = () => {

    if (typeof AudioFX === "undefined") {

        alert(
            "Ошибка: audio.js не загрузился"
        );

        return;
    }

    initAudio();

    if (saveData.music) {
        AudioFX.setMusic(true);
    }

    if (saveData.sound) {
        AudioFX.click();
    }

    startGame();
};

/* =========================================================
   MENU BUTTONS
========================================================= */

document.getElementById("shopButton").onclick = () => {

    audioClick();

    updateMenuUI();

    showScreen(shopPanel);
};

document.getElementById("settingsButton").onclick = () => {

    audioClick();

    updateSettingsUI();

    showScreen(settingsPanel);
};

document.getElementById("feedbackButton").onclick = () => {

    audioClick();

    showScreen(feedbackPanel);
};

document.getElementById("dailyButton").onclick = () => {

    audioClick();

    updateDailyUI();

    showScreen(dailyPanel);
};

document.querySelectorAll("[data-close]").forEach(btn => {

    btn.onclick = () => {

        audioClick();

        openMenu();
    };
});

document.getElementById("menuButton").onclick = () => {

    audioClick();

    openMenu();
};

document.getElementById("pauseMenuButton").onclick = () => {

    audioClick();

    openMenu();
};

document.getElementById("resumeButton").onclick = () => {

    audioClick();

    resumeGame();
};

/* =========================================================
   MENU UI
========================================================= */

function updateMenuUI() {

    menuCrystals.textContent = saveData.crystals;
    shopCrystals.textContent = saveData.crystals;

    document.getElementById("lifeLevel").textContent =
        `LEVEL ${saveData.lives}/3`;

    document.getElementById("weaponLevel").textContent =
        saveData.weapon ? "UNLOCKED" : "LOCKED";

    document.getElementById("damageLevel").textContent =
        `LEVEL ${saveData.damage}/3`;

    document.getElementById("shieldLevel").textContent =
        `LEVEL ${saveData.shield}/3`;

    document.getElementById("empLevel").textContent =
        `LEVEL ${saveData.emp}/3`;

    const lifeCost =
        80 + (saveData.lives - 1) * 100;

    const damageCost =
        100 + (saveData.damage - 1) * 80;

    const shieldCost =
        90 + (saveData.shield - 1) * 70;

    const empCost =
        100 + (saveData.emp - 1) * 80;

    const lifeBtn =
        document.getElementById("buyLife");

    const weaponBtn =
        document.getElementById("buyWeapon");

    const damageBtn =
        document.getElementById("buyDamage");

    const shieldBtn =
        document.getElementById("buyShield");

    const empBtn =
        document.getElementById("buyEmp");

    lifeBtn.textContent =
        saveData.lives >= 3
            ? "MAX"
            : `${lifeCost} 💎`;

    weaponBtn.textContent =
        saveData.weapon
            ? "OWNED"
            : "150 💎";

    damageBtn.textContent =
        saveData.damage >= 3
            ? "MAX"
            : `${damageCost} 💎`;

    shieldBtn.textContent =
        saveData.shield >= 3
            ? "MAX"
            : `${shieldCost} 💎`;

    empBtn.textContent =
        saveData.emp >= 3
            ? "MAX"
            : `${empCost} 💎`;

    lifeBtn.disabled =
        saveData.lives >= 3 ||
        saveData.crystals < lifeCost;

    weaponBtn.disabled =
        saveData.weapon ||
        saveData.crystals < 150;

    damageBtn.disabled =
        !saveData.weapon ||
        saveData.damage >= 3 ||
        saveData.crystals < damageCost;

    shieldBtn.disabled =
        saveData.shield >= 3 ||
        saveData.crystals < shieldCost;

    empBtn.disabled =
        saveData.emp >= 3 ||
        saveData.crystals < empCost;
}

/* =========================================================
   SHOP
========================================================= */

function purchase(type, cost, max) {

    if (saveData[type] >= max) {

        showToast("MAX LEVEL");

        return;
    }

    if (saveData.crystals < cost) {

        showToast("NOT ENOUGH 💎");

        return;
    }

    saveData.crystals -= cost;

    saveData[type]++;

    save();

    updateMenuUI();

    showToast("PURCHASED ✓");

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.purchase();
    }

    vibrate(25);
}

document.getElementById("buyLife").onclick = () => {

    audioClick();

    const cost =
        80 + (saveData.lives - 1) * 100;

    purchase(
        "lives",
        cost,
        3
    );
};

document.getElementById("buyWeapon").onclick = () => {

    audioClick();

    if (saveData.weapon) {

        showToast("ALREADY UNLOCKED");

        return;
    }

    if (saveData.crystals < 150) {

        showToast("NOT ENOUGH 💎");

        return;
    }

    saveData.crystals -= 150;

    saveData.weapon = 1;

    save();

    updateMenuUI();

    showToast("WEAPON UNLOCKED 🔫");

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.purchase();
    }

    vibrate(40);
};

document.getElementById("buyDamage").onclick = () => {

    audioClick();

    if (!saveData.weapon) {

        showToast("UNLOCK WEAPON FIRST");

        return;
    }

    const cost =
        100 + (saveData.damage - 1) * 80;

    purchase(
        "damage",
        cost,
        3
    );
};

document.getElementById("buyShield").onclick = () => {

    audioClick();

    const cost =
        90 + (saveData.shield - 1) * 70;

    purchase(
        "shield",
        cost,
        3
    );
};

document.getElementById("buyEmp").onclick = () => {

    audioClick();

    const cost =
        100 + (saveData.emp - 1) * 80;

    purchase(
        "emp",
        cost,
        3
    );
};

/* =========================================================
   SETTINGS
========================================================= */

function updateSettingsUI() {

    const music =
        document.getElementById("musicToggle");

    const sound =
        document.getElementById("soundToggle");

    const vibration =
        document.getElementById("vibrationToggle");

    music.textContent =
        saveData.music
            ? "ON"
            : "OFF";

    sound.textContent =
        saveData.sound
            ? "ON"
            : "OFF";

    vibration.textContent =
        saveData.vibration
            ? "ON"
            : "OFF";
}

document.getElementById("musicToggle").onclick = () => {

    initAudio();

    saveData.music =
        !saveData.music;

    save();

    if (typeof AudioFX !== "undefined") {

        AudioFX.setMusic(
            saveData.music
        );
    }

    updateSettingsUI();

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        AudioFX.click();
    }
};

document.getElementById("soundToggle").onclick = () => {

    initAudio();

    saveData.sound =
        !saveData.sound;

    save();

    if (typeof AudioFX !== "undefined") {

        AudioFX.setSound(
            saveData.sound
        );
    }

    updateSettingsUI();

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        AudioFX.click();
    }
};

document.getElementById("vibrationToggle").onclick = () => {

    initAudio();

    saveData.vibration =
        !saveData.vibration;

    save();

    updateSettingsUI();

    audioClick();
};

/* =========================================================
   DAILY
========================================================= */

function updateDailyUI() {

    const now = Date.now();

    const day = 86400000;

    const available =
        now - saveData.lastDaily >= day;

    document.getElementById(
        "claimDaily"
    ).disabled = !available;

    document.getElementById(
        "dailyStatus"
    ).textContent =
        available
            ? "BONUS READY!"
            : "COME BACK TOMORROW";
}

document.getElementById("claimDaily").onclick = () => {

    audioClick();

    const now = Date.now();

    if (
        now - saveData.lastDaily <
        86400000
    ) {
        return;
    }

    saveData.crystals += 25;

    saveData.lastDaily = now;

    save();

    updateDailyUI();

    updateMenuUI();

    showToast(
        "+25 💎 DAILY BONUS"
    );

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.reward();
    }
};

/* =========================================================
   START GAME
========================================================= */

function startGame() {

    initAudio();

    showScreen(menu);

    menu.classList.remove("active");

    hud.style.display = "block";

    running = true;

    paused = false;

    gameOver = false;

    reviveUsed = false;

    score = 0;

    gameTime = 0;

    multiplier = 1;

    obstacles = [];

    particles = [];

    projectiles = [];

    crystalsOnMap = [];

    eventObjects = [];

    activeBuffs = {};

    spawnTimer = 0;

    crystalTimer = 0;

    eventTimer = 6;

    shieldCooldown = 0;

    empCooldown = 0;

    eventBusy = false;

    weaponTimer = 0;

    buffSpawnTimer = 8;

    player = {

        x: W / 2,

        y: H * .72,

        targetX: W / 2,

        targetY: H * .72,

        radius: 15,

        lives: saveData.lives,

        invincible: 0,

        shield: 0,

        trail: []
    };

    updateHUD();

    lastTime =
        performance.now();

    requestAnimationFrame(loop);
}

/* =========================================================
   PAUSE
========================================================= */

document.getElementById("pauseButton").onclick = () => {

    audioClick();

    togglePause();
};

function togglePause() {

    if (!running || gameOver) return;

    paused = !paused;

    if (paused) {

        showScreen(pauseScreen);

    } else {

        showScreen(menu);

        menu.classList.remove("active");

        pauseScreen.classList.add("active");
    }
}

function resumeGame() {

    if (!paused) return;

    paused = false;

    showScreen(menu);

    menu.classList.remove("active");

    lastTime =
        performance.now();

    requestAnimationFrame(loop);
}

/* =========================================================
   INPUT
========================================================= */

function setPlayerTarget(x, y) {

    if (
        !running ||
        paused ||
        !player
    ) {
        return;
    }

    player.targetX =
        Math.max(
            player.radius,
            Math.min(
                W - player.radius,
                x
            )
        );

    player.targetY =
        Math.max(
            80,
            Math.min(
                H - 80,
                y
            )
        );
}

canvas.addEventListener(
    "pointermove",
    e => {

        setPlayerTarget(
            e.clientX,
            e.clientY
        );
    }
);

canvas.addEventListener(
    "pointerdown",
    e => {

        initAudio();

        setPlayerTarget(
            e.clientX,
            e.clientY
        );
    }
);

let keys = {};

window.addEventListener(
    "keydown",
    e => {

        keys[
            e.key.toLowerCase()
        ] = true;

        if (
            e.key === "Escape" ||
            e.key.toLowerCase() === "p"
        ) {

            togglePause();
        }

        if (e.key === " ") {

            shoot();
        }

        if (
            e.key.toLowerCase() === "e"
        ) {

            useEMP();
        }

        if (
            e.key.toLowerCase() === "q"
        ) {

            useShield();
        }
    }
);

window.addEventListener(
    "keyup",
    e => {

        keys[
            e.key.toLowerCase()
        ] = false;
    }
);

/* =========================================================
   PLAYER MOVEMENT
========================================================= */

function updatePlayer(dt) {

    let dx = 0;
    let dy = 0;

    if (
        keys["arrowleft"] ||
        keys["a"]
    ) dx--;

    if (
        keys["arrowright"] ||
        keys["d"]
    ) dx++;

    if (
        keys["arrowup"] ||
        keys["w"]
    ) dy--;

    if (
        keys["arrowdown"] ||
        keys["s"]
    ) dy++;

    if (dx || dy) {

        const len =
            Math.hypot(dx, dy);

        dx /= len;
        dy /= len;

        player.targetX +=
            dx * 420 * dt;

        player.targetY +=
            dy * 420 * dt;
    }

    player.targetX =
        Math.max(
            player.radius,
            Math.min(
                W - player.radius,
                player.targetX
            )
        );

    player.targetY =
        Math.max(
            80,
            Math.min(
                H - 70,
                player.targetY
            )
        );

    const speed =
        hasBuff("SLOW")
            ? 5
            : 9;

    player.x +=
        (
            player.targetX -
            player.x
        ) *
        Math.min(
            1,
            speed * dt
        );

    player.y +=
        (
            player.targetY -
            player.y
        ) *
        Math.min(
            1,
            speed * dt
        );

    player.trail.push({
        x: player.x,
        y: player.y,
        life: 1
    });

    if (
        player.trail.length >
        16
    ) {
        player.trail.shift();
    }

    for (const p of player.trail) {

        p.life -= dt * 4;
    }

    if (
        player.invincible > 0
    ) {
        player.invincible -= dt;
    }

    if (
        player.shield > 0
    ) {
        player.shield -= dt;
    }

    shieldCooldown =
        Math.max(
            0,
            shieldCooldown - dt
        );

    empCooldown =
        Math.max(
            0,
            empCooldown - dt
        );
}

/* =========================================================
   DIFFICULTY
========================================================= */

function difficulty() {

    const timeFactor =
        Math.min(
            gameTime / 150,
            1
        );

    const endlessFactor =
        Math.max(
            0,
            gameTime - 150
        ) / 120;

    return {

        speed:
            170 +
            timeFactor * 150 +
            endlessFactor * 70,

        spawn:
            Math.max(
                .24,
                .72 -
                timeFactor * .28 -
                endlessFactor * .12
            ),

        size:
            15 +
            timeFactor * 8,

        amount:
            1 +
            Math.floor(
                gameTime / 40
            )
    };
}

/* =========================================================
   OBSTACLES
========================================================= */

function spawnObstacle() {

    const d =
        difficulty();

    const size =
        d.size *
        (
            .75 +
            Math.random() * .8
        );

    const typeRoll =
        Math.random();

    let type =
        "normal";

    if (
        gameTime > 25 &&
        typeRoll < .18
    ) {
        type = "fast";
    }

    if (
        gameTime > 55 &&
        typeRoll < .12
    ) {
        type = "zigzag";
    }

    obstacles.push({

        x:
            size +
            Math.random() *
            (
                W -
                size * 2
            ),

        y:
            -size - 20,

        size,

        speed:
            d.speed *
            (
                type === "fast"
                    ? 1.35
                    : 1
            ),

        type,

        angle:
            Math.random() *
            Math.PI * 2,

        rotation:
            (
                Math.random() -
                .5
            ) * 3,

        hp:
            saveData.weapon
                ? 1 +
                  Math.floor(
                      gameTime / 65
                  )
                : 1,

        life: 1
    });
}

function updateObstacles(dt) {

    const d =
        difficulty();

    spawnTimer += dt;

    if (
        spawnTimer >= d.spawn
    ) {

        spawnTimer = 0;

        const count =
            Math.min(
                d.amount,
                4
            );

        for (
            let i = 0;
            i < count;
            i++
        ) {

            spawnObstacle();
        }
    }

    for (
        let i =
            obstacles.length - 1;
        i >= 0;
        i--
    ) {

        const o =
            obstacles[i];

        o.y +=
            o.speed *
            dt *
            (
                hasBuff("SLOW")
                    ? .45
                    : 1
            );

        o.angle +=
            o.rotation * dt;

        if (
            o.type === "zigzag"
        ) {

            o.x +=
                Math.sin(
                    gameTime * 3 +
                    o.y * .01
                ) *
                100 *
                dt;
        }

        if (
            o.y >
            H + 100
        ) {

            obstacles.splice(
                i,
                1
            );

            score +=
                10 *
                multiplier;
        }
    }
}

/* =========================================================
   CRYSTALS
========================================================= */

function spawnCrystal() {

    crystalsOnMap.push({

        x:
            25 +
            Math.random() *
            (W - 50),

        y: -20,

        radius: 7,

        speed:
            difficulty().speed *
            .8,

        angle:
            Math.random() *
            Math.PI * 2
    });
}

function updateCrystals(dt) {

    crystalTimer += dt;

    if (
        crystalTimer > 1.4
    ) {

        crystalTimer = 0;

        spawnCrystal();
    }

    for (
        let i =
            crystalsOnMap.length - 1;
        i >= 0;
        i--
    ) {

        const c =
            crystalsOnMap[i];

        c.y +=
            c.speed *
            dt *
            (
                hasBuff("SLOW")
                    ? .45
                    : 1
            );

        c.angle +=
            dt * 5;

        if (
            hasBuff("MAGNET")
        ) {

            const dx =
                player.x - c.x;

            const dy =
                player.y - c.y;

            const dist =
                Math.hypot(
                    dx,
                    dy
                );

            if (
                dist < 230
            ) {

                c.x +=
                    dx /
                    Math.max(
                        dist,
                        1
                    ) *
                    420 *
                    dt;

                c.y +=
                    dy /
                    Math.max(
                        dist,
                        1
                    ) *
                    420 *
                    dt;
            }
        }

        if (
            Math.hypot(
                c.x - player.x,
                c.y - player.y
            ) <
            player.radius +
            c.radius +
            5
        ) {

            collectCrystal(i);

            continue;
        }

        if (
            c.y >
            H + 30
        ) {

            crystalsOnMap.splice(
                i,
                1
            );
        }
    }
}

function collectCrystal(i) {

    crystalsOnMap.splice(
        i,
        1
    );

    saveData.crystals += 1;

    score +=
        20 *
        multiplier;

    createExplosion(
        player.x,
        player.y,
        8
    );

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.crystal();
    }

    save();
}

/* =========================================================
   BUFFS
========================================================= */

const buffInfo = {

    LASER: {
        icon: "🔴",
        duration: 9
    },

    MAGNET: {
        icon: "🧲",
        duration: 10
    },

    SHIELD: {
        icon: "🛡️",
        duration: 8
    },

    DOUBLE: {
        icon: "💎",
        duration: 10
    },

    SLOW: {
        icon: "⏱️",
        duration: 7
    }
};

function activateBuff(type) {

    activeBuffs[type] =
        buffInfo[type].duration;

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.buff();
    }

    showToast(
        `${buffInfo[type].icon} ${type}`
    );

    vibrate(30);
}

function hasBuff(type) {

    return activeBuffs[type] > 0;
}

function updateBuffs(dt) {

    for (
        const type in activeBuffs
    ) {

        activeBuffs[type] -= dt;

        if (
            activeBuffs[type] <= 0
        ) {

            delete activeBuffs[type];
        }
    }

    buffContainer.innerHTML = "";

    for (
        const type in activeBuffs
    ) {

        const div =
            document.createElement(
                "div"
            );

        div.className =
            "buff";

        div.innerHTML = `
            <div class="buff-icon">
                ${buffInfo[type].icon}
            </div>
            <div class="buff-time">
                ${Math.ceil(
                    activeBuffs[type]
                )}s
            </div>
        `;

        buffContainer.appendChild(
            div
        );
    }
}

function spawnBuff() {

    const types = [
        "LASER",
        "MAGNET",
        "SHIELD",
        "DOUBLE",
        "SLOW"
    ];

    const type =
        types[
            Math.floor(
                Math.random() *
                types.length
            )
        ];

    eventObjects.push({

        type: "buff",

        buffType: type,

        x:
            30 +
            Math.random() *
            (W - 60),

        y: -30,

        radius: 13,

        speed:
            difficulty().speed *
            .7,

        rotation: 0
    });
}

function updateBuffObjects(dt) {

    for (
        let i =
            eventObjects.length - 1;
        i >= 0;
        i--
    ) {

        const o =
            eventObjects[i];

        if (
            o.type !== "buff"
        ) continue;

        o.y +=
            o.speed * dt;

        o.rotation +=
            dt * 3;

        if (
            Math.hypot(
                o.x - player.x,
                o.y - player.y
            ) <
            player.radius +
            o.radius +
            5
        ) {

            activateBuff(
                o.buffType
            );

            eventObjects.splice(
                i,
                1
            );

            continue;
        }

        if (
            o.y >
            H + 50
        ) {

            eventObjects.splice(
                i,
                1
            );
        }
    }
}

/* =========================================================
   WEAPON
========================================================= */

function shoot() {

    if (
        !running ||
        paused ||
        !saveData.weapon
    ) {
        return;
    }

    if (
        weaponTimer > 0
    ) return;

    weaponTimer =
        Math.max(
            .18,
            .55 -
            saveData.damage * .08
        );

    let target = null;

    let minDistance =
        Infinity;

    for (
        const o of obstacles
    ) {

        const dist =
            Math.hypot(
                o.x - player.x,
                o.y - player.y
            );

        if (
            dist < minDistance
        ) {

            minDistance =
                dist;

            target = o;
        }
    }

    if (!target) return;

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.shoot();
    }

    projectiles.push({

        x: player.x,

        y: player.y,

        target,

        speed: 750,

        damage:
            saveData.damage
    });

    if (
        saveData.damage >= 3
    ) {

        projectiles.push({

            x:
                player.x - 5,

            y:
                player.y,

            target,

            speed: 760,

            damage:
                saveData.damage
        });

        projectiles.push({

            x:
                player.x + 5,

            y:
                player.y,

            target,

            speed: 760,

            damage:
                saveData.damage
        });
    }
}

function updateWeapon(dt) {

    weaponTimer =
        Math.max(
            0,
            weaponTimer - dt
        );

    if (
        saveData.weapon
    ) {

        if (
            weaponTimer <= 0
        ) {

            shoot();
        }
    }

    for (
        let i =
            projectiles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            projectiles[i];

        if (
            !p.target ||
            !obstacles.includes(
                p.target
            )
        ) {

            projectiles.splice(
                i,
                1
            );

            continue;
        }

        const dx =
            p.target.x - p.x;

        const dy =
            p.target.y - p.y;

        const dist =
            Math.hypot(
                dx,
                dy
            );

        if (
            dist < 15
        ) {

            p.target.hp -=
                p.damage;

            createExplosion(
                p.target.x,
                p.target.y,
                6
            );

            if (
                p.target.hp <= 0
            ) {

                const index =
                    obstacles.indexOf(
                        p.target
                    );

                if (
                    index >= 0
                ) {

                    obstacles.splice(
                        index,
                        1
                    );

                    score +=
                        30 *
                        multiplier;

                    if (
                        typeof AudioFX !==
                        "undefined" &&
                        saveData.sound
                    ) {

                        initAudio();

                        AudioFX.explosion();
                    }
                }
            }

            projectiles.splice(
                i,
                1
            );

            continue;
        }

        p.x +=
            dx /
            dist *
            p.speed *
            dt;

        p.y +=
            dy /
            dist *
            p.speed *
            dt;
    }
}

/* =========================================================
   SHIELD
========================================================= */

function useShield() {

    if (
        !running ||
        paused ||
        shieldCooldown > 0 ||
        player.shield > 0
    ) {
        return;
    }

    player.shield =
        2.5 +
        saveData.shield *
        1.2;

    shieldCooldown =
        Math.max(
            4,
            10 -
            saveData.shield *
            1.5
        );

    createExplosion(
        player.x,
        player.y,
        25
    );

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.shield();
    }

    vibrate(50);
}

/* =========================================================
   EMP
========================================================= */

function useEMP() {

    if (
        !running ||
        paused ||
        empCooldown > 0
    ) {
        return;
    }

    empCooldown =
        Math.max(
            5,
            12 -
            saveData.emp *
            2
        );

    const radius =
        150 +
        saveData.emp *
        50;

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.emp();
    }

    for (
        let i =
            obstacles.length - 1;
        i >= 0;
        i--
    ) {

        const o =
            obstacles[i];

        const dist =
            Math.hypot(
                o.x - player.x,
                o.y - player.y
            );

        if (
            dist < radius
        ) {

            obstacles.splice(
                i,
                1
            );

            score +=
                15 *
                multiplier;

            createExplosion(
                o.x,
                o.y,
                10
            );
        }
    }

    shake = .4;

    showToast("⚡ EMP");

    vibrate(70);
}

/* =========================================================
   EVENT SYSTEM
========================================================= */

function triggerRandomEvent() {

    if (eventBusy) return;

    eventBusy = true;

    let available = [];

    if (
        gameTime < 60
    ) {

        available = [
            "meteor",
            "meteor",
            "laserSweep"
        ];

    } else if (
        gameTime < 120
    ) {

        available = [
            "laserSweep",
            "laserSweep",
            "laserStrike",
            "meteor",
            "hunter"
        ];

    } else if (
        gameTime < 180
    ) {

        available = [
            "laserSweep",
            "laserStrike",
            "hunter",
            "meteor",
            "electric"
        ];

    } else if (
        gameTime < 300
    ) {

        available = [
            "laserSweep",
            "laserStrike",
            "hunter",
            "meteor",
            "electric",
            "comboLaserMeteor",
            "comboHunterLaser",
            "comboElectricMeteor"
        ];

    } else {

        available = [
            "laserSweep",
            "laserStrike",
            "hunter",
            "meteor",
            "electric",
            "comboLaserMeteor",
            "comboHunterLaser",
            "comboElectricMeteor",
            "comboTriple",
            "rare"
        ];
    }

    const event =
        available[
            Math.floor(
                Math.random() *
                available.length
            )
        ];

    if (
        event === "laserSweep"
    ) {

        laserSweep();

    } else if (
        event === "laserStrike"
    ) {

        laserStrike();

    } else if (
        event === "hunter"
    ) {

        spawnHunter();

    } else if (
        event === "meteor"
    ) {

        meteorRain();

    } else if (
        event === "electric"
    ) {

        electricField();

    } else if (
        event === "comboLaserMeteor"
    ) {

        comboLaserMeteor();

    } else if (
        event === "comboHunterLaser"
    ) {

        comboHunterLaser();

    } else if (
        event === "comboElectricMeteor"
    ) {

        comboElectricMeteor();

    } else if (
        event === "comboTriple"
    ) {

        comboTriple();

    } else if (
        event === "rare"
    ) {

        rareEvent();
    }
}

/* =========================================================
   LASER SWEEP
========================================================= */

function laserSweep() {

    showWarning(
        "LASER INCOMING",
        "FIND A SAFE ZONE"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();

            AudioFX.laser();
        }

        eventObjects.push({

            type: "laserSweep",

            y:
                130 +
                Math.random() *
                (H - 260),

            thickness: 22,

            active: true,

            timer: 0,

            duration: 1.5
        });

    }, 1300);

    setTimeout(() => {

        eventBusy = false;

    }, 3000);
}

/* =========================================================
   LASER STRIKE
========================================================= */

function laserStrike() {

    const vertical =
        Math.random() > .5;

    const position =
        vertical
            ? 40 +
              Math.random() *
              (W - 80)
            : 100 +
              Math.random() *
              (H - 200);

    showWarning(
        "⚠ LASER STRIKE",
        "MOVE!"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();

            AudioFX.laser();
        }

        eventObjects.push({

            type: "laserStrike",

            vertical,

            position,

            timer: 0,

            duration: .9,

            thickness: 35
        });

    }, 1100);

    setTimeout(() => {

        eventBusy = false;

    }, 2600);
}

/* =========================================================
   HUNTER
========================================================= */

function spawnHunter() {

    showWarning(
        "TARGET LOCKED",
        "ESCAPE THE HUNTER"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();

            AudioFX.hunter();
        }

        eventObjects.push({

            type: "hunter",

            x:
                Math.random() > .5
                    ? -50
                    : W + 50,

            y:
                Math.random() * H,

            radius: 22,

            life: 10,

            maxLife: 10,

            speed:
                100 +
                Math.min(
                    gameTime,
                    180
                ) * 1.5,

            pulse: 0
        });

    }, 800);

    setTimeout(() => {

        eventBusy = false;

    }, 2500);
}

/* =========================================================
   METEOR RAIN
========================================================= */

function meteorRain() {

    showWarning(
        "METEOR STORM",
        "DODGE THE IMPACTS"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();

            AudioFX.meteor();
        }

        const amount =
            gameTime >= 300
                ? 16
                : gameTime >= 180
                    ? 14
                    : 12;

        for (
            let i = 0;
            i < amount;
            i++
        ) {

            setTimeout(() => {

                if (
                    !running ||
                    gameOver
                ) {
                    return;
                }

                eventObjects.push({

                    type: "meteor",

                    x:
                        Math.random() *
                        W,

                    y: -50,

                    radius:
                        12 +
                        Math.random() *
                        13,

                    speed:
                        330 +
                        Math.random() *
                        250 +
                        Math.min(
                            gameTime,
                            300
                        ) * .25,

                    angle:
                        .3 +
                        Math.random() *
                        .5
                });

            }, i * 170);
        }

    }, 800);

    setTimeout(() => {

        eventBusy = false;

    }, 5000);
}

/* =========================================================
   ELECTRIC FIELD
========================================================= */

function electricField() {

    showWarning(
        "ELECTRIC FIELD",
        "KEEP MOVING"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();
        }

        eventObjects.push({

            type: "electric",

            x:
                Math.random() *
                W,

            width:
                80 +
                Math.random() *
                100,

            timer: 0,

            duration:
                gameTime >= 300
                    ? 7
                    : 6
        });

    }, 900);

    setTimeout(() => {

        eventBusy = false;

    }, 7500);
}

/* =========================================================
   LASER + METEOR
========================================================= */

function comboLaserMeteor() {

    showWarning(
        "DUAL ATTACK",
        "LASER + METEORS"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();

            AudioFX.laser();

            AudioFX.meteor();
        }

        const laserY =
            140 +
            Math.random() *
            (H - 280);

        eventObjects.push({

            type: "laserSweep",

            y: laserY,

            thickness: 22,

            active: true,

            timer: 0,

            duration: 1.5
        });

        for (
            let i = 0;
            i < 7;
            i++
        ) {

            setTimeout(() => {

                if (
                    !running ||
                    gameOver
                ) {
                    return;
                }

                eventObjects.push({

                    type: "meteor",

                    x:
                        Math.random() *
                        W,

                    y: -50,

                    radius:
                        12 +
                        Math.random() *
                        12,

                    speed:
                        360 +
                        Math.random() *
                        220,

                    angle:
                        .3 +
                        Math.random() *
                        .5
                });

            }, i * 210);
        }

    }, 900);

    setTimeout(() => {

        eventBusy = false;

    }, 3600);
}

/* =========================================================
   HUNTER + LASER
========================================================= */

function comboHunterLaser() {

    showWarning(
        "HUNTER LOCK",
        "LASER GRID ACTIVATED"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();

            AudioFX.hunter();

            AudioFX.laser();
        }

        eventObjects.push({

            type: "hunter",

            x:
                Math.random() > .5
                    ? -50
                    : W + 50,

            y:
                100 +
                Math.random() *
                (H - 200),

            radius: 22,

            life: 8,

            maxLife: 8,

            speed:
                125 +
                Math.min(
                    gameTime,
                    300
                ) * 1.5,

            pulse: 0
        });

        const vertical =
            Math.random() > .5;

        eventObjects.push({

            type: "laserStrike",

            vertical,

            position:
                vertical
                    ? 40 +
                      Math.random() *
                      (W - 80)
                    : 100 +
                      Math.random() *
                      (H - 200),

            timer: 0,

            duration: 1,

            thickness: 30
        });

    }, 850);

    setTimeout(() => {

        eventBusy = false;

    }, 3200);
}

/* =========================================================
   ELECTRIC + METEORS
========================================================= */

function comboElectricMeteor() {

    showWarning(
        "STORM WARNING",
        "ELECTRIC + METEOR STORM"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();

            AudioFX.meteor();
        }

        eventObjects.push({

            type: "electric",

            x:
                Math.random() *
                W,

            width:
                90 +
                Math.random() *
                100,

            timer: 0,

            duration: 6
        });

        for (
            let i = 0;
            i < 9;
            i++
        ) {

            setTimeout(() => {

                if (
                    !running ||
                    gameOver
                ) {
                    return;
                }

                eventObjects.push({

                    type: "meteor",

                    x:
                        Math.random() *
                        W,

                    y: -50,

                    radius:
                        12 +
                        Math.random() *
                        13,

                    speed:
                        340 +
                        Math.random() *
                        240,

                    angle:
                        .3 +
                        Math.random() *
                        .5
                });

            }, i * 180);
        }

    }, 800);

    setTimeout(() => {

        eventBusy = false;

    }, 4300);
}

/* =========================================================
   TRIPLE CHAOS
========================================================= */

function comboTriple() {

    showWarning(
        "⚠ CHAOS MODE",
        "THREE THREATS"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();

            AudioFX.laser();

            AudioFX.hunter();

            AudioFX.meteor();
        }

        eventObjects.push({

            type: "electric",

            x:
                Math.random() *
                W,

            width:
                80 +
                Math.random() *
                90,

            timer: 0,

            duration: 6
        });

        eventObjects.push({

            type: "hunter",

            x:
                Math.random() > .5
                    ? -60
                    : W + 60,

            y:
                120 +
                Math.random() *
                (H - 240),

            radius: 23,

            life: 8,

            maxLife: 8,

            speed:
                140 +
                Math.min(
                    gameTime,
                    400
                ),

            pulse: 0
        });

        eventObjects.push({

            type: "laserStrike",

            vertical:
                Math.random() > .5,

            position:
                Math.random() > .5
                    ? 40 +
                      Math.random() *
                      (W - 80)
                    : 100 +
                      Math.random() *
                      (H - 200),

            timer: 0,

            duration: 1,

            thickness: 32
        });

        for (
            let i = 0;
            i < 6;
            i++
        ) {

            setTimeout(() => {

                if (
                    !running ||
                    gameOver
                ) {
                    return;
                }

                eventObjects.push({

                    type: "meteor",

                    x:
                        Math.random() *
                        W,

                    y: -50,

                    radius:
                        11 +
                        Math.random() *
                        13,

                    speed:
                        360 +
                        Math.random() *
                        250,

                    angle:
                        .3 +
                        Math.random() *
                        .5
                });

            }, i * 240);
        }

    }, 800);

    setTimeout(() => {

        eventBusy = false;

    }, 5000);
}

/* =========================================================
   RARE EVENTS
========================================================= */

function rareEvent() {

    const rare = [
        "crystalRush",
        "redAlert",
        "safeZone",
        "overcharge"
    ];

    const type =
        rare[
            Math.floor(
                Math.random() *
                rare.length
            )
        ];

    if (
        type === "crystalRush"
    ) {
        crystalRush();
    }

    if (
        type === "redAlert"
    ) {
        redAlert();
    }

    if (
        type === "safeZone"
    ) {
        safeZone();
    }

    if (
        type === "overcharge"
    ) {
        overcharge();
    }
}

/* =========================================================
   CRYSTAL RUSH
========================================================= */

function crystalRush() {

    showWarning(
        "💎 CRYSTAL RUSH",
        "COLLECT EVERYTHING!"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();
        }

        for (
            let i = 0;
            i < 24;
            i++
        ) {

            eventObjects.push({

                type: "rushCrystal",

                x:
                    25 +
                    Math.random() *
                    (W - 50),

                y:
                    -20 -
                    Math.random() *
                    500,

                radius: 8,

                speed:
                    250 +
                    Math.random() *
                    100,

                angle:
                    Math.random() *
                    Math.PI *
                    2
            });
        }

    }, 700);

    setTimeout(() => {

        eventBusy = false;

    }, 5500);
}

/* =========================================================
   RED ALERT
========================================================= */

function redAlert() {

    showWarning(
        "🔴 RED ALERT",
        "SURVIVE THE ASSAULT"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();

            AudioFX.meteor();

            AudioFX.hunter();

            AudioFX.laser();
        }

        for (
            let i = 0;
            i < 8;
            i++
        ) {

            eventObjects.push({

                type: "meteor",

                x:
                    Math.random() *
                    W,

                y:
                    -50 -
                    Math.random() *
                    250,

                radius:
                    13 +
                    Math.random() *
                    13,

                speed:
                    400 +
                    Math.random() *
                    250,

                angle:
                    .3 +
                    Math.random() *
                    .5
            });
        }

        eventObjects.push({

            type: "hunter",

            x:
                Math.random() > .5
                    ? -60
                    : W + 60,

            y:
                100 +
                Math.random() *
                (H - 200),

            radius: 23,

            life: 9,

            maxLife: 9,

            speed:
                150 +
                Math.min(
                    gameTime,
                    400
                ),

            pulse: 0
        });

        eventObjects.push({

            type: "laserStrike",

            vertical:
                Math.random() > .5,

            position:
                Math.random() > .5
                    ? 40 +
                      Math.random() *
                      (W - 80)
                    : 100 +
                      Math.random() *
                      (H - 200),

            timer: 0,

            duration: 1,

            thickness: 34
        });

    }, 900);

    setTimeout(() => {

        eventBusy = false;

    }, 4500);
}

/* =========================================================
   SAFE ZONE
========================================================= */

function safeZone() {

    showWarning(
        "🟢 SAFE ZONE",
        "TAKE A BREATH"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();
        }

        eventObjects.push({

            type: "safeZone",

            x:
                W * .5,

            y:
                H * .58,

            radius:
                Math.min(
                    W,
                    H
                ) * .18,

            timer: 0,

            duration: 8
        });

        activateBuff(
            "SHIELD"
        );

    }, 700);

    setTimeout(() => {

        eventBusy = false;

    }, 9000);
}

/* =========================================================
   OVERCHARGE
========================================================= */

function overcharge() {

    showWarning(
        "⚡ OVERCHARGE",
        "POWER SURGE"
    );

    setTimeout(() => {

        if (
            !running ||
            gameOver
        ) {

            eventBusy = false;

            return;
        }

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.eventStart();
        }

        activateBuff(
            "DOUBLE"
        );

        activateBuff(
            "LASER"
        );

        score += 100;

        createExplosion(
            player.x,
            player.y,
            35
        );

        shake = .35;

    }, 600);

    setTimeout(() => {

        eventBusy = false;

    }, 2500);
}

/* =========================================================
   EVENTS UPDATE
========================================================= */

function updateEvents(dt) {

    eventTimer -= dt;

    let nextEventTime;

    if (
        gameTime < 60
    ) {

        nextEventTime =
            12 +
            Math.random() * 5;

    } else if (
        gameTime < 120
    ) {

        nextEventTime =
            10 +
            Math.random() * 4;

    } else if (
        gameTime < 180
    ) {

        nextEventTime =
            8 +
            Math.random() * 4;

    } else if (
        gameTime < 300
    ) {

        nextEventTime =
            7 +
            Math.random() * 3;

    } else {

        nextEventTime =
            Math.max(
                5,
                8 -
                Math.min(
                    2,
                    (
                        gameTime -
                        300
                    ) / 180
                )
            ) +
            Math.random() * 2.5;
    }

    if (
        eventTimer <= 0
    ) {

        eventTimer =
            nextEventTime;

        triggerRandomEvent();
    }

    for (
        let i =
            eventObjects.length - 1;
        i >= 0;
        i--
    ) {

        const o =
            eventObjects[i];

        if (
            o.type === "buff"
        ) continue;

        if (
            o.type ===
            "laserSweep"
        ) {

            o.timer += dt;

            if (
                o.timer >= .25 &&
                o.timer <= 1.15
            ) {

                const distance =
                    Math.abs(
                        player.y -
                        o.y
                    );

                if (
                    distance <
                    player.radius +
                    o.thickness / 2
                ) {

                    damagePlayer();
                }
            }

            if (
                o.timer >=
                o.duration
            ) {

                eventObjects.splice(
                    i,
                    1
                );
            }
        }

        if (
            o.type ===
            "laserStrike"
        ) {

            o.timer += dt;

            if (
                o.timer > .15
            ) {

                const hit =
                    o.vertical
                        ? Math.abs(
                            player.x -
                            o.position
                        )
                        : Math.abs(
                            player.y -
                            o.position
                        );

                if (
                    hit <
                    player.radius +
                    o.thickness / 2
                ) {

                    damagePlayer();
                }
            }

            if (
                o.timer >=
                o.duration
            ) {

                eventObjects.splice(
                    i,
                    1
                );
            }
        }

        if (
            o.type === "hunter"
        ) {

            o.life -= dt;

            o.pulse +=
                dt * 8;

            const dx =
                player.x -
                o.x;

            const dy =
                player.y -
                o.y;

            const dist =
                Math.hypot(
                    dx,
                    dy
                );

            o.x +=
                dx /
                Math.max(
                    dist,
                    1
                ) *
                o.speed *
                dt;

            o.y +=
                dy /
                Math.max(
                    dist,
                    1
                ) *
                o.speed *
                dt;

            if (
                dist <
                player.radius +
                o.radius
            ) {

                damagePlayer();

                o.x -=
                    dx /
                    Math.max(
                        dist,
                        1
                    ) *
                    100;

                o.y -=
                    dy /
                    Math.max(
                        dist,
                        1
                    ) *
                    100;
            }

            if (
                o.life <= 0
            ) {

                createExplosion(
                    o.x,
                    o.y,
                    20
                );

                eventObjects.splice(
                    i,
                    1
                );
            }
        }

        if (
            o.type === "meteor"
        ) {

            o.x +=
                Math.sin(
                    o.angle
                ) *
                100 *
                dt;

            o.y +=
                o.speed *
                dt;

            if (
                Math.hypot(
                    o.x -
                    player.x,
                    o.y -
                    player.y
                ) <
                player.radius +
                o.radius
            ) {

                damagePlayer();

                eventObjects.splice(
                    i,
                    1
                );

                continue;
            }

            if (
                o.y >
                H + 80
            ) {

                eventObjects.splice(
                    i,
                    1
                );
            }
        }

        if (
            o.type === "electric"
        ) {

            o.timer += dt;

            if (
                o.timer > .7 &&
                o.timer < 5.5
            ) {

                if (
                    Math.abs(
                        player.x -
                        o.x
                    ) <
                    o.width / 2 +
                    player.radius
                ) {

                    damagePlayer();
                }
            }

            if (
                o.timer >=
                o.duration
            ) {

                eventObjects.splice(
                    i,
                    1
                );
            }
        }

        if (
            o.type ===
            "rushCrystal"
        ) {

            o.y +=
                o.speed *
                dt;

            o.angle +=
                dt * 5;

            if (
                Math.hypot(
                    o.x -
                    player.x,
                    o.y -
                    player.y
                ) <
                player.radius +
                o.radius +
                6
            ) {

                saveData.crystals += 2;

                score +=
                    40 *
                    multiplier;

                createExplosion(
                    o.x,
                    o.y,
                    10
                );

                if (
                    typeof AudioFX !==
                    "undefined" &&
                    saveData.sound
                ) {

                    initAudio();

                    AudioFX.crystal();
                }

                eventObjects.splice(
                    i,
                    1
                );

                save();

                continue;
            }

            if (
                o.y >
                H + 40
            ) {

                eventObjects.splice(
                    i,
                    1
                );
            }
        }

        if (
            o.type === "safeZone"
        ) {

            o.timer += dt;

            if (
                o.timer >=
                o.duration
            ) {

                eventObjects.splice(
                    i,
                    1
                );
            }
        }
    }
}

/* =========================================================
   SAFE ZONE CHECK
========================================================= */

function playerInsideSafeZone() {

    for (
        const o of eventObjects
    ) {

        if (
            o.type !==
            "safeZone"
        ) continue;

        if (
            o.timer >=
            o.duration
        ) continue;

        const dist =
            Math.hypot(
                player.x - o.x,
                player.y - o.y
            );

        if (
            dist < o.radius
        ) {

            return true;
        }
    }

    return false;
}

/* =========================================================
   EVENT WARNING
========================================================= */

let warningTimeout;

function showWarning(
    title,
    text
) {

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.warning();
    }

    clearTimeout(
        warningTimeout
    );

    eventWarningTitle.textContent =
        title;

    eventWarningText.textContent =
        text;

    eventWarning.classList.add(
        "show"
    );

    warningTimeout =
        setTimeout(() => {

            eventWarning.classList.remove(
                "show"
            );

        }, 1100);
}

/* =========================================================
   COLLISIONS
========================================================= */

function damagePlayer() {

    if (
        player.invincible > 0 ||
        player.shield > 0 ||
        hasBuff("SHIELD") ||
        playerInsideSafeZone()
    ) {

        return;
    }

    player.lives--;

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.damage();
    }

    player.invincible =
        1.5;

    shake = .55;

    createExplosion(
        player.x,
        player.y,
        18
    );

    vibrate(100);

    updateHUD();

    if (
        player.lives <= 0
    ) {

        endGame();
    }
}

function checkObstacleCollisions() {

    for (
        let i =
            obstacles.length - 1;
        i >= 0;
        i--
    ) {

        const o =
            obstacles[i];

        const dist =
            Math.hypot(
                o.x - player.x,
                o.y - player.y
            );

        if (
            dist <
            player.radius +
            o.size * .7
        ) {

            obstacles.splice(
                i,
                1
            );

            damagePlayer();
        }
    }
}

/* =========================================================
   SCORE / GAME TIME
========================================================= */

function updateScore(dt) {

    score +=
        dt *
        12 *
        multiplier;

    const newMultiplier =
        1 +
        Math.floor(
            gameTime / 20
        );

    multiplier =
        Math.min(
            9,
            newMultiplier
        );

    if (
        hasBuff("DOUBLE")
    ) {

        multiplier =
            Math.min(
                12,
                multiplier * 2
            );
    }
}

/* =========================================================
   BUFF SPAWN
========================================================= */

function updateBuffSpawning(dt) {

    buffSpawnTimer -= dt;

    if (
        buffSpawnTimer <= 0
    ) {

        buffSpawnTimer =
            gameTime >= 300
                ? 10 +
                  Math.random() * 6
                : 12 +
                  Math.random() * 8;

        spawnBuff();
    }
}

/* =========================================================
   BACKGROUND
========================================================= */

function createStars() {

    stars = [];

    const count =
        Math.floor(
            Math.min(
                180,
                W * H / 5500
            )
        );

    for (
        let i = 0;
        i < count;
        i++
    ) {

        stars.push({

            x:
                Math.random() *
                W,

            y:
                Math.random() *
                H,

            size:
                .5 +
                Math.random() *
                1.5,

            speed:
                15 +
                Math.random() *
                70,

            alpha:
                .2 +
                Math.random() *
                .8
        });
    }
}

function updateStars(dt) {

    for (
        const s of stars
    ) {

        s.y +=
            s.speed *
            dt *
            (
                1 +
                gameTime / 80
            );

        if (
            s.y > H
        ) {

            s.y = 0;

            s.x =
                Math.random() *
                W;
        }
    }
}

/* =========================================================
   PARTICLES
========================================================= */

function createExplosion(
    x,
    y,
    amount = 12
) {

    for (
        let i = 0;
        i < amount;
        i++
    ) {

        const angle =
            Math.random() *
            Math.PI * 2;

        const speed =
            40 +
            Math.random() *
            220;

        particles.push({

            x,

            y,

            vx:
                Math.cos(angle) *
                speed,

            vy:
                Math.sin(angle) *
                speed,

            life: 1,

            size:
                1 +
                Math.random() * 3
        });
    }
}

function updateParticles(dt) {

    for (
        let i =
            particles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            particles[i];

        p.x +=
            p.vx * dt;

        p.y +=
            p.vy * dt;

        p.vx *= .97;

        p.vy *= .97;

        p.life -=
            dt * 2.2;

        if (
            p.life <= 0
        ) {

            particles.splice(
                i,
                1
            );
        }
    }
}

/* =========================================================
   DRAW BACKGROUND
========================================================= */

function drawBackground() {

    ctx.fillStyle =
        "#03050a";

    ctx.fillRect(
        0,
        0,
        W,
        H
    );

    const gradient =
        ctx.createRadialGradient(
            W / 2,
            H * .55,
            0,
            W / 2,
            H * .55,
            Math.max(
                W,
                H
            ) * .7
        );

    gradient.addColorStop(
        0,
        "rgba(0,100,180,.09)"
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

    for (
        const s of stars
    ) {

        ctx.globalAlpha =
            s.alpha;

        ctx.fillStyle =
            "#fff";

        ctx.beginPath();

        ctx.arc(
            s.x,
            s.y,
            s.size,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;

    ctx.strokeStyle =
        "rgba(0,180,255,.045)";

    ctx.lineWidth = 1;

    const grid =
        50 +
        Math.min(
            35,
            gameTime / 5
        );

    for (
        let x = 0;
        x < W;
        x += grid
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
        y += grid
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
}

/* =========================================================
   DRAW PLAYER
========================================================= */

function drawPlayer() {

    if (!player) return;

    for (
        let i = 0;
        i < player.trail.length;
        i++
    ) {

        const p =
            player.trail[i];

        ctx.globalAlpha =
            p.life *
            (
                i /
                player.trail.length
            ) *
            .45;

        ctx.fillStyle =
            "#00eaff";

        ctx.beginPath();

        ctx.arc(
            p.x,
            p.y,
            player.radius *
            (
                i /
                player.trail.length
            ),
            0,
            Math.PI * 2
        );

        ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (
        player.invincible > 0 &&
        Math.floor(
            player.invincible * 12
        ) % 2 === 0
    ) {

        return;
    }

    if (
        player.shield > 0 ||
        hasBuff("SHIELD")
    ) {

        ctx.strokeStyle =
            "rgba(0,230,255,.7)";

        ctx.lineWidth = 3;

        ctx.shadowBlur = 25;

        ctx.shadowColor =
            "#00eaff";

        ctx.beginPath();

        ctx.arc(
            player.x,
            player.y,
            player.radius + 10,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        ctx.shadowBlur = 0;
    }

    const g =
        ctx.createRadialGradient(
            player.x,
            player.y,
            0,
            player.x,
            player.y,
            28
        );

    g.addColorStop(
        0,
        "rgba(255,255,255,1)"
    );

    g.addColorStop(
        .25,
        "rgba(0,240,255,1)"
    );

    g.addColorStop(
        1,
        "rgba(0,100,255,0)"
    );

    ctx.fillStyle = g;

    ctx.beginPath();

    ctx.arc(
        player.x,
        player.y,
        28,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle =
        "#dfffff";

    ctx.beginPath();

    ctx.moveTo(
        player.x,
        player.y - 15
    );

    ctx.lineTo(
        player.x + 12,
        player.y + 12
    );

    ctx.lineTo(
        player.x,
        player.y + 7
    );

    ctx.lineTo(
        player.x - 12,
        player.y + 12
    );

    ctx.closePath();

    ctx.fill();
}

/* =========================================================
   DRAW OBSTACLES
========================================================= */

function drawObstacles() {

    for (
        const o of obstacles
    ) {

        ctx.save();

        ctx.translate(
            o.x,
            o.y
        );

        ctx.rotate(
            o.angle
        );

        ctx.shadowBlur = 22;

        ctx.shadowColor =
            o.type === "fast"
                ? "#ff285d"
                : "#ff164f";

        ctx.strokeStyle =
            o.type === "fast"
                ? "#ff5c80"
                : "#ff245c";

        ctx.lineWidth = 2;

        ctx.fillStyle =
            "rgba(255,20,70,.16)";

        ctx.beginPath();

        ctx.moveTo(
            0,
            -o.size
        );

        ctx.lineTo(
            o.size,
            0
        );

        ctx.lineTo(
            0,
            o.size
        );

        ctx.lineTo(
            -o.size,
            0
        );

        ctx.closePath();

        ctx.fill();

        ctx.stroke();

        ctx.shadowBlur = 0;

        ctx.restore();
    }
}

/* =========================================================
   DRAW CRYSTALS
========================================================= */

function drawCrystals() {

    for (
        const c of crystalsOnMap
    ) {

        ctx.save();

        ctx.translate(
            c.x,
            c.y
        );

        ctx.rotate(
            c.angle
        );

        ctx.shadowBlur = 18;

        ctx.shadowColor =
            "#00eaff";

        ctx.fillStyle =
            "#00eaff";

        ctx.beginPath();

        ctx.moveTo(
            0,
            -c.radius
        );

        ctx.lineTo(
            c.radius * .7,
            0
        );

        ctx.lineTo(
            0,
            c.radius
        );

        ctx.lineTo(
            -c.radius * .7,
            0
        );

        ctx.closePath();

        ctx.fill();

        ctx.restore();
    }
}

/* =========================================================
   DRAW PROJECTILES
========================================================= */

function drawProjectiles() {

    for (
        const p of projectiles
    ) {

        ctx.shadowBlur = 18;

        ctx.shadowColor =
            "#00ffff";

        ctx.strokeStyle =
            "#00ffff";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(
            p.x,
            p.y
        );

        ctx.lineTo(
            p.x,
            p.y + 16
        );

        ctx.stroke();

        ctx.shadowBlur = 0;
    }
}

/* =========================================================
   DRAW BUFF OBJECTS
========================================================= */

function drawBuffObjects() {

    for (
        const o of eventObjects
    ) {

        if (
            o.type !== "buff"
        ) continue;

        ctx.save();

        ctx.translate(
            o.x,
            o.y
        );

        ctx.rotate(
            o.rotation
        );

        ctx.shadowBlur = 25;

        ctx.shadowColor =
            "#00eaff";

        ctx.strokeStyle =
            "#00eaff";

        ctx.fillStyle =
            "rgba(0,220,255,.14)";

        ctx.lineWidth = 2;

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            o.radius + 5,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.stroke();

        ctx.rotate(
            -o.rotation
        );

        ctx.font =
            "17px Arial";

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";

        ctx.fillText(
            buffInfo[
                o.buffType
            ].icon,
            0,
            0
        );

        ctx.restore();
    }
}

/* =========================================================
   DRAW EVENTS
========================================================= */

function drawEvents() {

    for (
        const o of eventObjects
    ) {

        if (
            o.type ===
            "laserSweep"
        ) {

            const alpha =
                o.timer < .3
                    ? .35
                    : 1;

            ctx.save();

            ctx.globalAlpha =
                alpha;

            ctx.fillStyle =
                "rgba(255,0,50,.18)";

            ctx.fillRect(
                0,
                o.y -
                o.thickness,
                W,
                o.thickness * 2
            );

            ctx.shadowBlur = 30;

            ctx.shadowColor =
                "#ff003c";

            ctx.fillStyle =
                "#ff174f";

            ctx.fillRect(
                0,
                o.y - 3,
                W,
                6
            );

            ctx.restore();
        }

        if (
            o.type ===
            "laserStrike"
        ) {

            ctx.save();

            ctx.shadowBlur = 35;

            ctx.shadowColor =
                "#ff003c";

            ctx.fillStyle =
                "rgba(255,0,60,.2)";

            if (
                o.vertical
            ) {

                ctx.fillRect(
                    o.position -
                    o.thickness / 2,
                    0,
                    o.thickness,
                    H
                );

            } else {

                ctx.fillRect(
                    0,
                    o.position -
                    o.thickness / 2,
                    W,
                    o.thickness
                );
            }

            ctx.fillStyle =
                "#ff174f";

            if (
                o.vertical
            ) {

                ctx.fillRect(
                    o.position - 3,
                    0,
                    6,
                    H
                );

            } else {

                ctx.fillRect(
                    0,
                    o.position - 3,
                    W,
                    6
                );
            }

            ctx.restore();
        }

        if (
            o.type === "hunter"
        ) {

            ctx.save();

            ctx.shadowBlur = 25;

            ctx.shadowColor =
                "#ff174f";

            ctx.strokeStyle =
                "#ff174f";

            ctx.fillStyle =
                "rgba(255,20,70,.18)";

            ctx.lineWidth = 3;

            ctx.beginPath();

            ctx.arc(
                o.x,
                o.y,
                o.radius,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.stroke();

            ctx.fillStyle =
                "#ff174f";

            ctx.beginPath();

            ctx.arc(
                o.x,
                o.y,
                5 +
                Math.sin(
                    o.pulse
                ) * 2,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.restore();
        }

        if (
            o.type === "meteor"
        ) {

            ctx.save();

            ctx.translate(
                o.x,
                o.y
            );

            ctx.rotate(
                o.angle
            );

            ctx.shadowBlur = 25;

            ctx.shadowColor =
                "#ff7b00";

            ctx.fillStyle =
                "#ff5b22";

            ctx.beginPath();

            ctx.arc(
                0,
                0,
                o.radius,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.fillStyle =
                "rgba(255,160,30,.5)";

            ctx.fillRect(
                -o.radius * 2,
                -3,
                o.radius * 2,
                6
            );

            ctx.restore();
        }

        if (
            o.type === "electric"
        ) {

            ctx.save();

            ctx.fillStyle =
                "rgba(0,150,255,.10)";

            ctx.fillRect(
                o.x -
                o.width / 2,
                0,
                o.width,
                H
            );

            ctx.strokeStyle =
                "rgba(0,220,255,.7)";

            ctx.lineWidth = 2;

            ctx.setLineDash([
                8,
                10
            ]);

            ctx.beginPath();

            ctx.moveTo(
                o.x,
                0
            );

            ctx.lineTo(
                o.x,
                H
            );

            ctx.stroke();

            ctx.setLineDash([]);

            ctx.restore();
        }

        if (
            o.type ===
            "rushCrystal"
        ) {

            ctx.save();

            ctx.translate(
                o.x,
                o.y
            );

            ctx.rotate(
                o.angle
            );

            ctx.shadowBlur = 25;

            ctx.shadowColor =
                "#00eaff";

            ctx.fillStyle =
                "#00eaff";

            ctx.beginPath();

            ctx.moveTo(
                0,
                -o.radius
            );

            ctx.lineTo(
                o.radius * .8,
                0
            );

            ctx.lineTo(
                0,
                o.radius
            );

            ctx.lineTo(
                -o.radius * .8,
                0
            );

            ctx.closePath();

            ctx.fill();

            ctx.strokeStyle =
                "#ffffff";

            ctx.lineWidth = 1;

            ctx.stroke();

            ctx.restore();
        }

        if (
            o.type === "safeZone"
        ) {

            const pulse =
                Math.sin(
                    performance.now() *
                    .006
                ) * 5;

            ctx.save();

            ctx.globalAlpha = .18;

            ctx.fillStyle =
                "#00ff88";

            ctx.beginPath();

            ctx.arc(
                o.x,
                o.y,
                o.radius + pulse,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.globalAlpha =
                .75;

            ctx.strokeStyle =
                "#00ff88";

            ctx.lineWidth = 3;

            ctx.shadowBlur = 25;

            ctx.shadowColor =
                "#00ff88";

            ctx.beginPath();

            ctx.arc(
                o.x,
                o.y,
                o.radius + pulse,
                0,
                Math.PI * 2
            );

            ctx.stroke();

            ctx.restore();
        }
    }
}

/* =========================================================
   DRAW PARTICLES
========================================================= */

function drawParticles() {

    for (
        const p of particles
    ) {

        ctx.globalAlpha =
            Math.max(
                0,
                p.life
            );

        ctx.fillStyle =
            "#00eaff";

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
   HUD
========================================================= */

function updateHUD() {

    scoreEl.textContent =
        Math.floor(score);

    bestEl.textContent =
        Math.floor(
            Math.max(
                saveData.best,
                score
            )
        );

    multiplierEl.textContent =
        `x${multiplier}`;

    healthEl.textContent =
        player
            ? player.lives
            : 0;

    crystalsEl.textContent =
        saveData.crystals;

    document.getElementById(
        "shieldButton"
    ).disabled =
        shieldCooldown > 0 ||
        !player ||
        player.shield > 0;

    document.getElementById(
        "empButton"
    ).disabled =
        empCooldown > 0 ||
        !player;
}

/* =========================================================
   TOAST
========================================================= */

let toastTimer;

function showToast(text) {

    toast.textContent =
        text;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 1200);
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
   GAME OVER
========================================================= */

async function endGame() {

    if (gameOver) return;

    gameOver = true;

    running = false;

    if (
        typeof AudioFX !== "undefined" &&
        saveData.sound
    ) {

        initAudio();

        AudioFX.death();
    }

    const finalScore =
        Math.floor(score);

    if (
        finalScore >
        saveData.best
    ) {

        saveData.best =
            finalScore;
    }

    const reward =
        Math.max(
            5,
            Math.min(
                40,
                Math.floor(
                    finalScore / 250
                ) + 5
            )
        );

    saveData.crystals +=
        reward;

    /*
        Считаем именно ПОЛНОЕ проигрывание,
        когда закончились жизни.
    */

    saveData.adLossCount =
        Number(saveData.adLossCount || 0) + 1;

    const losses =
        saveData.adLossCount;

    const shouldShowInterstitial =
        losses >=
        INTERSTITIAL_LOSS_INTERVAL;

    /*
        Если это 4-е, 8-е, 12-е...
        проигрывание — сбрасываем счётчик
        после успешного показа рекламы.
    */

    save();

    document.getElementById(
        "finalScore"
    ).textContent =
        finalScore;

    document.getElementById(
        "rewardAmount"
    ).textContent =
        reward;

    hud.style.display =
        "none";

    showScreen(
        gameOverScreen
    );

    updateMenuUI();

    /*
        Небольшая задержка после смерти,
        чтобы GAME OVER успел появиться.
    */

    if (
        shouldShowInterstitial &&
        AdMob
    ) {

        setTimeout(
            async () => {

                const shown =
                    await showInterstitialAd();

                if (shown) {

                    saveData.adLossCount = 0;

                    save();

                    console.log(
                        "Interstitial shown after 4 losses"
                    );

                } else {

                    /*
                        Если реклама не загрузилась,
                        счётчик НЕ сбрасываем.
                        Значит следующая попытка
                        сможет показать её.
                    */

                    console.log(
                        "Interstitial unavailable"
                    );
                }

            },
            700
        );
    }
}

/* =========================================================
   REVIVE
========================================================= */

document.getElementById(
    "reviveButton"
).onclick = async () => {

    audioClick();

    if (
        reviveUsed ||
        !gameOver
    ) {

        showToast(
            "REVIVE ALREADY USED"
        );

        return;
    }

    const btn =
        document.getElementById(
            "reviveButton"
        );

    /*
        Не блокируем reviveUsed навсегда
        до получения награды.
    */

    btn.disabled = true;

    btn.textContent =
        "WATCHING AD...";

    showToast(
        "LOADING AD..."
    );

    const rewarded =
        await showRewardedReviveAd();

    /*
        ЕСЛИ пользователь получил награду —
        только тогда возрождаем.
    */

    if (rewarded) {

        reviveUsed = true;

        gameOver = false;

        running = true;

        player.lives =
            Math.max(
                1,
                Math.min(
                    saveData.lives,
                    2
                )
            );

        player.invincible = 4;

        player.shield = 3;

        if (
            typeof AudioFX !== "undefined" &&
            saveData.sound
        ) {

            initAudio();

            AudioFX.revive();
        }

        showScreen(menu);

        menu.classList.remove(
            "active"
        );

        hud.style.display =
            "block";

        lastTime =
            performance.now();

        showToast(
            "REVIVED! 🛡️"
        );

        updateHUD();

        requestAnimationFrame(
            loop
        );

        return;
    }

    /*
        Рекламу не посмотрел / реклама
        не загрузилась / произошла ошибка.
        Возрождения НЕТ.
    */

    btn.disabled = false;

    btn.textContent =
        "▶ REVIVE — WATCH AD";

    showToast(
        "AD NOT COMPLETED"
    );
};

document.getElementById(
    "restartButton"
).onclick = () => {

    audioClick();

    startGame();
};

/* =========================================================
   MAIN LOOP
========================================================= */

function loop(now) {

    if (
        !running ||
        paused ||
        gameOver
    ) {

        return;
    }

    let dt =
        (now - lastTime) /
        1000;

    lastTime = now;

    dt =
        Math.min(
            dt,
            .033
        );

    gameTime += dt;

    updateStars(dt);

    updatePlayer(dt);

    updateObstacles(dt);

    updateCrystals(dt);

    updateBuffSpawning(dt);

    updateBuffObjects(dt);

    updateBuffs(dt);

    updateEvents(dt);

    updateWeapon(dt);

    updateParticles(dt);

    checkObstacleCollisions();

    updateScore(dt);

    if (
        shake > 0
    ) {

        shake -= dt;
    }

    draw();

    updateHUD();

    requestAnimationFrame(
        loop
    );
}

/* =========================================================
   DRAW
========================================================= */

function draw() {

    ctx.save();

    if (
        shake > 0
    ) {

        ctx.translate(

            (
                Math.random() -
                .5
            ) *
            shake *
            25,

            (
                Math.random() -
                .5
            ) *
            shake *
            25
        );
    }

    drawBackground();

    drawCrystals();

    drawObstacles();

    drawEvents();

    drawBuffObjects();

    drawProjectiles();

    drawParticles();

    drawPlayer();

    /* =========================================
       LASER BUFF
    ========================================= */

    if (
        hasBuff("LASER")
    ) {

        ctx.save();

        ctx.globalAlpha =
            .65 +
            Math.sin(
                performance.now() *
                .02
            ) * .2;

        ctx.shadowBlur = 30;

        ctx.shadowColor =
            "#ff003c";

        ctx.strokeStyle =
            "#ff174f";

        ctx.lineWidth = 5;

        ctx.beginPath();

        ctx.moveTo(
            player.x,
            player.y
        );

        ctx.lineTo(
            player.x,
            0
        );

        ctx.stroke();

        ctx.restore();

        for (
            let i =
                obstacles.length - 1;
            i >= 0;
            i--
        ) {

            const o =
                obstacles[i];

            if (
                Math.abs(
                    o.x -
                    player.x
                ) <
                o.size
            ) {

                createExplosion(
                    o.x,
                    o.y,
                    5
                );

                obstacles.splice(
                    i,
                    1
                );

                score +=
                    25 *
                    multiplier;

                if (
                    typeof AudioFX !== "undefined" &&
                    saveData.sound
                ) {

                    initAudio();

                    AudioFX.explosion();
                }
            }
        }
    }

    ctx.restore();
}

/* =========================================================
   ABILITY BUTTONS
========================================================= */

document.getElementById(
    "shieldButton"
).onclick = () => {

    audioClick();

    useShield();
};

document.getElementById(
    "empButton"
).onclick = () => {

    audioClick();

    useEMP();
};

/* =========================================================
   INITIALIZATION
========================================================= */

resize();

updateMenuUI();

updateSettingsUI();

updateDailyUI();

bestEl.textContent =
    saveData.best;

showScreen(menu);

/*
    AdMob запускается только в Android
    приложении, если плагин реально доступен.
*/

setTimeout(() => {

    preloadAds();

}, 1000);