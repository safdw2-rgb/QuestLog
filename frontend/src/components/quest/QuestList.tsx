import type { Quest } from "@/lib/types";
import { QuestCard } from "@/components/quest/QuestCard";

interface QuestListProps {
  quests: Quest[];
  emptyMessage?: string;
}

export function QuestList({
  quests,
  emptyMessage = "В дневнике пока нет квестов. Время отправиться в путь!",
}: QuestListProps) {
  if (quests.length === 0) {
    return (
      <div className="journal-panel p-8 text-center">
        <p className="font-display text-lg text-ink-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {quests.map((quest) => (
        <li key={quest.id}>
          <QuestCard quest={quest} />
        </li>
      ))}
    </ul>
  );
}
