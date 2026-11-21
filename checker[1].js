/* CaptionGuard - rule engine (no AI, no server). Works in browser and Node. */
(function (root) {
  const DEFAULT_RULES = {
    brand: "ABC Electronics",
    approvedPrice: 6999,
    maxDiscount: 30,
    banned: ["cheap", "free gift", "miracle", "scam", "fake"],
    superlatives: ["best", "cheapest", "#1", "number one", "fastest", "unbeatable", "world's best"],
    guarantees: ["100% guaranteed", "guaranteed", "lifetime", "never fails", "risk-free"],
    urgency: ["hurry", "last chance", "only today", "limited time", "act now", "grab now"],
    disclaimer: "T&C apply",
  };

  const WEIGHTS = { high: 25, medium: 10, low: 5 };

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function findTerms(text, terms, make) {
    const out = [];
    for (const t of terms) {
      const re = new RegExp("(?<![\\w])" + esc(t) + "(?![\\w])", "gi");
      let m;
      while ((m = re.exec(text))) out.push(make(m[0], m.index, t));
    }
    return out;
  }

  function checkCaption(text, rules) {
    rules = Object.assign({}, DEFAULT_RULES, rules || {});
    text = text || "";
    let f = [];

    // R-PRICE: any price that is not the approved price
    const priceRe = /(?:₹|Rs\.?|INR)\s?([\d,]+(?:\.\d+)?)/gi;
    let m;
    while ((m = priceRe.exec(text))) {
      const value = parseFloat(m[1].replace(/,/g, ""));
      if (value !== rules.approvedPrice) {
        f.push({
          rule: "R-PRICE", severity: "high", start: m.index, end: m.index + m[0].length, match: m[0],
          message: "Price does not match the approved price.",
          fix: "Use the approved price ₹" + rules.approvedPrice.toLocaleString("en-IN") + ".",
        });
      }
    }

    // R-DISC: discount above the maximum allowed
    let hasDiscount = false;
    const discRes = [/(\d{1,3})\s?%\s*(?:off|discount)/gi, /(?:off|discount)\s*(?:of|up to|upto)?\s*(\d{1,3})\s?%/gi];
    for (const re of discRes) {
      while ((m = re.exec(text))) {
        hasDiscount = true;
        if (parseInt(m[1], 10) > rules.maxDiscount) {
          f.push({
            rule: "R-DISC", severity: "high", start: m.index, end: m.index + m[0].length, match: m[0],
            message: "Discount is above the maximum allowed (" + rules.maxDiscount + "%).",
            fix: "Use " + rules.maxDiscount + "% or less.",
          });
        }
      }
    }

    f = f.concat(findTerms(text, rules.banned, (match, i) => ({
      rule: "R-BAN", severity: "high", start: i, end: i + match.length, match,
      message: "Off-brand or banned word.", fix: "Remove or replace this word.",
    })));
    f = f.concat(findTerms(text, rules.superlatives, (match, i) => ({
      rule: "R-SUPER", severity: "medium", start: i, end: i + match.length, match,
      message: "Superlative claim with no proof.", fix: "Remove it, or add a proof source.",
    })));
    f = f.concat(findTerms(text, rules.guarantees, (match, i) => ({
      rule: "R-GUAR", severity: "medium", start: i, end: i + match.length, match,
      message: "Absolute guarantee is risky.", fix: "Say what is actually covered (e.g. '1-year warranty').",
    })));
    f = f.concat(findTerms(text, rules.urgency, (match, i) => ({
      rule: "R-URGENT", severity: "low", start: i, end: i + match.length, match,
      message: "Pressure / urgency wording.", fix: "Use a calmer call to action.",
    })));

    // Drop overlapping findings (keep the longest at each spot)
    f.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const kept = [];
    let lastEnd = -1;
    for (const x of f) {
      if (x.start >= lastEnd) { kept.push(x); lastEnd = x.end; }
    }

    // R-TNC: discount present but no disclaimer (whole-caption finding)
    if (hasDiscount && !new RegExp(esc(rules.disclaimer), "i").test(text)) {
      kept.push({
        rule: "R-TNC", severity: "medium", start: -1, end: -1, match: "",
        message: "Offer has no disclaimer.", fix: "Add '" + rules.disclaimer + "' at the end.",
      });
    }

    const score = Math.min(100, kept.reduce((s, x) => s + WEIGHTS[x.severity], 0));
    return { findings: kept, score, level: score === 0 ? "clean" : score < 30 ? "low" : score < 60 ? "medium" : "high" };
  }

  const api = { checkCaption, DEFAULT_RULES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CaptionGuard = api;
})(typeof window !== "undefined" ? window : globalThis);
