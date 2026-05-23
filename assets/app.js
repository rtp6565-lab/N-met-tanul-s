(function () {
  const $ = (sel) => document.querySelector(sel);

  let phrases = [];
  let stopFlag = false;
  let playing = false;

  const el = {
    count: $("#phrase-count"),
    start: $("#btn-start"),
    round: $("#btn-round"),
    stop: $("#btn-stop"),
    untilStop: $("#until-stop"),
    shuffle: $("#shuffle"),
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
    playing = on;
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

  function ttsUrl(lang, text) {
    const slow = parseInt(el.speed.value, 10) <= -15 ? "1" : "0";
    const q = new URLSearchParams({ action: "tts", lang, text, slow });
    return `api.php?${q.toString()}`;
  }

  function playAudio(url, delayMs) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.preload = "auto";

      const done = (ok) => {
        audio.pause();
        audio.src = "";
        resolve(ok);
      };

      audio.addEventListener("error", () => reject(new Error("Hang betöltése sikertelen")));

      audio.addEventListener(
        "canplaythrough",
        async () => {
          if (delayMs > 0) await sleep(delayMs);
          if (stopFlag) {
            done(false);
            return;
          }
          try {
            await audio.play();
          } catch (e) {
            reject(e);
            return;
          }
        },
        { once: true }
      );

      audio.addEventListener(
        "ended",
        () => done(true),
        { once: true }
      );

      audio.load();
    });
  }

  async function speak(text, lang) {
    const delayMs = parseInt(el.btDelay.value, 10) || 0;
    const url = ttsUrl(lang, text);
    return playAudio(url, delayMs);
  }

  function getDurationSec() {
    const h = Math.max(0, Math.min(24, parseInt(el.hours.value, 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(el.minutes.value, 10) || 0);
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
    let index = 0;
    let roundNum = 1;
    const doShuffle = el.shuffle.checked;
    let queue = doShuffle ? shuffleArray(phrases) : phrases.slice();

    stopFlag = false;
    setUiPlaying(true);

    try {
      while (Date.now() < endTime && !stopFlag) {
        const phrase = queue[index];
        const hu = phrase.magyar;
        const de = phrase.nemet;

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
            pct = 100 * (1 - left / (durationSec || 1));
          } else {
            timeText = "Nincs időkorlát";
          }

          setStatus(
            timeText,
            `[${roundNum}. kör] #${index + 1}  ${rep}/${repeats}\nHU: ${hu}\nDE: ${de}`,
            pct
          );

          await speak(hu, "hu");
          if (stopFlag || Date.now() >= endTime) break;
          if (!(await sleep(pauseLang))) break;

          await speak(de, "de");
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

      if (stopFlag) setStatus("Leállítva", "", 0);
      else if (oneRound) setStatus("Kész – egy kör lement", "", 100);
      else if (endTime === Infinity) setStatus("Leállítva", "", 0);
      else setStatus("Idő lejárt – lejátszás vége", "", 100);
    } catch (err) {
      setStatus("Hiba", String(err.message || err), 0);
      alert("Hiba: " + (err.message || err));
    } finally {
      setUiPlaying(false);
    }
  }

  async function loadPhrases() {
    const res = await fetch("api.php?action=phrases");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Betöltés sikertelen");
    phrases = data.phrases;
    el.count.textContent = `${phrases.length} kifejezés`;
  }

  el.start.addEventListener("click", () =>
    runLoop(el.untilStop.checked ? "until_stop" : "timed")
  );
  el.round.addEventListener("click", () => runLoop("one_round"));
  el.stop.addEventListener("click", () => {
    stopFlag = true;
    setStatus("Leállítás…", "", 0);
  });

  bindRanges();
  loadPhrases().catch((e) => {
    el.count.textContent = "Hiba";
    alert(e.message);
  });
})();
