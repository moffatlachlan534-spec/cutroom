// accent = highlight colour (what viewers should focus on); bg = background colour (graphic cards,
// caption boxes in Bold Box). Both can be changed per video.
// The talking-video styles (same looks as the Cutroom PC kit's styles/*.json).
// font: a free Google Font close to the PC font. grade: canvas filter values.
export const STYLES = [
  { id: "signature", name: "Signature", blurb: "Clean captions that pop in word by word, key words on a box, calm pacing, gentle punch-ins.",
    pacing: "natural", zoom: [1.0, 1.08], push: 0,
    cap: { font: "Inter", weight: 800, mode: "pop", upper: true, words: 3, size: 0.050, pos: 0.60, outline: 0.09 },
    accent: "#656D43", bg: "#14150F", grade: { contrast: 1.04, saturate: 1.02, matte: 0.03 } },
  { id: "bold-box", name: "Bold Box", blurb: "Every caption on a solid colour box, two words at a time, tight cuts, punch-in every other line.",
    pacing: "tight", zoom: [1.0, 1.15], push: 0,
    cap: { font: "Inter", weight: 800, mode: "box", upper: true, words: 2, size: 0.054, pos: 0.58, outline: 0.09 },
    accent: "#FFD23F", bg: "#D9432F", grade: { contrast: 1.08, saturate: 1.12 } },
  { id: "word-follow", name: "Word Follow", blurb: "The whole phrase shows and each word lights up as it's said. Great on mute.",
    pacing: "tight", zoom: [1.0, 1.1], push: 0,
    cap: { font: "Barlow Semi Condensed", weight: 700, mode: "karaoke", upper: true, words: 4, size: 0.050, pos: 0.60, outline: 0.09 },
    accent: "#F2C14E", bg: "#14150F", grade: { contrast: 1.05, saturate: 1.08 } },
  { id: "one-word", name: "One Word", blurb: "One big word at a time, key words in colour, quick punch-ins. High energy.",
    pacing: "tight", zoom: [1.0, 1.12, 1.0, 1.2], push: 0,
    cap: { font: "Anton", weight: 400, mode: "single", upper: true, words: 1, size: 0.072, pos: 0.52, outline: 0.12 },
    accent: "#F2C14E", bg: "#111111", grade: { contrast: 1.1, saturate: 1.15 } },
  { id: "quiet-minimal", name: "Quiet Minimal", blurb: "Small sentence-case captions that fade in, a slow push-in and a soft warm look.",
    pacing: "natural", zoom: [1.0], push: 0.03,
    cap: { font: "Inter", weight: 600, mode: "plain", upper: false, words: 5, size: 0.042, pos: 0.62, outline: 0.06 },
    accent: "#E8D9B5", bg: "#1B1A17", grade: { contrast: 1.0, saturate: 0.95, warmth: 0.2, matte: 0.05 } },
  { id: "documentary", name: "Documentary", blurb: "Serif captions by the phrase, slow push-ins, warm film colour, vignette and grain.",
    pacing: "natural", zoom: [1.0], push: 0.05,
    cap: { font: "Source Serif 4", weight: 600, mode: "plain", upper: false, words: 6, size: 0.042, pos: 0.62, outline: 0.05 },
    accent: "#E3C58F", bg: "#1A1611", grade: { contrast: 1.02, saturate: 0.92, warmth: 0.45, matte: 0.07, vignette: 0.5, grain: 0.06 } },
  { id: "moody-mono", name: "Moody Mono", blurb: "Near black-and-white, deep contrast, vignette and grain. Serious and striking.",
    pacing: "natural", zoom: [1.0], push: 0.04,
    cap: { font: "Archivo", weight: 600, mode: "pop", upper: true, words: 3, size: 0.050, pos: 0.60, outline: 0.09 },
    accent: "#FFFFFF", bg: "#0E0E0E", grade: { contrast: 1.15, saturate: 0.08, brightness: 0.98, vignette: 0.6, grain: 0.08 } },
  { id: "bright-pop", name: "Bright Pop", blurb: "Colourful and friendly: vivid colour, words light up as they're said.",
    pacing: "tight", zoom: [1.0, 1.0, 1.12], push: 0,
    cap: { font: "Inter", weight: 800, mode: "karaoke", upper: true, words: 3, size: 0.052, pos: 0.60, outline: 0.09 },
    accent: "#3FB6E8", bg: "#102A3A", grade: { contrast: 1.06, saturate: 1.25, warmth: 0.1 } },
];

export const PACING = {
  tight: { pre: 0.10, post: 0.20, join: 0.30 },     // gaps longer than `join` are cut out
  natural: { pre: 0.16, post: 0.26, join: 0.75 },
};

// coloured TEXT on video needs a light colour: mix dark brand colours toward white
export function readable(hex, minLum = 0.62) {
  let [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let k = 0; k < 10 && (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < minLum; k++)
    [r, g, b] = [r, g, b].map((c) => Math.round(c + (255 - c) * 0.2));
  return `rgb(${r},${g},${b})`;
}
