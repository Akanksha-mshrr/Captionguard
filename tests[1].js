// CaptionGuard tests. Run:  node tests.js   (or open tests.html in a browser)
const CG = typeof require !== "undefined" ? require("./checker.js") : window.CaptionGuard;

const rulesOf = (text) => CG.checkCaption(text).findings.map((f) => f.rule);
const tests = [
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
