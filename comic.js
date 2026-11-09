// Comic panel drawings for shared storyboards (same art as Story Lab in the Cutroom Hub).
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const SHOTS = ["talk-close", "walk-talk", "point", "house-front", "drone", "room", "text-card", "split", "phone", "keys", "map", "reaction"];
const SHOT_WORDS = { "talk-close": "close-up talking to camera", "walk-talk": "walking and talking", "point": "pointing out a feature",
  "house-front": "house from the street", "drone": "drone over the street", "room": "inside a room (b-roll)", "text-card": "big text on screen",
  "split": "split screen / before-after", "phone": "phone screen or text message", "keys": "keys / handshake", "map": "map with a pin", "reaction": "reaction shot" };

// ---------- comic panel art: one small drawing per shot type
const C = { ink: "#16151a", cyan: "#14a3d9", mag: "#e2287a", yel: "#ffd23a", sky: "#d9f0fb", pink: "#fde3ee", sun: "#fff2c2", paper: "#fff", skin: "#e8b48f", hair: "#2a1d17", suit: "#2f4a6b" };
const BGS = [C.sky, C.pink, C.sun, "#e3f4e1"];
function dots(id, col) {
  return `<defs><pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="${col}" opacity=".35"/></pattern></defs>`;
}
function person(x, y, s = 1, opts = {}) {
  const arm = opts.point ? `<path d="M${x + 14 * s} ${y + 40 * s} L${x + 52 * s} ${y + 22 * s}" stroke="${C.suit}" stroke-width="${9 * s}" stroke-linecap="round"/><circle cx="${x + 55 * s}" cy="${y + 21 * s}" r="${5 * s}" fill="${C.skin}" stroke="${C.ink}" stroke-width="2"/>` :
    opts.wave ? `<path d="M${x + 14 * s} ${y + 40 * s} L${x + 32 * s} ${y + 12 * s}" stroke="${C.suit}" stroke-width="${9 * s}" stroke-linecap="round"/>` : "";
  return `<g stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round">
    <path d="M${x - 26 * s} ${y + 90 * s} Q${x - 24 * s} ${y + 30 * s} ${x} ${y + 30 * s} Q${x + 24 * s} ${y + 30 * s} ${x + 26 * s} ${y + 90 * s} Z" fill="${C.suit}"/>
    <path d="M${x - 6 * s} ${y + 30 * s} L${x} ${y + 44 * s} L${x + 6 * s} ${y + 30 * s}" fill="#fff"/>
    <circle cx="${x}" cy="${y + 12 * s}" r="${17 * s}" fill="${C.skin}"/>
    <path d="M${x - 17 * s} ${y + 8 * s} Q${x} ${y - 14 * s} ${x + 17 * s} ${y + 8 * s} Q${x + 8 * s} ${y - 2 * s} ${x - 17 * s} ${y + 8 * s}Z" fill="${C.hair}"/>
    ${arm}</g>
    <circle cx="${x - 6 * s}" cy="${y + 13 * s}" r="${1.8 * s}" fill="${C.ink}"/><circle cx="${x + 6 * s}" cy="${y + 13 * s}" r="${1.8 * s}" fill="${C.ink}"/>
    <path d="M${x - 6 * s} ${y + 21 * s} Q${x} ${y + 26 * s} ${x + 6 * s} ${y + 21 * s}" stroke="${C.ink}" stroke-width="2" fill="none"/>`;
}
function house(x, y, s = 1) {
  return `<g stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round">
    <rect x="${x - 50 * s}" y="${y}" width="${100 * s}" height="${60 * s}" fill="#fff"/>
    <path d="M${x - 60 * s} ${y + 2 * s} L${x} ${y - 38 * s} L${x + 60 * s} ${y + 2 * s} Z" fill="${C.mag}"/>
    <rect x="${x - 10 * s}" y="${y + 24 * s}" width="${20 * s}" height="${36 * s}" fill="${C.cyan}"/>
    <rect x="${x - 40 * s}" y="${y + 14 * s}" width="${20 * s}" height="${18 * s}" fill="${C.yel}"/>
    <rect x="${x + 20 * s}" y="${y + 14 * s}" width="${20 * s}" height="${18 * s}" fill="${C.yel}"/></g>`;
}
function scene(shot, i, text) {
  const id = "d" + Math.random().toString(36).slice(2, 8), bg = BGS[i % BGS.length];
  const W = 320, H = 200;
  const base = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(SHOT_WORDS[shot] || shot)}" xmlns="http://www.w3.org/2000/svg">${dots(id, C.ink)}<rect width="${W}" height="${H}" fill="${bg}"/><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
  const burst = (x, y, r, col) => { let p = ""; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, rr = k % 2 ? r * .62 : r; p += `${k ? "L" : "M"}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)} `; } return `<path d="${p}Z" fill="${col}" stroke="${C.ink}" stroke-width="2.5"/>`; };
  let g = "";
  switch (shot) {
    case "talk-close": g = `${burst(160, 110, 120, "#fff")}${person(160, 62, 1.7)}`; break;
    case "walk-talk": g = `<rect x="0" y="150" width="320" height="50" fill="#c9b79c" stroke="${C.ink}" stroke-width="2.5"/><rect x="214" y="40" width="54" height="110" fill="#fff" stroke="${C.ink}" stroke-width="2.5"/>
      <path d="M40 92h40M30 104h46M44 116h34" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>${person(140, 48, 1.15, { wave: true })}`; break;
    case "point": g = `<rect x="190" y="30" width="104" height="90" fill="${C.sky}" stroke="${C.ink}" stroke-width="3"/><path d="M242 30v90M190 75h104" stroke="${C.ink}" stroke-width="3"/>
      <circle cx="268" cy="52" r="12" fill="${C.yel}" stroke="${C.ink}" stroke-width="2"/>${person(100, 56, 1.2, { point: true })}`; break;
    case "house-front": g = `<circle cx="262" cy="46" r="22" fill="${C.yel}" stroke="${C.ink}" stroke-width="2.5"/><rect x="0" y="160" width="320" height="40" fill="#8fcf7f" stroke="${C.ink}" stroke-width="2.5"/>${house(150, 100, 1.1)}
      <path d="M40 160v-40M40 120c-14 0-18-22 0-26 18 4 14 26 0 26" fill="#5fae5a" stroke="${C.ink}" stroke-width="2.5"/>`; break;
    case "drone": { let roofs = ""; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) roofs += `<rect x="${18 + c * 60}" y="${18 + r * 62}" width="44" height="40" fill="${(r + c) % 3 === 1 ? C.mag : "#fff"}" stroke="${C.ink}" stroke-width="2.5"/>`;
      g = `<rect width="320" height="200" fill="#8fcf7f"/>${roofs}<path d="M0 72h320M0 134h320" stroke="#bbb" stroke-width="10"/><circle cx="160" cy="100" r="26" fill="none" stroke="${C.yel}" stroke-width="5" stroke-dasharray="8 6"/>`; break; }
    case "room": g = `<rect x="0" y="130" width="320" height="70" fill="#e9dcc8" stroke="${C.ink}" stroke-width="2.5"/><rect x="40" y="96" width="240" height="40" fill="#fff" stroke="${C.ink}" stroke-width="3"/>
      <path d="M100 0v40M220 0v40" stroke="${C.ink}" stroke-width="2.5"/><path d="M86 40h28l-6 14h-16zM206 40h28l-6 14h-16z" fill="${C.yel}" stroke="${C.ink}" stroke-width="2.5"/>
      <rect x="250" y="60" width="40" height="36" fill="#5fae5a" stroke="${C.ink}" stroke-width="2.5"/>`; break;
    case "text-card": g = `${burst(160, 100, 140, C.yel)}<text x="160" y="${text && text.length > 14 ? 110 : 118}" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="${text && text.length > 14 ? 30 : 44}" fill="${C.ink}" letter-spacing="1">${esc((text || "BIG IDEA").toUpperCase().slice(0, 22))}</text>`; break;
    case "split": g = `<rect x="0" y="0" width="160" height="200" fill="#d8d3cc"/><rect x="160" y="0" width="160" height="200" fill="${C.sky}"/><path d="M160 0v200" stroke="${C.ink}" stroke-width="5"/>
      ${house(80, 90, .8).replace(new RegExp(C.mag, "g"), "#8a8580").replace(new RegExp(C.yel, "g"), "#aaa")}${house(240, 90, .8)}
      <text x="80" y="185" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="22" fill="${C.ink}">BEFORE</text><text x="240" y="185" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="22" fill="${C.ink}">AFTER</text>`; break;
    case "phone": g = `<rect x="112" y="14" width="96" height="176" rx="14" fill="${C.ink}"/><rect x="120" y="30" width="80" height="144" rx="4" fill="#fff"/>
      <rect x="128" y="44" width="56" height="20" rx="8" fill="${C.sky}" stroke="${C.ink}" stroke-width="1.5"/><rect x="136" y="72" width="56" height="20" rx="8" fill="${C.cyan}"/><rect x="128" y="100" width="44" height="20" rx="8" fill="${C.sky}" stroke="${C.ink}" stroke-width="1.5"/>
      <path d="M60 150l20-20M250 60l22-14M246 92l26 2" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`; break;
    case "keys": g = `${burst(160, 100, 110, "#fff")}<g stroke="${C.ink}" stroke-width="3"><circle cx="130" cy="88" r="26" fill="${C.yel}"/><circle cx="130" cy="88" r="10" fill="${bg}"/>
      <path d="M154 96h86v16h-14v-10h-12v14h-12v-14h-48z" fill="${C.yel}"/></g><path d="M70 40l14 14M250 36l-12 16M262 150l-16-8" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`; break;
    case "map": g = `<rect width="320" height="200" fill="#e7f1e2"/><path d="M0 60 C80 40 140 120 320 90M60 0 C90 80 60 150 120 200M220 0 C200 90 260 140 240 200" stroke="#fff" stroke-width="12" fill="none"/>
      <path d="M0 60 C80 40 140 120 320 90M60 0 C90 80 60 150 120 200M220 0 C200 90 260 140 240 200" stroke="${C.ink}" stroke-width="1.5" fill="none"/>
      <path d="M170 116c-22-26-26-36-26-48a26 26 0 0 1 52 0c0 12-4 22-26 48z" fill="${C.mag}" stroke="${C.ink}" stroke-width="3"/><circle cx="170" cy="68" r="9" fill="#fff" stroke="${C.ink}" stroke-width="2"/>`; break;
    case "reaction": g = `${person(110, 64, 1.1)}${person(214, 70, 1.0, { wave: true })}<text x="268" y="52" font-family="Bangers, Impact, sans-serif" font-size="46" fill="${C.mag}" stroke="${C.ink}" stroke-width="1.5">!</text>`; break;
    default: g = person(160, 60, 1.4);
  }
  return base + g + "</svg>";
}
export { scene, SHOTS, esc };
