# Achievement (достижение)

Таблицы: `achievements`, `adventurer_achievements` · Модель: `backend/app/models/achievement.py`

Шаблон достижения с условием разблокировки. При выполнении условия создаётся запись в `adventurer_achievements`, связывающая [[Achievement]] с [[Adventurer|искателем]].

## Связи

- **Кто разблокировал:** [[Adventurer]] через `AdventurerAchievement`
- **Триггеры:** завершение [[Quest|квестов]], накопление [[Economy|XP/золота]], серии (streak), квесты [[Faction|фракции]]

## Achievement — поля шаблона

| Поле | Тип | Назначение |
|------|-----|------------|
| `code` | string(64) | Уникальный slug для логики (`boss_slayer`, `streak_7`) |
| `title` | string(128) | Название достижения |
| `description` | text | Описание для дневника |
| `icon` | string(32) | Иконка |
| `rarity` | enum | `common` → `legendary` |
| `condition_type` | enum | Тип условия — см. ниже |
| `condition_payload` | JSONB | Параметры условия |
| `xp_reward` | int | Бонусный опыт при разблокировке |
| `gold_reward` | int | Бонусное золото при разблокировке |
| `is_secret` | bool | Скрыто до разблокировки |

## Редкость (`rarity`)

`common` · `uncommon` · `rare` · `epic` · `legendary`

## Типы условий (`condition_type`)

| Значение | Что проверяет |
|----------|---------------|
| `quests_completed` | Количество завершённых [[Quest\|квестов]] |
| `quests_failed` | Количество проваленных квестов |
| `streak_days` | Серия дней с активностью |
| `boss_defeated` | Победа над квестом типа `boss` |
| `gold_earned` | Накопленное золото — см. [[Economy]] |
| `xp_earned` | Накопленный опыт |
| `faction_quests` | N квестов одной [[Faction\|фракции]] |
| `deadline_hero` | N квестов выполнено до дедлайна |

## Примеры `condition_payload`

```json
{"count": 10}
```

```json
{"faction_slug": "health", "count": 5}
```

```json
{"streak_days": 7}
```

## AdventurerAchievement — факт разблокировки

| Поле | Назначение |
|------|------------|
| `adventurer_id` | Ссылка на [[Adventurer]] |
| `achievement_id` | Ссылка на [[Achievement]] |
| `unlocked_at` | Время разблокировки |

Уникальная пара `(adventurer_id, achievement_id)` — достижение выдаётся один раз.

## Примеры достижений

| code | Условие | Связь с игрой |
|------|---------|---------------|
| `first_quest` | `quests_completed`, count: 1 | Первый [[Quest]] |
| `boss_slayer` | `boss_defeated`, count: 1 | Квест типа `boss` |
| `night_owl` | `streak_days`, count: 7 | 7 дней подряд |
| `healer_path` | `faction_quests`, slug: health | 5 квестов фракции «Здоровье» |

## См. также

- [[Adventurer]] — получатель наград и XP
- [[Quest]] — источник большинства триггеров
- [[Faction]] — достижения по фракциям
- [[Economy]] — бонусные награды при разблокировке
- [[QuestLog]]
