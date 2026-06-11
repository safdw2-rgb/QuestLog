# QuestLog — схема данных

RPG-задачник: квесты, этапы, карта, дневник и достижения.

## ER-диаграмма

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

## Сущности

### Adventurer (искатель)

Профиль игрока. Накапливает **XP** и **золото** при завершении квестов.
**Уровень** хранится явно; пересчитывается сервисом при начислении опыта.

### Faction (фракция)

Категория квестов: «Работа», «Здоровье», «Дом». Используется в фильтрах дневника
и в достижениях вида «5 квестов фракции Здоровье».

### Location (локация)

Точка на карте: координаты, адрес, RPG-тип места (`tavern`, `dungeon`, `stronghold`…).
Квест может быть без локации — тогда он не попадает на карту.

### Quest (квест)

| Поле | Назначение |
|------|------------|
| `quest_type` | main / side / daily / bounty / exploration / boss |
| `status` | active / completed / failed / deferred / abandoned |
| `difficulty` | trivial → legendary, влияет на базовые награды |
| `xp_reward`, `gold_reward` | плановая награда при создании |
| `xp_earned`, `gold_earned` | фактически начислено (при провале может быть 0 или частично) |
| `deadline` | обязателен для типа `bounty`, опционален для остальных |
| `parent_quest_id` | цепочки квестов (главный квест → подквесты) |
| `fail_reason` | текст при статусе `failed` — остаётся в дневнике |

**Переходы статусов:**

```
active ──► completed
   │           │
   ├──► failed │
   ├──► deferred
   └──► abandoned
```

Проваленные квесты **не удаляются** — видны в дневнике с печатью «Провалено».

### QuestStep (этап)

Подзадача внутри квеста. Статусы: `pending`, `completed`, `skipped`.
Опциональные этапы (`is_optional`) не блокируют завершение квеста.
Частичный XP за этапы можно суммировать при завершении.

### Achievement (достижение)

Шаблон с условием (`condition_type` + `condition_payload` в JSONB).
Примеры payload:

```json
{"count": 10}
{"faction_slug": "health", "count": 5}
{"streak_days": 7}
```

Секретные достижения (`is_secret`) скрыты до разблокировки.

### JournalEntry (запись дневника)

Свободный текст: прогресс, итог, причина провала, лор от игрока.
Может быть привязана к квесту или существовать отдельно (`quest_id = null`).

## Типы квестов

| Тип | RPG-смысл | Особенности |
|-----|-----------|-------------|
| `main` | Главный сюжет | Высокие награды, может иметь дочерние квесты |
| `side` | Побочное | Стандартный квест |
| `daily` | Ежедневный ритуал | Сбрасывается / создаётся заново по расписанию (логика в сервисе) |
| `bounty` | Контракт | Ожидается `deadline`; провал по истечении срока |
| `exploration` | Исследование | Новая территория, часто с `location` |
| `boss` | Босс-файт | Высокая сложность, триггер достижений |

## Награды и экономика

1. При создании квеста задаются `xp_reward` и `gold_reward` (можно вычислять из `difficulty` + `quest_type`).
2. При `completed` сервис пишет `xp_earned` / `gold_earned`, прибавляет к Adventurer, проверяет level-up.
3. При `failed` награда обычно 0; допустим частичный XP за выполненные этапы — на усмотрение геймдизайна.
4. Достижения дают дополнительный XP/золото при разблокировке.

## Индексы

Квесты индексируются по `adventurer_id`, `status`, `quest_type`, `faction_id`, `location_id`, `deadline` —
для быстрых выборок «активные», «просроченные bounty», «квесты на карте».
