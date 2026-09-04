const AudioFX = (() => {
    let ctx = null;
    let master = null;
    let musicGain = null;
    let soundGain = null;
    let musicTimer = null;
    let musicStep = 0;
    let musicEnabled = true;
    let soundEnabled = true;
    // Флаг: приложение сейчас находится в фоне
    let appPaused = false;
    const melody = [
        261.63,
        329.63,
        392.00,
        329.63,
        293.66,
        349.23,
        440.00,
        349.23
    ];
    function init() {
        if (ctx) {
            resume();
            return true;
        }
        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;
        if (!AudioContext) {
            console.warn("Web Audio API is not supported");
            return false;
        }
        try {
            ctx = new AudioContext();
            master = ctx.createGain();
            master.gain.value = 0.85;
            master.connect(ctx.destination);
            musicGain = ctx.createGain();
            musicGain.gain.value = 0.001;
            musicGain.connect(master);
            soundGain = ctx.createGain();
            soundGain.gain.value = 0.001;
            soundGain.connect(master);
            if (
                typeof saveData !== "undefined"
            ) {
                musicEnabled =
                    saveData.music !== false;
                soundEnabled =
                    saveData.sound !== false;
            }
            updateVolumes();
            return true;
        } catch (error) {
            console.error(
                "Audio initialization error:",
                error
            );
            ctx = null;
            return false;
        }
    }
    function resume() {
        if (!ctx || appPaused) return;
        try {
            if (ctx.state === "suspended") {
                ctx.resume();
            }
        } catch (error) {
            console.warn(
                "Audio resume error:",
                error
            );
        }
    }
    function pause() {
        if (!ctx) return;
        // Останавливаем таймер музыки
        stopMusic();
        try {
            if (
                ctx.state === "running"
            ) {
                ctx.suspend();
            }
        } catch (error) {
            console.warn(
                "Audio pause error:",
                error
            );
        }
    }
    function updateVolumes() {
        if (!ctx) return;
        const now = ctx.currentTime;
        musicGain.gain.cancelScheduledValues(now);
        soundGain.gain.cancelScheduledValues(now);
        musicGain.gain.setTargetAtTime(
            musicEnabled ? 0.14 : 0.001,
            now,
            0.08
        );
        soundGain.gain.setTargetAtTime(
            soundEnabled ? 0.65 : 0.001,
            now,
            0.04
        );
    }
    function tone(
        frequency,
        duration = 0.1,
        type = "sine",
        volume = 0.25,
        destination = soundGain,
        startDelay = 0
    ) {
        if (
            !ctx ||
            !destination ||
            appPaused
        ) {
            return;
        }
        const now =
            ctx.currentTime +
            startDelay;
        const oscillator =
            ctx.createOscillator();
        const gain =
            ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(
            frequency,
            now
        );
        gain.gain.setValueAtTime(
            0.001,
            now
        );
        gain.gain.exponentialRampToValueAtTime(
            Math.max(0.001, volume),
            now + 0.015
        );
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + duration
        );
        oscillator.connect(gain);
        gain.connect(destination);
        oscillator.start(now);
        oscillator.stop(
            now + duration + 0.03
        );
    }
    function noise(
        duration = 0.15,
        volume = 0.2,
        startDelay = 0
    ) {
        if (
            !ctx ||
            !soundGain ||
            appPaused
        ) {
            return;
        }
        const buffer =
            ctx.createBuffer(
                1,
                ctx.sampleRate * duration,
                ctx.sampleRate
            );
        const data =
            buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
            data[i] =
                Math.random() * 2 - 1;
        }
        const source =
            ctx.createBufferSource();
        const filter =
            ctx.createBiquadFilter();
        const gain =
            ctx.createGain();
        const now =
            ctx.currentTime +
            startDelay;
        source.buffer = buffer;
        filter.type = "lowpass";
        filter.frequency.value = 1800;
        gain.gain.setValueAtTime(
            0.001,
            now
        );
        gain.gain.exponentialRampToValueAtTime(
            Math.max(0.001, volume),
            now + 0.01
        );
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + duration
        );
        source
            .connect(filter)
            .connect(gain)
            .connect(soundGain);
        source.start(now);
        source.stop(
            now + duration + 0.03
        );
    }
    function click() {
        if (!soundEnabled) return;
        tone(
            620,
            0.055,
            "sine",
            0.18
        );
        tone(
            880,
            0.045,
            "sine",
            0.08,
            soundGain,
            0.025
        );
    }
    function crystal() {
        if (!soundEnabled) return;
        tone(
            880,
            0.09,
            "sine",
            0.22
        );
        tone(
            1320,
            0.12,
            "sine",
            0.16,
            soundGain,
            0.055
        );
        tone(
            1760,
            0.14,
            "sine",
            0.10,
            soundGain,
            0.10
        );
    }
    function buff() {
        if (!soundEnabled) return;
        tone(
            420,
            0.10,
            "sine",
            0.18
        );
        tone(
            630,
            0.12,
            "sine",
            0.20,
            soundGain,
            0.07
        );
        tone(
            920,
            0.18,
            "sine",
            0.20,
            soundGain,
            0.14
        );
    }
    function shoot() {
        if (!soundEnabled) return;
        tone(
            760,
            0.07,
            "square",
            0.10
        );
        tone(
            1150,
            0.045,
            "sine",
            0.07,
            soundGain,
            0.025
        );
    }
    function explosion() {
        if (!soundEnabled) return;
        noise(
            0.20,
            0.20
        );
        tone(
            110,
            0.22,
            "sawtooth",
            0.12
        );
    }
    function damage() {
        if (!soundEnabled) return;
        tone(
            180,
            0.16,
            "sawtooth",
            0.20
        );
        tone(
            90,
            0.20,
            "sine",
            0.15,
            soundGain,
            0.06
        );
        noise(
            0.12,
            0.10
        );
    }
    function death() {
        if (!soundEnabled) return;
        tone(
            440,
            0.15,
            "sine",
            0.18
        );
        tone(
            330,
            0.18,
            "sine",
            0.18,
            soundGain,
            0.12
        );
        tone(
            220,
            0.25,
            "sine",
            0.20,
            soundGain,
            0.25
        );
        tone(
            110,
            0.45,
            "sine",
            0.18,
            soundGain,
            0.40
        );
    }
    function shield() {
        if (!soundEnabled) return;
        tone(
            300,
            0.10,
            "sine",
            0.16
        );
        tone(
            500,
            0.16,
            "sine",
            0.18,
            soundGain,
            0.06
        );
        tone(
            760,
            0.24,
            "sine",
            0.18,
            soundGain,
            0.13
        );
    }
    function emp() {
        if (!soundEnabled) return;
        tone(
            70,
            0.35,
            "sawtooth",
            0.18
        );
        tone(
            140,
            0.28,
            "square",
            0.12,
            soundGain,
            0.05
        );
        tone(
            280,
            0.22,
            "sine",
            0.12,
            soundGain,
            0.12
        );
        noise(
            0.28,
            0.15
        );
    }
    function laser() {
        if (!soundEnabled) return;
        tone(
            150,
            0.45,
            "sawtooth",
            0.10
        );
        tone(
            900,
            0.35,
            "sine",
            0.10
        );
    }
    function meteor() {
        if (!soundEnabled) return;
        tone(
            100,
            0.35,
            "sawtooth",
            0.16
        );
        noise(
            0.30,
            0.15
        );
    }
    function hunter() {
        if (!soundEnabled) return;
        tone(
            160,
            0.18,
            "sine",
            0.14
        );
        tone(
            100,
            0.25,
            "sawtooth",
            0.13,
            soundGain,
            0.12
        );
        tone(
            70,
            0.35,
            "sine",
            0.12,
            soundGain,
            0.25
        );
    }
    function warning() {
        if (!soundEnabled) return;
        tone(
            600,
            0.12,
            "sine",
            0.17
        );
        tone(
            400,
            0.12,
            "sine",
            0.17,
            soundGain,
            0.16
        );
        tone(
            600,
            0.12,
            "sine",
            0.17,
            soundGain,
            0.32
        );
    }
    function eventStart() {
        if (!soundEnabled) return;
        tone(
            260,
            0.14,
            "sine",
            0.14
        );
        tone(
            390,
            0.18,
            "sine",
            0.15,
            soundGain,
            0.10
        );
        tone(
            520,
            0.22,
            "sine",
            0.16,
            soundGain,
            0.20
        );
    }
    function revive() {
        if (!soundEnabled) return;
        tone(
            300,
            0.12,
            "sine",
            0.15
        );
        tone(
            500,
            0.16,
            "sine",
            0.18,
            soundGain,
            0.08
        );
        tone(
            700,
            0.20,
            "sine",
            0.20,
            soundGain,
            0.18
        );
        tone(
            1000,
            0.28,
            "sine",
            0.16,
            soundGain,
            0.30
        );
    }
    function reward() {
        if (!soundEnabled) return;
        tone(
            523.25,
            0.10,
            "sine",
            0.18
        );
        tone(
            659.25,
            0.12,
            "sine",
            0.18,
            soundGain,
            0.08
        );
        tone(
            783.99,
            0.16,
            "sine",
            0.20,
            soundGain,
            0.16
        );
        tone(
            1046.50,
            0.25,
            "sine",
            0.18,
            soundGain,
            0.27
        );
    }
    function purchase() {
        if (!soundEnabled) return;
        tone(
            500,
            0.08,
            "sine",
            0.15
        );
        tone(
            750,
            0.13,
            "sine",
            0.18,
            soundGain,
            0.07
        );
    }
    function musicNote(frequency) {
        if (
            !ctx ||
            !musicGain ||
            !musicEnabled ||
            appPaused
        ) {
            return;
        }
        const now = ctx.currentTime;
        const osc =
            ctx.createOscillator();
        const filter =
            ctx.createBiquadFilter();
        const gain =
            ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(
            frequency,
            now
        );
        filter.type = "lowpass";
        filter.frequency.value = 1200;
        gain.gain.setValueAtTime(
            0.001,
            now
        );
        gain.gain.linearRampToValueAtTime(
            0.055,
            now + 0.08
        );
        gain.gain.linearRampToValueAtTime(
            0.001,
            now + 1.65
        );
        osc
            .connect(filter)
            .connect(gain)
            .connect(musicGain);
        osc.start(now);
        osc.stop(now + 1.7);
    }
    function musicLoop() {
        if (
            !ctx ||
            !musicEnabled ||
            appPaused
        ) {
            musicTimer = null;
            return;
        }
        musicNote(
            melody[musicStep]
        );
        musicStep =
            (musicStep + 1) %
            melody.length;
        musicTimer =
            setTimeout(
                musicLoop,
                1650
            );
    }
    function startMusic() {
        if (
            !ctx ||
            !musicEnabled ||
            appPaused
        ) {
            return;
        }
        if (musicTimer !== null) {
            return;
        }
        musicStep = 0;
        musicLoop();
    }
    function stopMusic() {
        if (musicTimer !== null) {
            clearTimeout(
                musicTimer
            );
            musicTimer = null;
        }
    }
    function setMusic(enabled) {
        musicEnabled = !!enabled;
        if (!ctx) {
            init();
        }
        if (!ctx) return;
        updateVolumes();
        if (
            musicEnabled &&
            !appPaused
        ) {
            startMusic();
        } else {
            stopMusic();
        }
    }
    function setSound(enabled) {
        soundEnabled = !!enabled;
        if (!ctx) {
            init();
        }
        if (!ctx) return;
        updateVolumes();
    }
    /*
     * ============================================================
     * ANDROID / IOS APP LIFECYCLE
     * ============================================================
     */
    function pauseApp() {
        if (appPaused) return;
        appPaused = true;
        console.log(
            "NEON DODGE: AUDIO PAUSED"
        );
        pause();
    }
    function resumeApp() {
        if (!appPaused) return;
        appPaused = false;
        console.log(
            "NEON DODGE: AUDIO RESUMED"
        );
        if (!ctx) return;
        try {
            if (
                ctx.state === "suspended"
            ) {
                ctx.resume();
            }
        } catch (error) {
            console.warn(
                "Audio lifecycle resume error:",
                error
            );
        }
        if (musicEnabled) {
            startMusic();
        }
    }
    /*
     * Когда WebView уходит в фон.
     * Это работает при сворачивании приложения,
     * переходе в другое приложение и блокировке экрана.
     */
    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden) {
                pauseApp();
            } else {
                resumeApp();
            }
        }
    );
    /*
     * Дополнительная защита для Android/iOS.
     */
    window.addEventListener(
        "pagehide",
        () => {
            pauseApp();
        }
    );
    /*
     * Возвращение из background.
     */
    window.addEventListener(
        "pageshow",
        () => {
            if (
                !document.hidden
            ) {
                resumeApp();
            }
        }
    );
    /*
     * Когда страница закрывается.
     */
    window.addEventListener(
        "beforeunload",
        () => {
            stopMusic();
            try {
                if (
                    ctx &&
                    ctx.state === "running"
                ) {
                    ctx.suspend();
                }
            } catch (error) {
                console.warn(
                    "Audio shutdown error:",
                    error
                );
            }
        }
    );
    return {
        init,
        resume,
        pause,
        pauseApp,
        resumeApp,
        click,
        crystal,
        buff,
        shoot,
        explosion,
        damage,
        death,
        shield,
        emp,
        laser,
        meteor,
        hunter,
        warning,
        eventStart,
        revive,
        reward,
        purchase,
        setMusic,
        setSound,
        startMusic,
        stopMusic
    };
})();
window.AudioFX = AudioFX;