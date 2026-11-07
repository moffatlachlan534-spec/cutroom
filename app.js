// Cutroom Web - edits a talking video entirely on the visitor's own device.
// 1 choose a video -> 2 it listens (Whisper, in the browser) -> 3 pick a style ->
// 4 check the words (drop lines, fix captions) -> 5 it records the edit -> 6 download.
import { STYLES, PACING, readable } from "./styles.js";
import { USERS } from "./config.js";

const $ = (s) => document.querySelector(s);
const screens = [...document.querySelectorAll("[data-screen]")];
const S = { file: null, url: null, words: [], lines: [], style: STYLES[0], accent: null, vertical: true,
            model: "onnx-community/whisper-base.en_timestamped", result: null };
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } },
                set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

function show(name) {
  screens.forEach((s) => (s.hidden = s.dataset.screen !== name));
  window.scrollTo(0, 0);
}
function status(text, frac) {
  document.querySelectorAll("[data-status]").forEach((e) => (e.textContent = text));
  if (frac != null) document.querySelectorAll("[data-bar]").forEach((e) => (e.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + "%"));
}

// ---------- passcode (keeps the link for you and friends; footage never leaves the device anyway)
async function sha(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t.trim().toLowerCase()));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// Each person has their own code (USERS in config.js). A removed person is locked out on their next visit.
function welcome(u) {
  const hi = $("#hello");
  if (hi) { hi.textContent = u ? `Hi ${u.name}` : ""; hi.hidden = !u; }
  show("home");
}
async function gate() {
  if (!USERS.length) return welcome(null);
  const saved = USERS.find((u) => u.hash === store.get("cutroom-pass"));
  if (saved) return welcome(saved);
  show("gate");
  $("#gate-form").onsubmit = async (e) => {
    e.preventDefault();
    const h = await sha($("#gate-code").value);
    const u = USERS.find((x) => x.hash === h);
    if (u) { store.set("cutroom-pass", h); welcome(u); }
    else $("#gate-msg").textContent = "That code isn't right. Ask Lachlan for yours.";
  };
}

// ---------- 1 + 2: choose a video, pull out the sound, transcribe in a worker
$("#pick").onclick = () => $("#file").click();
$("#accurate").onchange = (e) => {
  S.model = e.target.checked ? "onnx-community/whisper-base.en_timestamped" : "onnx-community/whisper-tiny.en_timestamped";
  store.set("cutroom-model", S.model);
};
if (store.get("cutroom-model")) {
  S.model = store.get("cutroom-model");
  $("#accurate").checked = S.model.includes("base");
}
$("#file").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  S.file = f;
  if (S.url) URL.revokeObjectURL(S.url);
  S.url = URL.createObjectURL(f);
  show("work");
  status("Getting the sound out of your video...", 0.02);
  try {
    const audio = await audio16k(f);
    if (audio.length / 16000 > 300) status("This is a long video - it may take a while...", 0.05);
    S.words = await transcribe(audio);
    if (S.words.length < 3) throw new Error("No speech found. Cutroom Web is for talking videos.");
    S.lines = toLines(S.words);
    buildStyles();
    show("style");
  } catch (err) {
    status("Something went wrong: " + err.message, 0);
    $("#work-back").hidden = false;
  }
};
$("#work-back").onclick = () => { $("#work-back").hidden = true; show("home"); };

async function audio16k(file) {
  const buf = await file.arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const dec = await ctx.decodeAudioData(buf);
  ctx.close();
  const n = Math.ceil(dec.duration * 16000);
  const off = new OfflineAudioContext(1, n, 16000);
  const src = off.createBufferSource();
  src.buffer = dec;
  src.connect(off.destination);
  src.start();
  const out = await off.startRendering();
  return out.getChannelData(0);
}

