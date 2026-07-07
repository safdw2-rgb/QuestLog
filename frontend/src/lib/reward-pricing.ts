import { getReputationLevel } from "@/lib/faction-reputation";

export function calculateFactionPrice(
  baseCost: number,
  reputationPoints: number,
): number {
  if (reputationPoints < 0) {
    return Math.ceil(baseCost * 1.25);
  }
  if (reputationPoints < 20) {
    return baseCost;
  }
  if (reputationPoints < 50) {
    return Math.ceil(baseCost * 0.9);
  }
  return Math.ceil(baseCost * 0.75);
}

export type PriceAdjustmentType = "discount" | "markup";

export interface PriceAdjustmentInfo {
  type: PriceAdjustmentType;
  /** Короткая подпись для tooltip (без emoji). */
  tooltipLabel: string;
  effectiveCost: number;
  showDualPrice: boolean;
}

export function hasReputationPriceAdjustment(reputationPoints: number): boolean {
  return reputationPoints < 0 || reputationPoints >= 20;
}

export function getPriceAdjustmentInfo(
  baseCost: number,
  reputationPoints: number,
): PriceAdjustmentInfo | null {
  if (!hasReputationPriceAdjustment(reputationPoints)) {
    return null;
  }

  const effectiveCost = calculateFactionPrice(baseCost, reputationPoints);
  if (effectiveCost === baseCost) {
    return null;
  }

  if (reputationPoints < 0) {
    return {
      type: "markup",
      tooltipLabel: "+25% из-за Недоверия",
      effectiveCost,
      showDualPrice: true,
    };
  }

  if (reputationPoints >= 50) {
    return {
      type: "discount",
      tooltipLabel: "-25% благодаря Почтению",
      effectiveCost,
      showDualPrice: true,
    };
  }

  return {
    type: "discount",
    tooltipLabel: "-10% благодаря Уважению",
    effectiveCost,
    showDualPrice: true,
  };
}

export function formatReputationStatus(points: number): string {
  return getReputationLevel(points);
}
