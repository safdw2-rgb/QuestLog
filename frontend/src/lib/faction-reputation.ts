export function getReputationLevel(points: number): string {
  if (points < 0) {
    return "Недоверие";
  }
  if (points < 20) {
    return "Нейтралитет";
  }
  if (points < 50) {
    return "Уважение";
  }
  return "Почтение";
}