function transcribe(audio) {
  return new Promise((resolve, reject) => {
    const w = new Worker("./worker.js", { type: "module" });
    const files = {};
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress" && m.p.status === "progress" && m.p.total) {
        files[m.p.file] = [m.p.loaded, m.p.total];
        const [l, t] = Object.values(files).reduce((a, [x, y]) => [a[0] + x, a[1] + y], [0, 0]);
        status(`Downloading the listening model (first time only) ${Math.round(t / 1e6)} MB...`, 0.05 + 0.6 * (l / t));
      } else if (m.type === "status") status(m.text, 0.7);
      else if (m.type === "done") {
        w.terminate();
        const words = m.chunks.map((c) => ({ text: c.text.trim(), start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 0.3 }))
          .filter((x) => x.text && x.start != null);
        for (let i = 0; i < words.length; i++) {        // whisper sometimes gives end < start
          if (words[i].end <= words[i].start) words[i].end = words[i].start + 0.25;
        }
        resolve(words);
      } else if (m.type === "error") { w.terminate(); reject(new Error(m.text)); }
    };
    w.onerror = (e) => reject(new Error(e.message || "the listening model failed to load"));
    w.postMessage({ audio, model: S.model }, [audio.buffer]);
  });
}

// sentences: break at . ? ! or a pause over 0.8 s, max ~14 words
function toLines(words) {
  const lines = [];
  let cur = [];
  words.forEach((w, i) => {
    cur.push(i);
    const gap = i + 1 < words.length ? words[i + 1].start - w.end : 9;
    if (/[.?!]$/.test(w.text) || gap > 0.8 || cur.length >= 14) {
      lines.push({ idx: cur, keep: true });
      cur = [];
    }
  });
  if (cur.length) lines.push({ idx: cur, keep: true });
  return lines;
}

// ---------- 3: style
function buildStyles() {
  const g = $("#styles");
  g.innerHTML = "";
  STYLES.forEach((s) => {
    const b = document.createElement("button");
    b.className = "style";
    b.setAttribute("aria-pressed", s === S.style);
    b.innerHTML = `<img src="posters/${s.id}.jpg" alt="" loading="lazy"><span><b>${s.name}</b><small>${s.blurb}</small></span>`;
    b.onclick = () => {
      S.style = s;
      g.querySelectorAll(".style").forEach((x) => x.setAttribute("aria-pressed", x === b));
      if (!S.accentTouched) $("#accent").value = s.accent;
      if (!S.bgTouched) $("#bgc").value = s.bg;
    };
    g.appendChild(b);
  });
  $("#accent").value = S.style.accent;
  $("#bgc").value = S.style.bg;
}
$("#accent").oninput = () => { S.accentTouched = true; };
$("#bgc").oninput = () => { S.bgTouched = true; };
$("#style-next").onclick = () => { S.accent = $("#accent").value; S.bg = $("#bgc").value; S.vertical = $("#vertical").checked; buildLines(); show("words"); };

// ---------- 4: words
function buildLines() {
  const ul = $("#lines");
  ul.innerHTML = "";
  S.lines.forEach((ln) => {
    const li = document.createElement("li");
    const text = ln.idx.map((i) => S.words[i].text).join(" ");
    li.innerHTML = `<label class="keep"><input type="checkbox" ${ln.keep ? "checked" : ""} aria-label="Keep this line"></label>
      <span class="t" contenteditable="true" spellcheck="false"></span>`;
    li.querySelector(".t").textContent = text;
    li.classList.toggle("cut", !ln.keep);
    li.querySelector("input").onchange = (e) => { ln.keep = e.target.checked; li.classList.toggle("cut", !ln.keep); };
    li.querySelector(".t").onblur = (e) => fixLine(ln, e.target.textContent);
    ul.appendChild(li);
  });
}
// a caption fix: same number of words -> swap the text; different -> spread the times evenly
function fixLine(ln, text) {
  const nw = text.trim().split(/\s+/).filter(Boolean);
  if (!nw.length) return;
  const old = ln.idx.map((i) => S.words[i]);
  if (nw.length === old.length) { old.forEach((w, k) => (w.text = nw[k])); return; }
  const t0 = old[0].start, t1 = old[old.length - 1].end, d = (t1 - t0) / nw.length;
  ln.fixed = nw.map((t, k) => ({ text: t, start: t0 + k * d, end: t0 + (k + 1) * d }));
}

