/* CaptionGuard - rule engine (no AI, no server). Works in browser and Node. */
(function (root) {
  const DEFAULT_RULES = {
    brand: "ABC Electronics",
    approvedPrices: [6999],
    maxDiscount: 30,
    banned: ["cheap", "free gift", "miracle", "scam", "fake"],
    superlatives: ["best", "cheapest", "#1", "number one", "fastest", "unbeatable", "world's best"],
    guarantees: ["100% guaranteed", "guaranteed", "lifetime", "never fails", "risk-free"],
    urgency: ["hurry", "last chance", "only today", "limited time", "act now", "grab now"],
    disclaimer: "T&C apply",
  };

  const WEIGHTS = { high: 25, medium: 10, low: 5 };
  const LIST_KEYS = ["banned", "superlatives", "guarantees", "urgency"];

  function esc(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /* ---------- rules: clean, parse from text, write to text ---------- */
  function cleanList(v) {
    if (typeof v === "string") v = v.split(/[,;\n]/);
    if (!Array.isArray(v)) return [];
    const out = v.map((x) => String(x).trim()).filter((x) => x && x.length <= 60);
    return Array.from(new Set(out)).slice(0, 200);
  }

  function cleanNumbers(v) {
    if (typeof v === "number") v = [v];
    if (typeof v === "string") v = v.split(/[;\n]|,\s/);
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => parseFloat(String(x).replace(/[^\d.]/g, "")))
      .filter((x) => isFinite(x) && x > 0)
      .slice(0, 50);
  }

  // Turns any rules-like object into a safe, complete rules object.
  function normalizeRules(obj) {
    obj = obj || {};
    const r = {};
    r.brand = String(obj.brand || "My brand").trim().slice(0, 80) || "My brand";
    r.approvedPrices = cleanNumbers(obj.approvedPrices !== undefined ? obj.approvedPrices : obj.approvedPrice);
    const md = parseFloat(obj.maxDiscount);
    r.maxDiscount = isFinite(md) && md >= 0 && md <= 100 ? md : null;
    r.disclaimer = String(obj.disclaimer || "").trim().slice(0, 80);
    LIST_KEYS.forEach((k) => { r[k] = cleanList(obj[k]); });
    return r;
  }

  const KEY_MAP = {
    brand: "brand", "brand name": "brand",
    price: "approvedPrices", prices: "approvedPrices", "approved price": "approvedPrices", "approved prices": "approvedPrices",
    "max discount": "maxDiscount", "maximum discount": "maxDiscount", discount: "maxDiscount",
    disclaimer: "disclaimer", "required disclaimer": "disclaimer",
    banned: "banned", "banned words": "banned",
    superlatives: "superlatives", "superlative words": "superlatives",
    guarantees: "guarantees", "guarantee words": "guarantees",
    urgency: "urgency", "urgency words": "urgency",
  };

  // Reads a simple text file such as:  price: 499  /  banned: cheap, scam
  // Returns { partial, recognized } where partial holds only the keys found.
  function parseRulesText(text) {
    const partial = {};
    let recognized = 0;
    String(text || "").slice(0, 100000).split(/\r?\n/).forEach((line) => {
      line = line.trim();
      if (!line || line[0] === "#") return;
      const i = line.indexOf(":");
      if (i < 1) return;
      const key = KEY_MAP[line.slice(0, i).trim().toLowerCase()];
      if (!key) return;
      partial[key] = line.slice(i + 1).trim();
      recognized++;
    });
    return { partial, recognized };
  }

  function rulesToText(rules) {
    const r = normalizeRules(rules);
    return [
      "# CaptionGuard rules - edit and upload this file back into the page",
      "brand: " + r.brand,
      "price: " + r.approvedPrices.join(", "),
      "max discount: " + (r.maxDiscount === null ? "" : r.maxDiscount),
      "disclaimer: " + r.disclaimer,
      "banned: " + r.banned.join(", "),
      "superlatives: " + r.superlatives.join(", "),
      "guarantees: " + r.guarantees.join(", "),
      "urgency: " + r.urgency.join(", "),
      "",
    ].join("\n");
  }

  /* ---------- checking ---------- */
  function findTerms(text, terms, make) {
    const out = [];
    for (const t of terms) {
      const re = new RegExp("(?<![\\w])" + esc(t) + "(?![\\w])", "gi");
      let m;
      while ((m = re.exec(text))) out.push(make(m[0], m.index, t));
    }
    return out;
  }

  function fmtPrice(n) {
    return "\u20B9" + n.toLocaleString("en-IN");
  }

  function checkCaption(text, given) {
    given = given || {};
    const rules = Object.assign({}, DEFAULT_RULES, given);
    if (given.approvedPrice !== undefined && given.approvedPrices === undefined) {
      rules.approvedPrices = [given.approvedPrice];
    }
    const prices = Array.isArray(rules.approvedPrices) ? rules.approvedPrices : [];
    text = text || "";
    let f = [];

    // R-PRICE: any price that is not an approved price (skipped if none are set)
    if (prices.length) {
      const priceRe = /(?:\u20B9|Rs\.?|INR)\s?([\d,]+(?:\.\d+)?)/gi;
      let m;
      while ((m = priceRe.exec(text))) {
        const value = parseFloat(m[1].replace(/,/g, ""));
        if (!prices.includes(value)) {
          f.push({
            rule: "R-PRICE", severity: "high", start: m.index, end: m.index + m[0].length, match: m[0],
            message: "Price does not match the approved price.",
            fix: "Use the approved price: " + prices.map(fmtPrice).join(" or ") + ".",
          });
        }
      }
    }

    // R-DISC: discount above the maximum (skipped if no maximum is set)
    let hasDiscount = false;
    const discRes = [/(\d{1,3})\s?%\s*(?:off|discount)/gi, /(?:off|discount)\s*(?:of|up to|upto)?\s*(\d{1,3})\s?%/gi];
    for (const re of discRes) {
      let m;
      while ((m = re.exec(text))) {
        hasDiscount = true;
        if (rules.maxDiscount !== null && rules.maxDiscount !== undefined && parseInt(m[1], 10) > rules.maxDiscount) {
          f.push({
            rule: "R-DISC", severity: "high", start: m.index, end: m.index + m[0].length, match: m[0],
            message: "Discount is above the maximum allowed (" + rules.maxDiscount + "%).",
            fix: "Use " + rules.maxDiscount + "% or less.",
          });
        }
      }
    }

    f = f.concat(findTerms(text, rules.banned || [], (match, i) => ({
      rule: "R-BAN", severity: "high", start: i, end: i + match.length, match,
      message: "Off-brand or banned word.", fix: "Remove or replace this word.",
    })));
    f = f.concat(findTerms(text, rules.superlatives || [], (match, i) => ({
      rule: "R-SUPER", severity: "medium", start: i, end: i + match.length, match,
      message: "Superlative claim with no proof.", fix: "Remove it, or add a proof source.",
    })));
    f = f.concat(findTerms(text, rules.guarantees || [], (match, i) => ({
      rule: "R-GUAR", severity: "medium", start: i, end: i + match.length, match,
      message: "Absolute guarantee is risky.", fix: "Say what is actually covered (e.g. '1-year warranty').",
    })));
    f = f.concat(findTerms(text, rules.urgency || [], (match, i) => ({
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

    // R-TNC: discount present but no disclaimer (skipped if no disclaimer is set)
    if (hasDiscount && rules.disclaimer && !new RegExp(esc(rules.disclaimer), "i").test(text)) {
      kept.push({
        rule: "R-TNC", severity: "medium", start: -1, end: -1, match: "",
        message: "Offer has no disclaimer.", fix: "Add '" + rules.disclaimer + "' at the end.",
      });
    }

    const score = Math.min(100, kept.reduce((s, x) => s + WEIGHTS[x.severity], 0));
    return { findings: kept, score, level: score === 0 ? "clean" : score < 30 ? "low" : score < 60 ? "medium" : "high" };
  }

  const api = { checkCaption, normalizeRules, parseRulesText, rulesToText, DEFAULT_RULES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CaptionGuard = api;
})(typeof window !== "undefined" ? window : globalThis);
