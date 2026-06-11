# QuestLog Frontend

Next.js + Tailwind CSS + App Router.

## Запуск

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Открой http://localhost:3000 — нужен запущенный бэкенд на :8000.

## Структура

```
src/
├── app/              # App Router (layout, page, globals.css)
├── components/
│   ├── adventurer/   # HeroPanel
│   └── quest/        # QuestCard, QuestList
└── lib/
    ├── api.ts        # запросы к FastAPI
    ├── types.ts      # типы из бэкенда
    └── quest-labels.ts
```