// ---------- the edit plan
function plan() {
  const P = PACING[S.style.pacing];
  const segs = [], caps = [];
  let acc = 0, k = 0;
  const kept = S.lines.filter((l) => l.keep);
  kept.forEach((ln) => {
    const z = S.style.zoom[k % S.style.zoom.length];
    k++;
    const ws = ln.idx.map((i) => ({ ...S.words[i], i }));
    const runs = [[ws[0]]];
    for (let j = 1; j < ws.length; j++) {
      if (ws[j].start - ws[j - 1].end > P.join) runs.push([]);
      runs[runs.length - 1].push(ws[j]);
    }
    const capWords = ln.fixed || ws;
    runs.forEach((r) => {
      const first = r[0], last = r[r.length - 1];
      const nextStart = last.i + 1 < S.words.length ? S.words[last.i + 1].start - 0.02 : 1e9;
      const prevEnd = segs.length ? segs[segs.length - 1].out : 0;
      const inT = Math.max(prevEnd, first.i > 0 ? Math.max(S.words[first.i - 1].end, first.start - P.pre) : first.start - P.pre, 0);
      const outT = Math.min(last.end + P.post, nextStart);
      if (outT - inT < 0.25) return;
      segs.push({ in: inT, out: outT, z, push: S.style.push, at: acc });
      capWords.forEach((w) => {
        const mid = (w.start + w.end) / 2;
        if (mid >= inT && mid < outT) caps.push({ text: w.text, start: acc + (w.start - inT), end: acc + (Math.min(w.end, outT) - inT), line: k });
      });
      acc += outT - inT;
    });
  });
  return { segs, caps, total: acc };
}

// ---------- auto b-roll graphics: what you say becomes an animated card for ~1.6 s
// numbers -> big count-up with the words after it as the label; highlighted words -> word card.
// Never in the first 1.5 s (the hook stays on your face), at least 6 s apart.
const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, hundred: 100, thousand: 1000 };
const FILLER = new Set("a an the of to and or in on at for my your our is are it that this so".split(" "));
function graphics(caps, keys, total) {
  const out = [];
  let last = -99;
  caps.forEach((w, n) => {
    if (w.start < 1.5 || w.start - last < 6 || w.start + 1.6 > total) return;
    const t = norm(w.text);
    const num = /^\d+(\.\d+)?$/.test(t.replace(/,/g, "")) ? parseFloat(t.replace(/,/g, "")) : NUMW[t];
    if (num != null && !(num === 1 && NUMW[t])) {          // "one" on its own is rarely a stat
      const label = caps.slice(n + 1, n + 4).map((x) => x.text.replace(/[.,!?]+$/, ""))
        .filter((x, k) => k < 2 || !FILLER.has(norm(x))).slice(0, 2).join(" ");
      const pct = /%|percent/.test(caps.slice(n, n + 2).map((x) => x.text).join(" "));
      out.push({ kind: "stat", value: num, suffix: pct ? "%" : "", label, start: w.start, end: w.start + 1.6 });
      last = w.start;
    } else if (keys.has(t) && t.length > 1) {
      out.push({ kind: "word", text: w.text.replace(/[.,!?]+$/, ""), start: w.start, end: w.start + 1.5 });
      last = w.start;
    }
  });
  return out;
}

