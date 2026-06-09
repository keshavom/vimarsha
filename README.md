# Vimarsha — Daily Meditation Journal

> *विमर्श* — reflection, contemplation.

A calm, mobile-first journal inspired by a paper meditation log and the gentle,
warm aesthetic of [os.me](https://os.me). Reflect on each session **0–10** on a
tap-bar, watch your totals add up live, and unwind afterward with guided,
illustrated **post-meditation stretches**. Works offline, installs to the home
screen, and runs entirely as static files — perfect for free GitHub Pages hosting.

> *“Ultimately, meditation is silence and presence of the mind.”* — Om Swami, *A Million Thoughts*

## What's inside
- **Quality** (6 aspects · /60), **Blocks** (6 aspects · /60), **Off the cushion** (5 aspects · /50)
- 0–10 tap selector for every aspect with running totals + a normalised wellbeing score
- **You name your own sessions** — pick a preset (Morning / Afternoon / Evening / Night) or type anything
- Illustrated stretch library + a post-session stretch reminder
- Insights: trend bars + averages across recent sessions
- Export / import (JSON + CSV) — data stays on each person's device by default

## Run locally
Open `index.html` in a browser, or serve it:
```bash
npx serve .      # or: python -m http.server 8080
```

## Deploy (GitHub Pages)
1. Push this folder to a GitHub repo.
2. Repo **Settings → Pages → Source: Deploy from a branch → `main` / root**.
3. Your link `https://<user>.github.io/<repo>/` works on any phone — just share it.

## Collecting submissions centrally (optional)
By default each person's entries live in **their own browser** (private, offline-friendly).
To gather every submission into **one Google Sheet you own**, follow **`COLLECTION.md`**:
deploy the `collector.gs` Apps Script, then paste its URL into `config.js`:

```js
window.VIMARSHA_CONFIG = {
  collectEndpoint: "https://script.google.com/macros/s/XXXX/exec",
};
```
The app then POSTs each saved session to that endpoint (and still keeps the local copy).
The secret lives on Google's servers — never in the public page.

---
*All mistakes are mine, all grace is of Maa. Narayani Namostute.* 🪷
