export function formatCompactCount(value) {
  const count = Number(value) || 0;
  if (count < 1_000) return count.toLocaleString();

  const units = [
    { threshold: 1_000_000_000, suffix: "B" },
    { threshold: 1_000_000, suffix: "M" },
    { threshold: 1_000, suffix: "K" },
  ];

  const unit = units.find(({ threshold }) => count >= threshold);
  if (!unit) return count.toLocaleString();

  const scaled = count / unit.threshold;
  const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return `${Number(scaled.toFixed(decimals))}${unit.suffix}`;
}