function drawGraphic(g, W, H, t, gfx, accent, bgc, cap) {
  const x = gfx.find((q) => q.start <= t && t < q.end);
  if (!x) return false;
  const p = t - x.start, d = x.end - x.start;
  const fade = Math.min(1, p / 0.18, (d - p) / 0.18);
  g.save();
  g.globalAlpha = fade;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, shade(bgc, -0.25));
  bg.addColorStop(1, shade(bgc, 0.12));
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // slow moving accent glow so the card isn't static
  const gx = W * (0.3 + 0.4 * (p / d)), gy = H * 0.38;
  const glow = g.createRadialGradient(gx, gy, 0, gx, gy, W * 0.8);
  glow.addColorStop(0, accent + "55");
  glow.addColorStop(1, accent + "00");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  const ease = 1 - Math.pow(1 - Math.min(1, p / 0.5), 3);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = onColor(bgc);
  const cy = H * 0.38;
  if (x.kind === "stat") {
    const v = x.value >= 10 ? Math.round(x.value * ease) : (x.value * ease).toFixed(x.value % 1 ? 1 : 0);
    let fs = Math.round(H * 0.16);
    g.font = `800 ${fs}px Inter, system-ui, sans-serif`;
    const txt = `${v}${x.suffix}`;
    const w = g.measureText(`${x.value}${x.suffix}`).width;
    if (w > W * 0.8) { fs = Math.floor(fs * W * 0.8 / w); g.font = `800 ${fs}px Inter, system-ui, sans-serif`; }
    g.fillText(txt, W / 2, cy);
    g.fillStyle = accent;
    g.fillRect(W / 2 - W * 0.12 * ease, cy + fs * 0.62, W * 0.24 * ease, Math.max(4, H * 0.006));
    if (x.label) {
      g.fillStyle = onColor(bgc);
      g.globalAlpha = fade * 0.85;
      g.font = `700 ${Math.round(H * 0.034)}px Inter, system-ui, sans-serif`;
      g.fillText(x.label.toUpperCase(), W / 2, cy + fs * 0.62 + H * 0.05 - (1 - ease) * H * 0.02);
    }
  } else {
    let fs = Math.round(H * 0.09);
    g.font = `${cap.weight} ${fs}px "${cap.font}", system-ui, sans-serif`;
    const w = g.measureText(x.text.toUpperCase()).width;
    if (w > W * 0.84) { fs = Math.floor(fs * W * 0.84 / w); g.font = `${cap.weight} ${fs}px "${cap.font}", system-ui, sans-serif`; }
    g.save();
    g.translate(W / 2, cy);
    g.scale(0.85 + 0.15 * ease, 0.85 + 0.15 * ease);
    const pad = fs * 0.3, tw = Math.min(W * 0.9, w + pad * 2);
    g.fillStyle = accent;
    g.fillRect(-tw / 2, -fs * 0.7, tw * ease, fs * 1.4);
    g.fillStyle = onColor(accent);
    g.fillText(x.text.toUpperCase(), 0, 0);
    g.restore();
  }
  g.restore();
  return true;
}

function chunks(caps, cap, keys) {
  const out = [];
  let cur = [];
  const isKey = (w) => keys.has(norm(w.text)) || /\d/.test(w.text);
  caps.forEach((w) => {
    const p = cur[cur.length - 1];
    if (p && (cur.length >= cap.words || p.line !== w.line || /[.,!?]$/.test(p.text) || w.start - p.end > 0.35
              || (cap.mode === "pop" && (isKey(w) || isKey(p))))) { out.push(cur); cur = []; }
    cur.push(w);
  });
  if (cur.length) out.push(cur);
  return out.map((c, n) => ({ words: c, key: c.some(isKey), start: c[0].start,
    end: Math.min(n + 1 < out.length ? out[n + 1][0].start : 1e9, c[c.length - 1].end + 0.25) }));
}
// lighter (+) or darker (-) version of a colour
function shade(hex, f) {
  return "#" + [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f)).toString(16).padStart(2, "0");
  }).join("");
}
// text colour that reads on a box of this colour
function onColor(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6 ? "#121310" : "#ffffff";
}
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9']/g, "");

// ---------- 5: record the edit (plays each piece, draws it with the style, records canvas + sound)
$("#make").onclick = () => make().catch((err) => { show("work"); status("Recording failed: " + err.message, 0); $("#work-back").hidden = false; });

