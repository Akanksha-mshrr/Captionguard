# CaptionGuard

A small brand-governance tool: paste a caption and CaptionGuard flags wrong prices, over-limit discounts, banned words, unproven claims, absolute guarantees, pressure wording and missing disclaimers **before** you publish. Each brand can **set its own rules** or upload a rules file.

Round 3 individual project (theme: brand governance). Sample brand: fictional *ABC Electronics*.

**Live link:** https://akanksha-mshrr.github.io/Captionguard/
**Team:** Bug Hunters, IIT Patna · **Author:** Akanksha Mishra
**Final report:** [CaptionGuard_Final_Report.pdf](CaptionGuard_Final_Report.pdf)

## Quick start (3 commands)

```bash
git clone https://github.com/Akanksha-mshrr/Captionguard.git
cd Captionguard
python -m http.server 8000     # then open http://localhost:8000
```

(Or just double-click `index.html`.)

## Features

- Wrong or outdated price check (one or several approved prices)
- Discount above the allowed maximum
- Banned / off-brand words
- Unproven superlatives ("best", "cheapest", "#1")
- Absolute guarantees ("100% guaranteed", "lifetime")
- Urgency / pressure wording ("hurry", "only today")
- Missing disclaimer (for example "T&C apply") on offers
- **Editable brand rules:** change prices, limit, disclaimer and the four word lists in the page; leave a box empty to switch that rule off
- **Upload / download rules file** (.txt or .json), so any brand can load its own rules; `sample_rules.txt` is an example for a different brand
- Rules can be saved in your own browser and reset to the sample rules
- Caption highlighted by severity, with the reason and a suggested fix for every finding
- Risk score 0-100; three sample captions
- Dark mode, mobile friendly, keyboard accessible
- Privacy: everything runs in the browser, nothing is uploaded to a server

## Rules file format

A plain text file, one setting per line (lines starting with `#` are ignored):

```text
brand: Fresh Bites Bakery
price: 499, 799
max discount: 20
disclaimer: While stocks last
banned: stale, leftover
superlatives: tastiest, best
guarantees: 100% fresh
urgency: hurry, last chance
```

A `.json` file with the same names also works. Only the settings found in the file are changed.

## Architecture

- `checker.js`: the rule engine. `checkCaption(text, rules)` returns findings and a score; `normalizeRules`, `parseRulesText` and `rulesToText` clean, read and write rules. Plain JavaScript, no dependencies, works in browser and Node.
- `index.html`: the interface (HTML + CSS + small JS). It reads the rules form and calls `checkCaption`.
- `tests.js` / `tests.html`: automated tests.
- `sample_rules.txt`: example rules file.

Key decisions: rules are plain code, so results are exact and explainable (no AI, no guessing); rules are data, so any brand can change them without editing code; uploaded rules are cleaned and size-limited before use; overlapping matches are merged so each problem shows once.

## Testing

21 automated tests, all passing:

```bash
node tests.js
```

or open `tests.html` in a browser. They cover the default rules (clean copy, wrong and approved price, discount limit, T&C, superlatives, guarantees, urgency, banned words, empty input, score cap) and custom rules (custom price(s), limit, disclaimer and banned words; empty box switching a rule off; reading a rules file; download then upload; cleaning bad input).

## Roadmap

- Read rules directly from a PDF brand guideline (needs text extraction or AI, and a human check)
- Hindi / Hinglish number words ("saat hazaar")
- Check text inside poster images (OCR) and contrast
- Save history and an approval step (Creator → Reviewer)
- Browser extension

## Known limitations

Rules are word lists, so it cannot read a full PDF regulation by itself; English only; wording rules only (no meaning-based or image checks); saved rules stay in one browser; a human should always review.

## Disclosure

Code written with AI assistance (Claude) and reviewed by the author. No external libraries or services are used.
