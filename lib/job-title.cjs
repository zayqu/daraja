// Presentation-only title formatting for all-uppercase Ajira Portal listings.
// Original vacancy titles, source IDs, search data and application URLs remain untouched.
const ACRONYMS = new Set([
  "ICT", "IT", "HR", "CEO", "CFO", "CTO", "GIS", "TVET", "VETA",
  "TEHAMA", "PSRS", "TAMISEMI", "TRA", "TANROADS", "TARURA",
  "NMB", "CRDB", "NBC", "NGO", "UN", "WHO", "HIV", "AIDS",
  "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII",
]);
const LOWERCASE_CONNECTORS = new Set(["and", "of", "the", "for", "in", "at", "to", "with", "ya", "wa", "la", "na", "kwa"]);

function formatJobTitle(value, source) {
  if (typeof value !== "string" || source !== "ajira") return value;
  const title = value.trim();
  // Only change an entirely uppercase title, never already-edited names.
  const letters = title.match(/\p{L}/gu) || [];
  if (!letters.length || letters.some((letter) => letter !== letter.toLocaleUpperCase())) {
    return value;
  }
  let wordIndex = 0;
  return title.toLocaleLowerCase().replace(/\p{L}+(?:[’']\p{L}+)*/gu, (word) => {
    const upper = word.toLocaleUpperCase();
    const first = wordIndex++ === 0;
    if (ACRONYMS.has(upper)) return upper;
    if (!first && LOWERCASE_CONNECTORS.has(word)) return word;
    return word[0].toLocaleUpperCase() + word.slice(1);
  });
}

module.exports = formatJobTitle;
