# Adventurer (искатель)

Таблица: `adventurers` · Модель: `backend/app/models/adventurer.py`

Профиль игрока. Один пользователь = один искатель приключений. Накапливает опыт и золото при завершении [[Quest|квестов]], разблокирует [[Achievement|достижения]], ведёт [[JournalEntry|дневник]].

## Связи

- **Квесты:** [[Quest]] (один ко многим)
- **Достижения:** [[Achievement]] через `AdventurerAchievement`
- **Дневник:** [[JournalEntry]]

## Поля

| Поле | Тип | Назначение |
|------|-----|------------|
| `username` | string(64) | Уникальный логин |
| `display_name` | string(128) | Отображаемое имя в дневнике |
| `experience_points` | int | Накопленный опыт |
| `gold` | int | Накопленное золото |
| `level` | int | Текущий уровень (пересчитывается сервисом) |
| `created_at` | datetime | Дата создания профиля |
| `updated_at` | datetime | Последнее обновление |

## Прогрессия

При завершении [[Quest]] сервис:
1. Записывает `xp_earned` / `gold_earned` в квест
2. Прибавляет значения к `experience_points` и `gold` искателя
3. Проверяет level-up
4. Запускает проверку [[Achievement|достижений]]

Подробнее: [[Economy]].

## См. также

- [[Quest]] — задания искателя
- [[Achievement]] — трофеи
- [[JournalEntry]] — личные записи
- [[QuestLog]]
