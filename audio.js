/* =========================================
   NEON DODGE — AUDIO SYSTEM
   Web Audio API
========================================= */

const AudioFX = (() => {

    let ctx = null;
    let master = null;
    let musicGain = null;
    let soundGain = null;

    let musicTimer = null;
    let musicStep = 0;

    function init() {

        if (ctx) {
            if (ctx.state === "suspended") {
                ctx.resume();
            }
            return;
        }

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContext) {
            console.warn("Web Audio API is not supported");
            return;
        }

        ctx = new AudioContext();

        master = ctx.createGain();
        master.gain.value = 0.75;
        master.connect(ctx.destination);

        musicGain = ctx.createGain();
        musicGain.gain.value =
            typeof saveData !== "undefined" && saveData.music
                ? 0.12
                : 0.001;

        musicGain.connect(master);

        soundGain = ctx.createGain();
        soundGain.gain.value =
            typeof saveData !== "undefined" && saveData.sound
                ? 0.55
                : 0.001;

        soundGain.connect(master);

        if (
            typeof saveData !== "undefined" &&
            saveData.music
        ) {
            startMusic();
        }
    }

    function resume() {

        if (!ctx) return;

        if (ctx.state === "suspended") {
            ctx.resume();
        }
    }

    function tone(
        frequency,
        duration = 0.08,
        type = "sine",
        volume = 0.15,
        endFrequency = null
    ) {

        if (!ctx || !soundGain) return;

        if (
            typeof saveData !== "undefined" &&
            !saveData.sound
        ) {
            return;
        }

        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;

        osc.frequency.setValueAtTime(
            frequency,
            now
        );

        if (endFrequency !== null) {

            osc.frequency.exponentialRampToValueAtTime(
                Math.max(20, endFrequency),
                now + duration
            );
        }

        gain.gain.setValueAtTime(
            0.001,
            now
        );

        gain.gain.exponentialRampToValueAtTime(
            volume,
            now + 0.008
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + duration
        );

        osc.connect(gain);
        gain.connect(soundGain);

        osc.start(now);

        osc.stop(
            now +
            duration +
            0.02
        );
    }

    function noise(
        duration = 0.1,
        volume = 0.15
    ) {

        if (!ctx || !soundGain) return;

        if (
            typeof saveData !== "undefined" &&
            !saveData.sound
        ) {
            return;
        }

        const buffer =
            ctx.createBuffer(
                1,
                Math.floor(
                    ctx.sampleRate * duration
                ),
                ctx.sampleRate
            );

        const data =
            buffer.getChannelData(0);

        for (
            let i = 0;
            i < data.length;
            i++
        ) {
            data[i] =
                Math.random() * 2 - 1;
        }

        const source =
            ctx.createBufferSource();

        const filter =
            ctx.createBiquadFilter();

        const gain =
            ctx.createGain();

        source.buffer = buffer;

        filter.type = "highpass";
        filter.frequency.value = 700;

        const now = ctx.currentTime;

        gain.gain.setValueAtTime(
            volume,
            now
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            now + duration
        );

        source.connect(filter);
        filter.connect(gain);
        gain.connect(soundGain);

        source.start(now);
    }

    /* =========================================
       UI
    ========================================= */

    function click() {
        tone(
            520,
            0.045,
            "sine",
            0.08,
            700
        );
    }

    /* =========================================
       GAME
    ========================================= */

    function crystal() {

        tone(
            700,
            0.08,
            "sine",
            0.11,
            1000
        );

        setTimeout(() => {

            tone(
                1050,
                0.09,
                "sine",
                0.08,
                1350
            );

        }, 45);
    }

    function buff() {

        tone(
            420,
            0.08,
            "sine",
            0.09,
            650
        );

        setTimeout(() => {

            tone(
                650,
                0.1,
                "sine",
                0.1,
                1050
            );

        }, 65);

        setTimeout(() => {

            tone(
                1050,
                0.13,
                "sine",
                0.09,
                1450
            );

        }, 130);
    }

    function shoot() {

        tone(
            620,
            0.055,
            "triangle",
            0.045,
            900
        );
    }

    function explosion() {

        noise(
            0.12,
            0.14
        );

        tone(
            120,
            0.14,
            "sawtooth",
            0.08,
            45
        );
    }

    function damage() {

        tone(
            180,
            0.16,
            "sawtooth",
            0.12,
            75
        );

        noise(
            0.08,
            0.08
        );
    }

    function death() {

        tone(
            260,
            0.2,
            "sawtooth",
            0.13,
            80
        );

        setTimeout(() => {

            tone(
                120,
                0.35,
                "triangle",
                0.1,
                35
            );

        }, 100);

        setTimeout(() => {

            noise(
                0.22,
                0.1
            );

        }, 180);
    }

    function shield() {

        tone(
            280,
            0.12,
            "sine",
            0.08,
            520
        );

        setTimeout(() => {

            tone(
                520,
                0.18,
                "sine",
                0.1,
                900
            );

        }, 70);
    }

    function emp() {

        tone(
            100,
            0.22,
            "sine",
            0.12,
            35
        );

        noise(
            0.3,
            0.12
        );
    }

    function laser() {

        tone(
            850,
            0.2,
            "sawtooth",
            0.06,
            1400
        );
    }

    function meteor() {

        tone(
            180,
            0.3,
            "sawtooth",
            0.08,
            45
        );

        noise(
            0.18,
            0.08
        );
    }

    function hunter() {

        tone(
            90,
            0.4,
            "triangle",
            0.09,
            170
        );

        setTimeout(() => {

            tone(
                170,
                0.35,
                "triangle",
                0.08,
                60
            );

        }, 100);
    }

    function warning() {

        tone(
            300,
            0.09,
            "square",
            0.08
        );

        setTimeout(() => {

            tone(
                220,
                0.09,
                "square",
                0.08
            );

        }, 120);
    }

    function eventStart() {

        tone(
            420,
            0.12,
            "triangle",
            0.08,
            700
        );

        setTimeout(() => {

            tone(
                700,
                0.15,
                "triangle",
                0.09,
                1100
            );

        }, 90);
    }

    function revive() {

        tone(
            300,
            0.12,
            "sine",
            0.08,
            500
        );

        setTimeout(() => {

            tone(
                500,
                0.14,
                "sine",
                0.09,
                800
            );

        }, 90);

        setTimeout(() => {

            tone(
                800,
                0.2,
                "sine",
                0.1,
                1300
            );

        }, 180);
    }

    function reward() {

        tone(
            600,
            0.1,
            "sine",
            0.08,
            850
        );

        setTimeout(() => {

            tone(
                850,
                0.1,
                "sine",
                0.08,
                1150
            );

        }, 80);

        setTimeout(() => {

            tone(
                1150,
                0.18,
                "sine",
                0.1,
                1500
            );

        }, 160);
    }

    function purchase() {

        tone(
            500,
            0.08,
            "sine",
            0.08,
            750
        );

        setTimeout(() => {

            tone(
                750,
                0.14,
                "sine",
                0.09,
                1100
            );

        }, 70);
    }

    /* =========================================
       CALM AMBIENT MUSIC
    ========================================= */

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

    function musicNote(
        freq,
        duration = 1.8
    ) {

        if (!ctx || !musicGain) return;

        if (
            typeof saveData !== "undefined" &&
            !saveData.music
        ) {
            return;
        }

        const osc =
            ctx.createOscillator();

        const gain =
            ctx.createGain();

        const filter =
            ctx.createBiquadFilter();

        osc.type = "sine";
        osc.frequency.value = freq;

        filter.type = "lowpass";
        filter.frequency.value = 900;

        const now = ctx.currentTime;

        gain.gain.setValueAtTime(
            0.001,
            now
        );

        gain.gain.linearRampToValueAtTime(
            0.035,
            now + 0.25
        );

        gain.gain.linearRampToValueAtTime(
            0.001,
            now + duration
        );

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(musicGain);

        osc.start(now);

        osc.stop(
            now +
            duration +
            0.05
        );
    }

    function musicLoop() {

        if (!ctx) return;

        if (
            typeof saveData !== "undefined" &&
            saveData.music &&
            !musicTimer
        ) {

            musicTimer =
                setInterval(() => {

                    if (
                        typeof saveData !== "undefined" &&
                        !saveData.music
                    ) {
                        return;
                    }

                    const note =
                        melody[
                            musicStep %
                            melody.length
                        ];

                    musicNote(
                        note,
                        2.2
                    );

                    musicStep++;

                }, 1900);
        }
    }

    function startMusic() {

        if (!ctx) return;

        if (musicTimer) {
            clearInterval(musicTimer);
            musicTimer = null;
        }

        musicStep = 0;

        musicLoop();
    }

    function stopMusic() {

        if (musicTimer) {

            clearInterval(
                musicTimer
            );

            musicTimer = null;
        }
    }

    function setMusic(enabled) {

        if (!ctx || !musicGain) return;

        const now =
            ctx.currentTime;

        musicGain.gain.cancelScheduledValues(
            now
        );

        musicGain.gain.linearRampToValueAtTime(
            enabled ? 0.12 : 0.001,
            now + 0.3
        );

        if (enabled) {
            startMusic();
        } else {
            stopMusic();
        }
    }

    function setSound(enabled) {

        if (!ctx || !soundGain) return;

        const now =
            ctx.currentTime;

        soundGain.gain.cancelScheduledValues(
            now
        );

        soundGain.gain.linearRampToValueAtTime(
            enabled ? 0.55 : 0.001,
            now + 0.15
        );
    }

    return {
        init,
        resume,

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
        setSound
    };

})();