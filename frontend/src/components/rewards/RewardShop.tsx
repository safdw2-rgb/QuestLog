"use client";

import { FormEvent, useEffect, useState } from "react";

import { JournalSectionTitle } from "@/components/layout/JournalSectionTitle";
import { RewardEditModal } from "@/components/rewards/RewardEditModal";
import { RewardFormFields } from "@/components/rewards/RewardFormFields";
import { RpgIcon } from "@/components/rpg/RpgIcon";
import {
  createReward,
  deleteReward,
  generateRewardAiDescription,
  getRewards,
  purchaseReward,
} from "@/lib/api";
import { getReputationLevel } from "@/lib/faction-reputation";
import {
  getPriceAdjustmentInfo,
  type PriceAdjustmentInfo,
} from "@/lib/reward-pricing";
import { RPG_UI, SYS_ICON, resolveRewardIconSrc } from "@/lib/rpg-assets";
import type { Adventurer, Faction, Reward } from "@/lib/types";

interface RewardShopProps {
  adventurer: Adventurer;
  factions: Faction[];
  editMode: boolean;
  onAdventurerUpdate: (adventurer: Adventurer) => void;
  onEffectsRefresh?: () => void;
}

export function RewardShop({
  adventurer,
  factions,
  editMode,
  onAdventurerUpdate,
  onEffectsRefresh,
}: RewardShopProps) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("50");
  const [factionId, setFactionId] = useState("");

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

  function resetForm() {
    setTitle("");
    setDescription("");
    setCost("50");
    setFactionId("");
    setAiSource(null);
    setFormOpen(false);
  }

  async function handleGenerateAi() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Сначала введите название товара");
      return;
    }

    setGenerating(true);
    setError(null);
    setAiSource(null);

    try {
      const result = await generateRewardAiDescription({
        title: trimmedTitle,
        faction_id: factionId ? Number(factionId) : null,
      });
      setDescription(result.description);
      setAiSource(result.source);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сгенерировать описание",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const created = await createReward({
        title: title.trim(),
        description: description.trim() || null,
        cost: Number(cost),
        faction_id: factionId ? Number(factionId) : null,
      });
      setRewards((prev) =>
        [...prev, created].sort((a, b) => a.cost - b.cost || a.id - b.id),
      );
      setMessage(`Товар «${created.title}» добавлен в магазин.`);
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить товар");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(reward: Reward) {
    const confirmed = window.confirm(`Удалить товар «${reward.title}»?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(reward.id);
    setError(null);
    try {
      await deleteReward(reward.id);
      setRewards((prev) => prev.filter((item) => item.id !== reward.id));
      setMessage(`Товар «${reward.title}» удалён.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось удалить товар");
    } finally {
      setDeletingId(null);
    }
  }

  async function handlePurchase(reward: Reward) {
    if (purchasingId != null) {
      return;
    }

    setError(null);
    setMessage(null);
    setPurchasingId(reward.id);

    try {
      const result = await purchaseReward(reward.id);
      onAdventurerUpdate(result.adventurer);
      setMessage(result.message);
      if (result.active_effect) {
        onEffectsRefresh?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось купить награду");
    } finally {
      setPurchasingId(null);
    }
  }

  function getFactionForReward(reward: Reward): Faction | undefined {
    if (reward.faction_id == null) {
      return undefined;
    }
    return factions.find((faction) => faction.id === reward.faction_id);
  }

  function getPricing(reward: Reward) {
    const faction = getFactionForReward(reward);
    const displayCost = reward.effective_cost ?? reward.cost;
    const adjustment =
      faction != null
        ? getPriceAdjustmentInfo(reward.cost, faction.reputation_points)
        : null;

    return {
      faction,
      displayCost,
      adjustment,
    };
  }

  return (
    <div className="reward-shop-root flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <JournalSectionTitle>Магазин наград</JournalSectionTitle>
          <p className="mt-1 text-sm text-ink-muted">
            Цены зависят от репутации у фракции-поставщика.
          </p>
        </div>
        {editMode && (
          <button
            type="button"
            className="journal-button-primary"
            onClick={() => setFormOpen((prev) => !prev)}
          >
            + Добавить товар
          </button>
        )}
      </div>

      {editMode && formOpen && (
        <form
          className="journal-panel mb-4 space-y-3 p-4"
          onSubmit={handleCreate}
        >
          <h3 className="font-display text-lg text-ink">Новый товар</h3>
          <RewardFormFields
            title={title}
            description={description}
            cost={cost}
            factionId={factionId}
            factions={factions}
            generating={generating}
            aiSource={aiSource}
            disabled={submitting}
            onTitleChange={(value) => {
              setAiSource(null);
              setTitle(value);
            }}
            onDescriptionChange={setDescription}
            onCostChange={setCost}
            onFactionChange={setFactionId}
            onGenerateAi={handleGenerateAi}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="journal-button-primary"
              disabled={submitting}
            >
              {submitting ? "Сохраняем..." : "Создать товар"}
            </button>
            <button
              type="button"
              className="journal-button-secondary"
              onClick={resetForm}
              disabled={submitting}
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="reward-shop-wallet mb-4 px-0 py-1">
        <p className="text-xs uppercase tracking-wide text-ink-muted">
          Ваш кошелёк
        </p>
        <p className="font-display text-2xl text-ink">
          <span className="inline-flex items-center gap-1.5">
            {adventurer.gold}
            <RpgIcon
              src={RPG_UI.goldBag}
              fallbackEmoji="🪙"
              alt=""
              className="inline-block h-5 w-5 shrink-0 align-middle object-contain"
            />
          </span>
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
      ) : rewards.length === 0 ? (
        <div className="border border-dashed border-[#3a2214]/20 p-8 text-center text-[#4a3224]">
          Магазин пуст. {editMode ? "Добавьте первый товар." : ""}
        </div>
      ) : (
        <div className="reward-shop-list-scroll rpg-fantasy-vscroll min-h-0 flex-1 overflow-y-auto">
          <ul className="flex flex-col gap-4">
            {rewards.map((reward) => {
              const { faction, displayCost, adjustment } = getPricing(reward);
              const canAfford = adventurer.gold >= displayCost;
              const isBuying = purchasingId === reward.id;
              const isDeleting = deletingId === reward.id;
              const showDualPrice = adjustment?.showDualPrice ?? false;

              return (
                <li key={reward.id} className="reward-shop-scroll reward-shop-card">
                  <div className="flex w-full flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between lg:h-full lg:gap-3 lg:px-14 lg:pt-8 lg:pb-7">
                    <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                      {/* Icon */}
                      <span
                        className="reward-shop-icon-slot shrink-0"
                        aria-hidden
                      >
                        <RpgIcon
                          src={resolveRewardIconSrc(displayCost, reward.id)}
                          fallbackEmoji={reward.icon}
                          alt=""
                          className="inline-block h-9 w-9 shrink-0 object-contain"
                          fallbackClassName="text-2xl leading-none"
                        />
                      </span>

                      {/* Title + description + faction */}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 lg:h-full lg:justify-between">
                        <h3 className="font-display text-base leading-snug text-[#2c1810] sm:truncate">
                          {reward.title}
                        </h3>

                        {reward.description ? (
                          <div className="reward-shop-desc-scroll rpg-fantasy-vscroll-sm my-0.5 lg:min-h-0 lg:flex-1">
                            <p className="text-sm leading-snug text-[#4a3224]">
                              {reward.description}
                            </p>
                          </div>
                        ) : (
                          <div className="my-0.5 hidden lg:block lg:min-h-0 lg:flex-1" />
                        )}

                        {faction ? (
                          <p className="text-[11px] text-[#4a3224]/75 sm:truncate">
                            {faction.icon ? `${faction.icon} ` : ""}
                            {faction.name} ·{" "}
                            {getReputationLevel(faction.reputation_points)}
                          </p>
                        ) : (
                          <span className="hidden h-[14px] lg:block" aria-hidden />
                        )}
                      </div>
                    </div>

                    {/* Price + buy */}
                    <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5 sm:pl-1">
                      {editMode && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="journal-button-secondary px-2 py-1 text-xs"
                            onClick={() => setEditingReward(reward)}
                            aria-label="Редактировать"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="journal-button-secondary px-2 py-1 text-xs"
                            onClick={() => handleDelete(reward)}
                            disabled={isDeleting}
                            aria-label="Удалить"
                          >
                            {isDeleting ? (
                              "…"
                            ) : (
                              <img
                                src={SYS_ICON.trash}
                                alt=""
                                width={16}
                                height={16}
                                style={{
                                  imageRendering: "pixelated",
                                  display: "block",
                                }}
                              />
                            )}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 font-semibold text-[#8a6200]"
                          style={{ fontSize: "0.95rem" }}
                        >
                          {showDualPrice ? (
                            <>
                              <span className="text-sm line-through opacity-50">
                                <GoldPrice amount={reward.cost} />
                              </span>
                              <GoldPrice amount={displayCost} />
                            </>
                          ) : (
                            <GoldPrice amount={displayCost} />
                          )}
                        </span>
                        {adjustment && (
                          <PriceAdjustmentTooltip adjustment={adjustment} />
                        )}
                      </div>

                      <button
                        type="button"
                        className="rpg-game-button rpg-game-button-buy"
                        onClick={() => handlePurchase(reward)}
                        disabled={!canAfford || isBuying}
                        title={
                          !canAfford
                            ? `Нужно ${displayCost} золота, у вас ${adventurer.gold}`
                            : undefined
                        }
                      >
                        {isBuying ? "Покупаем..." : "🪙 Купить"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <RewardEditModal
        open={editingReward != null}
        reward={editingReward}
        factions={factions}
        onClose={() => setEditingReward(null)}
        onUpdated={(updated) => {
          setRewards((prev) =>
            prev
              .map((item) => (item.id === updated.id ? updated : item))
              .sort((a, b) => a.cost - b.cost || a.id - b.id),
          );
          setEditingReward(null);
          setMessage(`Товар «${updated.title}» обновлён.`);
        }}
      />
    </div>
  );
}

function GoldPrice({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {amount}
      <RpgIcon
        src={RPG_UI.goldBag}
        fallbackEmoji="🪙"
        alt=""
        className="inline-block h-5 w-5 shrink-0 align-middle object-contain"
      />
    </span>
  );
}

function PriceAdjustmentTooltip({
  adjustment,
}: {
  adjustment: PriceAdjustmentInfo;
}) {
  const isMarkup = adjustment.type === "markup";

  return (
    <span className="reward-price-tooltip">
      <button
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm opacity-90 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        aria-label={adjustment.tooltipLabel}
      >
        <img
          src={SYS_ICON.alertFill}
          alt=""
          width={16}
          height={16}
          className="object-contain"
          style={{ imageRendering: "pixelated" }}
        />
      </button>
      <span
        className={`reward-price-tooltip-popover ${
          isMarkup
            ? "reward-price-tooltip-popover-markup"
            : "reward-price-tooltip-popover-discount"
        }`}
        role="tooltip"
      >
        {adjustment.tooltipLabel}
      </span>
    </span>
  );
}
