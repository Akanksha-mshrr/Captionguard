// CaptionGuard tests. Run:  node tests.js   (or open tests.html in a browser)
const CG = typeof require !== "undefined" ? require("./checker.js") : window.CaptionGuard;

const rulesOf = (text, rules) => CG.checkCaption(text, rules).findings.map((f) => f.rule);

const BAKERY = CG.normalizeRules({
  brand: "Fresh Bites Bakery", approvedPrices: "499, 799", maxDiscount: 20,
  disclaimer: "While stocks last", banned: "stale, leftover", superlatives: "tastiest",
  guarantees: "", urgency: "",
});

const tests = [
  // ----- default rules -----
  ["clean caption has no findings", () => {
    const r = CG.checkCaption("Meet the ABC Phone X at ₹6,999. Smooth performance for everyday use.");
    return r.findings.length === 0 && r.score === 0;
  }],
  ["wrong price is flagged", () => rulesOf("Get it for ₹5,999").includes("R-PRICE")],
  ["approved price is not flagged", () => !rulesOf("Now at Rs. 6,999").includes("R-PRICE")],
  ["discount above limit is flagged", () => rulesOf("Flat 50% off today! T&C apply").includes("R-DISC")],
  ["valid discount with T&C passes", () => {
    const r = rulesOf("Enjoy 20% off, now ₹6,999. T&C apply.");
    return !r.includes("R-DISC") && !r.includes("R-TNC");
  }],
  ["discount without T&C is flagged", () => rulesOf("Enjoy 20% off on ABC Phone X").includes("R-TNC")],
  ["superlative is flagged", () => rulesOf("The best phone ever").includes("R-SUPER")],
  ["absolute guarantee is flagged", () => rulesOf("100% guaranteed to work").includes("R-GUAR")],
  ["urgency is flagged", () => rulesOf("Hurry! Only today").includes("R-URGENT")],
  ["banned word is flagged", () => rulesOf("A cheap phone for you").includes("R-BAN")],
  ["empty text gives no findings", () => CG.checkCaption("").findings.length === 0],
  ["score never goes above 100", () =>
    CG.checkCaption("Cheap! Best! Cheapest! 90% off ₹1 ₹2 ₹3 ₹4 ₹5 hurry, last chance, guaranteed").score === 100],

  // ----- custom rules (new in v2) -----
  ["custom price is accepted, default price is not", () =>
    !rulesOf("Cake at ₹499", BAKERY).includes("R-PRICE") && rulesOf("Cake at ₹6,999", BAKERY).includes("R-PRICE")],
  ["several approved prices all pass", () =>
    !rulesOf("₹499 or ₹799", BAKERY).includes("R-PRICE")],
  ["custom discount limit is used", () =>
    rulesOf("30% off today. While stocks last", BAKERY).includes("R-DISC")],
  ["custom disclaimer is required", () =>
    rulesOf("10% off", BAKERY).includes("R-TNC") && !rulesOf("10% off. While stocks last", BAKERY).includes("R-TNC")],
  ["custom banned word is flagged, default list is gone", () =>
    rulesOf("Stale bread", BAKERY).includes("R-BAN") && !rulesOf("cheap bread", BAKERY).includes("R-BAN")],
  ["empty box switches a rule off", () => {
    const off = CG.normalizeRules({ brand: "X", approvedPrices: "", maxDiscount: "", disclaimer: "", banned: "", superlatives: "", guarantees: "", urgency: "" });
    return CG.checkCaption("Best ₹1 deal, 99% off, hurry, guaranteed", off).findings.length === 0;
  }],
  ["rules text file is read correctly", () => {
    const p = CG.parseRulesText("# comment\nbrand: Shop\nprice: 1,499, 1,999\nmax discount: 15\nbanned: junk; scrap\nunknown: x");
    const r = CG.normalizeRules(p.partial);
    return p.recognized === 4 && r.approvedPrices.join() === "1499,1999" && r.maxDiscount === 15 && r.banned.join() === "junk,scrap";
  }],
  ["rules survive download then upload", () => {
    const back = CG.normalizeRules(CG.parseRulesText(CG.rulesToText(BAKERY)).partial);
    return JSON.stringify(back) === JSON.stringify(BAKERY);
  }],
  ["bad rule input is cleaned and limited", () => {
    const many = Array.from({ length: 500 }, (_, i) => "w" + i).join(",");
    const r = CG.normalizeRules({ banned: many, maxDiscount: "250", approvedPrices: "abc", brand: "x".repeat(500) });
    return r.banned.length === 200 && r.maxDiscount === null && r.approvedPrices.length === 0 && r.brand.length === 80;
  }],
];

let passed = 0;
const lines = tests.map(([name, fn]) => {
  let ok = false;
  try { ok = !!fn(); } catch (e) { ok = false; }
  if (ok) passed++;
  return (ok ? "PASS  " : "FAIL  ") + name;
});
lines.push("", passed + " / " + tests.length + " tests passed");

if (typeof document !== "undefined") {
  document.getElementById("out").textContent = lines.join("\n");
} else {
  console.log(lines.join("\n"));
  process.exit(passed === tests.length ? 0 : 1);
}
