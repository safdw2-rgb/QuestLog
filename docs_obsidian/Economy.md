# Economy (награды и экономика)

Сквозная логика XP, золота и уровня. Затрагивает [[Adventurer]], [[Quest]], [[QuestStep]] и [[Achievement]].

## Два слоя наград в [[Quest]]

| Поле | Когда задаётся | Смысл |
|------|----------------|-------|
| `xp_reward`, `gold_reward` | При создании квеста | Плановая награда |
| `xp_earned`, `gold_earned` | При завершении / провале | Фактически начислено |

Плановую награду можно вычислять из `difficulty` + `quest_type` при создании.

## Поток при `completed`

1. Сервис записывает `xp_earned` и `gold_earned` в [[Quest]]
2. Значения прибавляются к `experience_points` и `gold` [[Adventurer|искателя]]
3. Пересчитывается `level`
4. Проверяются [[Achievement|достижения]] (`quests_completed`, `xp_earned`, `gold_earned`…)
5. Создаётся [[JournalEntry]] типа `completion`

## Поток при `failed`

- `xp_earned` / `gold_earned` обычно **0**
- Допустим **частичный XP** за выполненные [[QuestStep|этапы]] — решение геймдизайна
- Создаётся [[JournalEntry]] типа `failure`
- Могут сработать достижения вроде `quests_failed`

## Частичный XP за этапы

Каждый [[QuestStep]] имеет поле `xp_reward`. При завершении квеста сервис может:
- Начислить полную награду квеста (`xp_reward`)
- Или суммировать XP только выполненных этапов (особенно при `failed`)

## Награды от достижений

При разблокировке [[Achievement]]:
- `xp_reward` и `gold_reward` из шаблона достижения
- Прибавляются к [[Adventurer]] так же, как награды за квесты

## См. также

- [[Quest]] — источник основных наград
- [[QuestStep]] — частичный XP
- [[Achievement]] — бонусные награды
- [[Adventurer]] — баланс игрока
- [[QuestLog]]
