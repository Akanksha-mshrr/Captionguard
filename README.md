# CaptionGuard

A tiny brand-governance tool: paste a caption and CaptionGuard flags wrong prices, over-limit discounts, banned words, unproven claims, absolute guarantees, pressure wording and missing disclaimers **before** you publish.

Dummy project for Round 3 (theme: brand governance). Demo brand: fictional *ABC Electronics*.

**Live link:** `https://<your-github-username>.github.io/captionguard/`
**Team:** Bug Hunters, IIT Patna · **Author:** `<your name>`

## Quick start (3 commands)

```bash
git clone https://github.com/<your-github-username>/captionguard.git
cd captionguard
python -m http.server 8000     # then open http://localhost:8000
```

(Or just double-click `index.html`.)

## Features

- Wrong or outdated price check (approved price ₹6,999)
- Discount above the allowed maximum (30%)
- Banned / off-brand words
- Unproven superlatives ("best", "cheapest", "#1")
- Absolute guarantees ("100% guaranteed", "lifetime")
- Urgency / pressure wording ("hurry", "only today")
- Missing "T&C apply" on offers
- Caption highlighted with colour by severity
- Risk score 0-100 with a clear fix for every finding
- Three sample captions; rules shown on the page
- Dark mode, mobile friendly, keyboard accessible
- Privacy: everything runs in the browser, nothing is uploaded or stored

## Architecture

- `checker.js`: the rule engine. One function, `checkCaption(text, rules)`, returns findings and a score. Pure JavaScript, no dependencies, works in browser and Node.
- `index.html`: the interface (HTML + CSS + a little JS). It only calls `checkCaption` and displays the result.
- `tests.js` / `tests.html`: automated tests.

Key decisions: rules are plain code, so results are exact and explainable (no AI, no guessing); the brand facts live in one `DEFAULT_RULES` object, so changing a price or a limit is a one-line edit; overlapping matches are merged so each problem shows once.

## Testing

12 automated tests, all passing:

```bash
node tests.js
```

or open `tests.html` in a browser. They cover: clean copy passes, wrong price, approved price, discount over limit, valid discount, missing T&C, superlatives, guarantees, urgency, banned words, empty input, score cap at 100.

## Roadmap

- Edit brand rules inside the page
- Hindi / Hinglish number words ("saat hazaar")
- Check text inside poster images (OCR) and contrast
- Save history and an approval step (Creator → Reviewer)
- Browser extension

## Known limitations

Fixed demo brand; English only; checks wording rules only (no meaning-based or image checks); a human should always review.

## Disclosure

Built 19-21 Nov 2026. Code written with AI assistance (Claude) and reviewed by the author. No external libraries or services are used.
