// Speech-to-text in the browser (Whisper via transformers.js). Runs on the visitor's own device:
// the footage never leaves it. The model downloads once (41 MB fast, 77 MB accurate) and the browser caches it.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2";

env.allowLocalModels = false;
let asr = null, loaded = null;

self.onmessage = async (e) => {
  const { audio, model } = e.data;
  try {
    if (!asr || loaded !== model) {
      asr = await pipeline("automatic-speech-recognition", model, {
        dtype: { encoder_model: "q8", decoder_model_merged: "q8" },   // compressed: base 77 MB, tiny 41 MB
        progress_callback: (p) => self.postMessage({ type: "progress", p }),
      });
      loaded = model;
    }
    self.postMessage({ type: "status", text: "Listening to your video..." });
    const out = await asr(audio, { return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5 });
    self.postMessage({ type: "done", chunks: out.chunks || [] });
  } catch (err) {
    self.postMessage({ type: "error", text: String(err && err.message || err) });
  }
};