async function make() {
  const { segs, caps, total } = plan();
  if (!segs.length) throw new Error("every line is switched off");
  const keys = new Set($("#keys").value.split(/[,\s]+/).map(norm).filter(Boolean));
  const st = S.style, cap = st.cap;
  const accent = S.accent || st.accent, bgc = S.bg || st.bg;
  const textAccent = readable(accent);
  const ch = chunks(caps, cap, keys);
  ch.keys = keys;
  const gfx = $("#gfx").checked ? graphics(caps, keys, total) : [];
  show("render");
  const v = $("#src");
  v.src = S.url;
  v.muted = false;
  await new Promise((r) => (v.readyState >= 1 ? r() : (v.onloadedmetadata = r)));
  const vw = v.videoWidth, vh = v.videoHeight;
  const portrait = vh >= vw;
  const [W, H] = S.vertical || portrait ? [720, 1280] : [1280, 720];
  const c = $("#canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const canFilter = (() => { g.filter = "blur(1px)"; const ok = g.filter === "blur(1px)"; g.filter = "none"; return ok; })();
  await document.fonts.load(`${cap.weight} 40px "${cap.font}"`);
  const grains = st.grade.grain ? [0, 1, 2].map(() => noise(160)) : [];

  // sound: element -> light compressor (evens out the voice) -> recorder
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = S.ac || (S.ac = new AC());
  if (!S.srcNode) S.srcNode = ac.createMediaElementSource(v);
  await ac.resume();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -24; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  const gain = ac.createGain(); gain.gain.value = 1.4;
  const dest = ac.createMediaStreamDestination();
  S.srcNode.disconnect();
  S.srcNode.connect(comp).connect(gain).connect(dest);

  const mime = ["video/mp4;codecs=avc1.42E01F,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]
    .find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error("this browser can't record video - try Chrome or Safari");
  const stream = new MediaStream([...c.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const parts = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const stopped = new Promise((r) => (rec.onstop = r));

  let seg = segs[0], running = true;
  const draw = () => {
    if (!running) return;
    const t = seg.at + Math.max(0, v.currentTime - seg.in);
    const prog = (v.currentTime - seg.in) / (seg.out - seg.in);
    const z = seg.z + (seg.push || 0) * Math.max(0, Math.min(1, prog));
    frame(g, v, W, H, vw, vh, z, st.grade, canFilter, grains);
    if (!drawGraphic(g, W, H, t, gfx, accent, bgc, cap))      // the card says it, so no caption over it
      captions(g, W, H, t, ch, cap, accent, textAccent, bgc);
    status(`Making your video... ${Math.min(99, Math.round((t / total) * 100))}%`, t / total);
    requestAnimationFrame(draw);
  };
  rec.start(250);
  rec.pause();
  requestAnimationFrame(draw);
  for (const s of segs) {
    seg = s;
    v.currentTime = s.in;
    await new Promise((r) => (v.onseeked = r));
    await v.play();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));   // fresh frame drawn
    rec.resume();
    await new Promise((r) => {
      const tick = () => (v.currentTime >= s.out || v.ended ? r() : requestAnimationFrame(tick));
      tick();
    });
    rec.pause();
    v.pause();
  }
  running = false;
  rec.stop();
  await stopped;
  const blob = new Blob(parts, { type: mime.split(";")[0] });
  if (S.result) URL.revokeObjectURL(S.result);
  S.result = URL.createObjectURL(blob);
  S.ext = mime.includes("mp4") ? "mp4" : "webm";
  $("#out").src = S.result;
  $("#download").href = S.result;
  $("#download").download = `cutroom-${st.id}.${S.ext}`;
  $("#done-note").textContent = `${total.toFixed(0)} s, ${(blob.size / 1e6).toFixed(1)} MB, ${S.ext.toUpperCase()}` +
    (S.ext === "webm" ? " - this browser records WebM; Safari or a newer Chrome gives MP4 for Instagram" : "");
  show("done");
}

function frame(g, v, W, H, vw, vh, z, gr, canFilter, grains) {
  const sc = Math.max(W / vw, H / vh) * z;
  const dw = vw * sc, dh = vh * sc;
  if (canFilter) {
    const warm = gr.warmth > 0 ? ` sepia(${(gr.warmth * 0.35).toFixed(3)})` : "";
    g.filter = `contrast(${gr.contrast || 1}) saturate(${gr.saturate ?? 1}) brightness(${gr.brightness || 1})${warm}`;
  }
  g.drawImage(v, (W - dw) / 2, (H - dh) * 0.4, dw, dh);
  g.filter = "none";
  if (gr.matte) {                                    // lifted 'film' blacks
    g.globalCompositeOperation = "lighten";
    const m = Math.round(gr.matte * 255);
    g.fillStyle = `rgb(${m},${m},${m})`;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "source-over";
  }
  if (gr.vignette) {
    const rg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
    rg.addColorStop(0, "rgba(0,0,0,0)");
    rg.addColorStop(1, `rgba(0,0,0,${0.6 * gr.vignette})`);
    g.fillStyle = rg;
    g.fillRect(0, 0, W, H);
  }
  if (grains.length) {
    g.globalAlpha = gr.grain * 2;
    g.globalCompositeOperation = "overlay";
    g.fillStyle = g.createPattern(grains[(Math.random() * grains.length) | 0], "repeat");
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
}

function noise(n) {
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const x = c.getContext("2d"), d = x.createImageData(n, n);
  for (let i = 0; i < d.data.length; i += 4) {
    const r = (Math.random() * 255) | 0;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = r;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  return c;
}

function captions(g, W, H, t, ch, cap, accent, textAccent, bgc) {
  const c = ch.find((x) => x.start <= t && t < x.end);
  if (!c) return;
  let i = c.words.length - 1;
  while (i > 0 && c.words[i].start > t) i--;
  const shown = cap.mode === "karaoke" || cap.mode === "plain" ? c.words : c.words.slice(0, i + 1);
  let fs = Math.round(H * cap.size);
  const txt = (w) => { const x = w.text.replace(/["“”]/g, ""); return cap.upper ? x.toUpperCase().replace(/[.,!?]+$/, "") : x; };
  const keyWord = (w) => ch.keys && ch.keys.has(norm(w.text));
  const font = () => `${cap.weight} ${fs}px "${cap.font}", system-ui, sans-serif`;
  g.font = font();
  const space = g.measureText(" ").width;
  let widths = shown.map((w) => g.measureText(txt(w)).width);
  let total = widths.reduce((a, b) => a + b, 0) + space * (shown.length - 1);
  if (total > W * 0.86) {                            // keep inside the frame
    fs = Math.floor(fs * (W * 0.86) / total);
    g.font = font();
    widths = shown.map((w) => g.measureText(txt(w)).width);
    total = widths.reduce((a, b) => a + b, 0) + g.measureText(" ").width * (shown.length - 1);
  }
  const sp = g.measureText(" ").width;
  const cy = Math.round(H * cap.pos);
  let x = (W - total) / 2;
  const boxed = cap.mode === "box" || (cap.mode === "pop" && c.key);
  g.save();
  if (cap.mode === "plain") g.globalAlpha = Math.min(1, (t - c.start) / 0.12, (c.end - t) / 0.12);
  if (boxed) {
    const pad = fs * 0.24;
    g.fillStyle = cap.mode === "box" ? bgc : accent;
    g.beginPath();
    (g.roundRect ? g.roundRect.bind(g) : g.rect.bind(g))(x - pad, cy - fs * 0.62 - pad * 0.5, total + pad * 2, fs * 1.24 + pad, fs * 0.12);
    g.fill();
  }
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = boxed ? 0 : Math.max(2, fs * cap.outline * 2);
  g.strokeStyle = "rgba(14,14,12,0.95)";
  shown.forEach((w, k) => {
    const wx = x + widths[k] / 2;
    g.save();
    g.translate(wx, cy);
    const dt = t - w.start;
    if (k === i && ["pop", "box", "single"].includes(cap.mode) && dt < 0.15) {
      const s = dt < 0.09 ? 0.72 + 0.32 * (dt / 0.09) : 1.04 - 0.04 * ((dt - 0.09) / 0.06);
      g.scale(s, s);
    }
    g.textAlign = "center";
    let fill = "#fff";
    if (cap.mode === "karaoke" && k === i) fill = textAccent;
    if (cap.mode === "single" && c.key) fill = textAccent;
    if (boxed) fill = onColor(cap.mode === "box" ? bgc : accent);
    if (cap.mode === "box" && (k === i || keyWord(w))) fill = onColor(bgc) === "#ffffff" ? textAccent : shade(accent, -0.45);
    if (g.lineWidth) g.strokeText(txt(w), 0, 0);
    g.fillStyle = fill;
    g.fillText(txt(w), 0, 0);
    g.restore();
    x += widths[k] + sp;
  });
  g.restore();
}

// ---------- 6: done
$("#again").onclick = () => show("style");
$("#new").onclick = () => { $("#file").value = ""; show("home"); };
$("#share").onclick = async () => {
  try {
    const blob = await (await fetch(S.result)).blob();
    const file = new File([blob], `cutroom.${S.ext}`, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] });
    else $("#done-note").textContent = "Sharing isn't available here - use Download instead.";
  } catch {}
};
if (!navigator.canShare) $("#share").hidden = true;

gate();
