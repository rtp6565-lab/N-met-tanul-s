(function () {
  const $ = (sel) => document.querySelector(sel);

  const phrases = typeof PHRASES !== "undefined" ? PHRASES : [];
  let stopFlag = false;
  let voices = [];
  let wakeLock = null;
  let keepAliveAudio = null;
  let sessionActive = false;

  const el = {
    count: $("#phrase-count"),
    voiceHint: $("#voice-hint"),
    start: $("#btn-start"),
    round: $("#btn-round"),
    stop: $("#btn-stop"),
    untilStop: $("#until-stop"),
    shuffle: $("#shuffle"),
    pairDe: $("#pair-de"),
    pairEn: $("#pair-en"),
    wakeLock: $("#wake-lock"),
    bgAudio: $("#bg-audio"),
    repeats: $("#repeats"),
    hours: $("#hours"),
    minutes: $("#minutes"),
    pauseLang: $("#pause-lang"),
    pausePhrase: $("#pause-phrase"),
    btDelay: $("#bt-delay"),
    speed: $("#speed"),
    timeLeft: $("#time-left"),
    progress: $("#progress-bar"),
    detail: $("#status-detail"),
  };

  const rangeFormatters = {
    "pause-lang-val": (v) => `${v.toFixed(1)} mp`,
    "pause-phrase-val": (v) => `${v.toFixed(1)} mp`,
    "bt-delay-val": (v) => `${Math.round(v)} ms`,
    "speed-val": (v) => (v === 0 ? "Normál" : `${v > 0 ? "+" : ""}${v}%`),
  };

  function bindRanges() {
    document.querySelectorAll("[data-range-label]").forEach((input) => {
      const label = document.getElementById(input.dataset.rangeLabel);
      const fmt = rangeFormatters[input.dataset.rangeLabel] || ((v) => String(v));
      const update = () => {
        label.textContent = fmt(parseFloat(input.value));
      };
      input.addEventListener("input", update);
      update();
    });
  }

  function formatRemaining(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h) return `${h} óra ${m} perc ${s} mp`;
    if (m) return `${m} perc ${s} mp`;
    return `${s} mp`;
  }

  function setUiPlaying(on) {
    el.start.disabled = on;
    el.round.disabled = on;
    el.stop.disabled = !on;
  }

  function setStatus(timeText, detailText, pct) {
    el.timeLeft.textContent = timeText;
    el.detail.textContent = detailText || "";
    el.progress.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }

  function shuffleArray(items) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const tick = () => {
        if (stopFlag) {
          resolve(false);
          return;
        }
        if (Date.now() - t0 >= ms) {
          resolve(true);
          return;
        }
        setTimeout(tick, 80);
      };
      tick();
    });
  }

  function loadVoices() {
    return new Promise((resolve) => {
      const pick = () => {
        voices = speechSynthesis.getVoices();
        if (voices.length) {
          resolve(voices);
          return;
        }
        setTimeout(() => resolve(speechSynthesis.getVoices()), 400);
      };
      if (speechSynthesis.getVoices().length) {
        pick();
      } else {
        speechSynthesis.onvoiceschanged = pick;
        setTimeout(pick, 600);
      }
    });
  }

  function getPairMode() {
    return el.pairEn?.checked ? "en" : "de";
  }

  function secondPhrase(phrase) {
    return getPairMode() === "en" ? phrase.angol || phrase.nemet : phrase.nemet;
  }

  function secondLangTag() {
    return getPairMode() === "en" ? "EN" : "DE";
  }

  function pickVoice(langCode) {
    const want = langCode === "hu" ? "hu" : langCode === "en" ? "en" : "de";
    const list = voices.filter((v) => v.lang.toLowerCase().startsWith(want));
    return list[0] || voices.find((v) => v.lang.toLowerCase().includes(want)) || null;
  }

  function speechRate() {
    const pct = parseInt(el.speed.value, 10) || 0;
    return Math.max(0.5, Math.min(1.8, 1 + pct / 100));
  }

  function speak(text, lang) {
    return new Promise((resolve, reject) => {
      if (!("speechSynthesis" in window)) {
        reject(new Error("A böngésző nem támogatja a felolvasást. Használj Edge-et vagy Chrome-ot."));
        return;
      }

      const delayMs = parseInt(el.btDelay.value, 10) || 0;

      const run = () => {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang =
          lang === "hu" ? "hu-HU" : lang === "en" ? "en-GB" : "de-DE";
        u.rate = speechRate();
        const voice = pickVoice(lang);
        if (voice) u.voice = voice;

        u.onend = () => resolve(true);
        u.onerror = () => reject(new Error("Felolvasás megszakadt"));

        speechSynthesis.speak(u);
      };

      if (delayMs > 0) {
        sleep(delayMs).then((ok) => {
          if (!ok || stopFlag) resolve(false);
          else run();
        });
      } else {
        run();
      }
    });
  }

  async function acquireWakeLock() {
    if (!el.wakeLock?.checked || !("wakeLock" in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch (_) {
      /* jogosultság / nem támogatott */
    }
  }

  async function releaseWakeLock() {
    if (!wakeLock) return;
    try {
      await wakeLock.release();
    } catch (_) {
      /* */
    }
    wakeLock = null;
  }

  function startBackgroundAudio() {
    if (!el.bgAudio?.checked) return;
    try {
      if (!keepAliveAudio) {
        keepAliveAudio = new Audio();
        // Apró, néma hurok – Androidon „médialejátszás”, így kevésbé alszik el a lap
        keepAliveAudio.src =
          "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
        keepAliveAudio.loop = true;
        keepAliveAudio.volume = 0.02;
      }
      keepAliveAudio.play().catch(() => {});
    } catch (_) {
      /* */
    }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Német kifejezések",
        artist: "Felolvasás",
      });
      navigator.mediaSession.playbackState = "playing";
    }
  }

  function stopBackgroundAudio() {
    if (keepAliveAudio) {
      keepAliveAudio.pause();
      keepAliveAudio.currentTime = 0;
    }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
    }
  }

  async function startPlaybackSession() {
    sessionActive = true;
    await acquireWakeLock();
    startBackgroundAudio();
  }

  async function endPlaybackSession() {
    sessionActive = false;
    stopBackgroundAudio();
    await releaseWakeLock();
  }

  function getDurationSec() {
    const h = Math.max(0, Math.min(24, parseInt(el.hours.value, 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(el.minutes.value, 10) || 0));
    return h * 3600 + m * 60;
  }

  async function runLoop(mode) {
    const oneRound = mode === "one_round";
    const untilStop = mode === "until_stop";
    let durationSec = 0;

    if (mode === "timed") {
      durationSec = getDurationSec();
      if (durationSec <= 0) {
        alert("Állíts be legalább 1 percet vagy 1 órát, vagy pipáld be: Amíg megállítom.");
        return;
      }
    }

    const repeats = Math.max(1, Math.min(20, parseInt(el.repeats.value, 10) || 1));
    const pauseLang = Math.max(0, parseFloat(el.pauseLang.value) || 0) * 1000;
    const pausePhrase = Math.max(0, parseFloat(el.pausePhrase.value) || 0) * 1000;
    const endTime =
      oneRound || untilStop ? Infinity : Date.now() + durationSec * 1000;

    stopFlag = false;
    setUiPlaying(true);
    speechSynthesis.cancel();
    await startPlaybackSession();

    try {
      let index = 0;
      let roundNum = 1;
      const doShuffle = el.shuffle.checked;
      let queue = doShuffle ? shuffleArray(phrases) : phrases.slice();

      while (Date.now() < endTime && !stopFlag) {
        const phrase = queue[index];
        const hu = phrase.magyar;
        const second = secondPhrase(phrase);
        const pairTag = secondLangTag();
        const pairLang = getPairMode();

        for (let rep = 1; rep <= repeats; rep++) {
          if (stopFlag || Date.now() >= endTime) break;

          let timeText = "Amíg megállítod";
          let pct = 0;
          if (oneRound) {
            pct = (100 * index) / queue.length;
            timeText = `Egy kör: ${index + 1} / ${queue.length}`;
          } else if (endTime !== Infinity) {
            const left = (endTime - Date.now()) / 1000;
            timeText = `Hátralévő: ${formatRemaining(left)}`;
            pct = 100 * (1 - left / durationSec);
          } else {
            timeText = "Nincs időkorlát";
          }

          setStatus(
            timeText,
            `[${roundNum}. kör] #${index + 1}  ${rep}/${repeats}\nHU: ${hu}\n${pairTag}: ${second}`,
            pct
          );

          await speak(hu, "hu");
          if (stopFlag || Date.now() >= endTime) break;
          if (!(await sleep(pauseLang))) break;

          await speak(second, pairLang);
          if (stopFlag || Date.now() >= endTime) break;
          if (rep < repeats && !(await sleep(pauseLang))) break;
        }

        if (stopFlag || Date.now() >= endTime) break;
        if (!(await sleep(pausePhrase))) break;

        index += 1;
        if (index >= queue.length) {
          index = 0;
          roundNum += 1;
          if (oneRound) break;
          if (doShuffle) queue = shuffleArray(phrases);
        }
      }

      speechSynthesis.cancel();
      if (stopFlag) setStatus("Leállítva", "", 0);
      else if (oneRound) setStatus("Kész – egy kör lement", "", 100);
      else if (untilStop) setStatus("Leállítva", "", 0);
      else setStatus("Idő lejárt – lejátszás vége", "", 100);
    } catch (err) {
      setStatus("Hiba", String(err.message || err), 0);
      alert("Hiba: " + (err.message || err));
    } finally {
      speechSynthesis.cancel();
      await endPlaybackSession();
      setUiPlaying(false);
    }
  }

  function showVoiceInfo() {
    const hu = pickVoice("hu");
    const de = pickVoice("de");
    const en = pickVoice("en");
    const parts = [];
    if (hu) parts.push(`HU: ${hu.name}`);
    else parts.push("HU: (telepíts magyar hangot)");
    if (de) parts.push(`DE: ${de.name}`);
    else parts.push("DE: (telepíts német hangot)");
    if (en) parts.push(`EN: ${en.name}`);
    else parts.push("EN: (telepíts angol hangot)");
    el.voiceHint.textContent = "Hangok: " + parts.join(" · ");
  }

  function registerOfflineCache() {
    if (!("serviceWorker" in navigator)) return;
    const swUrl = new URL("sw.js", window.location.href).href;
    navigator.serviceWorker.register(swUrl).catch(() => {});
  }

  async function init() {
    if (!phrases.length) {
      el.count.textContent = "Hiba: phrases.js hiányzik";
      alert("Hiányzik a phrases.js – töltsd fel GitHubra, vagy futtasd az indit_html.bat-ot.");
      return;
    }
    el.count.textContent = `${phrases.length} kifejezés`;
    await loadVoices();
    showVoiceInfo();
    registerOfflineCache();
  }

  el.start.addEventListener("click", () =>
    runLoop(el.untilStop.checked ? "until_stop" : "timed")
  );
  el.round.addEventListener("click", () => runLoop("one_round"));
  el.stop.addEventListener("click", () => {
    stopFlag = true;
    speechSynthesis.cancel();
    setStatus("Leállítás…", "", 0);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && sessionActive && el.wakeLock?.checked) {
      acquireWakeLock();
    }
  });

  bindRanges();
  init();
})();
