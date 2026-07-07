export function getReputationBarPercent(points: number): number {
  if (points < 0) {
    return Math.min(30, Math.max(8, Math.abs(points) * 2));
  }
  return Math.min(100, Math.max(4, points));
}

export function getReputationBarTone(
  points: number,
): "gold" | "green" | "negative" {
  if (points < 0) {
    return "negative";
  }
  if (points >= 50) {
    return "gold";
  }
  return "green";
}
