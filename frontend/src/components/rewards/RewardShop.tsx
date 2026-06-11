"use client";

import { useEffect, useState } from "react";

import { getRewards, purchaseReward } from "@/lib/api";
import type { Adventurer, Reward } from "@/lib/types";

interface RewardShopProps {
  adventurer: Adventurer;
  adventurerId?: number;
  onAdventurerUpdate: (adventurer: Adventurer) => void;
}

export function RewardShop({
  adventurer,
  adventurerId = 1,
  onAdventurerUpdate,
}: RewardShopProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const items = await getRewards();
        if (!cancelled) {
          setRewards(items);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Не удалось загрузить магазин",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePurchase(reward: Reward) {
    if (purchasingId != null) {
      return;
    }

    setError(null);
    setMessage(null);
    setPurchasingId(reward.id);

    try {
      const result = await purchaseReward(reward.id, adventurerId);
      onAdventurerUpdate(result.adventurer);
      setMessage(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось купить награду");
    } finally {
      setPurchasingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-2xl text-ink">Магазин наград</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Обменяй заработанное золото на заслуженные призы.
        </p>
      </div>

      <div className="reward-shop-wallet journal-panel mb-4 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-ink-muted">
          Ваш кошелёк
        </p>
        <p className="font-display text-2xl text-ink">
          {adventurer.gold} <span className="text-lg">🪙</span>
        </p>
      </div>

      {message && (
        <p className="mb-3 rounded-lg border border-emerald-300/50 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg border border-rose-300/50 bg-rose-50/80 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Загружаем сокровища...</p>
      ) : (
        <ul className="reward-shop-grid grid gap-3 sm:grid-cols-2">
          {rewards.map((reward) => {
            const canAfford = adventurer.gold >= reward.cost;
            const isBuying = purchasingId === reward.id;

            return (
              <li key={reward.id}>
                <article className="reward-shop-card journal-panel flex h-full flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="reward-shop-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-2xl"
                      aria-hidden
                    >
                      {reward.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base leading-snug text-ink">
                        {reward.title}
                      </h3>
                      {reward.description && (
                        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                          {reward.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="reward-shop-footer mt-4 flex items-center justify-between gap-3 border-t border-ink/10 pt-3">
                    <p className="text-sm font-semibold text-gold">
                      {reward.cost} 🪙
                    </p>
                    <button
                      type="button"
                      className="journal-button-primary text-xs"
                      onClick={() => handlePurchase(reward)}
                      disabled={!canAfford || isBuying}
                      title={
                        !canAfford
                          ? `Нужно ${reward.cost} золота, у вас ${adventurer.gold}`
                          : undefined
                      }
                    >
                      {isBuying ? "Покупаем..." : "Купить"}
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
