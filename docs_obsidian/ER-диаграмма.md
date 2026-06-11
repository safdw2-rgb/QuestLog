# ER-диаграмма

Связи между таблицами QuestLog. Подробности по сущностям — в отдельных страницах справочника.

## Диаграмма

```mermaid
erDiagram
    ADVENTURER ||--o{ QUEST : owns
    ADVENTURER ||--o{ ADVENTURER_ACHIEVEMENT : unlocks
    ADVENTURER ||--o{ JOURNAL_ENTRY : writes

    FACTION ||--o{ QUEST : categorizes
    LOCATION ||--o{ QUEST : pins

    QUEST ||--o{ QUEST_STEP : contains
    QUEST ||--o{ JOURNAL_ENTRY : narrates
    QUEST ||--o{ QUEST : "parent chain"

    ACHIEVEMENT ||--o{ ADVENTURER_ACHIEVEMENT : granted_to

    ADVENTURER {
        int id PK
        string username
        string display_name
        int experience_points
        int gold
        int level
    }

    QUEST {
        int id PK
        int adventurer_id FK
        int faction_id FK
        int location_id FK
        int parent_quest_id FK
        string title
        text description
        enum quest_type
        enum status
        enum difficulty
        int xp_reward
        int gold_reward
        int xp_earned
        int gold_earned
        datetime deadline
        datetime completed_at
        datetime failed_at
        text fail_reason
    }

    QUEST_STEP {
        int id PK
        int quest_id FK
        string title
        enum status
        int sort_order
        bool is_optional
        int xp_reward
    }

    ACHIEVEMENT {
        int id PK
        string code
        string title
        enum rarity
        enum condition_type
        jsonb condition_payload
        int xp_reward
        int gold_reward
    }
```

## Навигация по сущностям

| Таблица | Wiki-страница |
|---------|---------------|
| `adventurers` | [[Adventurer]] |
| `quests` | [[Quest]] |
| `quest_steps` | [[QuestStep]] |
| `factions` | [[Faction]] |
| `locations` | [[Location]] |
| `achievements` | [[Achievement]] |
| `adventurer_achievements` | [[Achievement#AdventurerAchievement — факт разблокировки]] |
| `journal_entries` | [[JournalEntry]] |

## См. также

- [[QuestLog]] — оглавление справочника
- [[Economy]] — сквозная логика наград
