# Stillness — Daily Meditation Journal

A calm, mobile-first journal inspired by a paper meditation log. Rate each session **0–10**
on a tap-bar, watch your totals add up live, and unwind afterward with guided
**post-meditation stretches** (illustrated). Works offline, installs to the home screen,
and runs entirely as static files — perfect for free GitHub Pages hosting.

## What's inside
- **Quality** (6 aspects · /60), **Blocks** (6 aspects · /60), **Off the cushion** (5 aspects · /50)
- 0–10 tap selector for every aspect with running totals + a normalised wellbeing score
- **You name your own sessions** — pick a preset (Morning / Afternoon / Evening / Night) or type anything
- Illustrated stretch library + a post-session stretch reminder
- Insights: trend bars + averages across recent sessions
- Export / import (JSON + CSV) — your data stays on your device by default

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
If you want every submission sent to one place you own, create a `config.js`:

```js
// config.js — loaded before app.js if present
window.STILLNESS_CONFIG = {
  collectEndpoint: "https://script.google.com/macros/s/XXXX/exec" // Apps Script / Formspree / etc.
};
```
The app will `POST` each saved session to that endpoint (and still keep the local copy).
A ready-to-paste Google Apps Script collector is described in `COLLECTION.md`.
