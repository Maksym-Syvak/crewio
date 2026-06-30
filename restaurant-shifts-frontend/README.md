# Crewio — Frontend (Telegram Mini App)

React-клієнт для системи управління змінами персоналу HoReCa.

## Стек

- React 19 + TypeScript + Vite
- Telegram Mini App SDK
- React Router, Zustand, Axios, Socket.io-client
- Tailwind CSS, React Hook Form + Zod

## Швидкий старт

```bash
# 1. Запустити backend (в сусідній папці)
cd ../restaurant-shifts-backend
npm run start:dev

# 2. Запустити frontend
cd ../restaurant-shifts-frontend
cp .env.example .env
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Swagger: http://localhost:3000/docs

## Авторизація

**У Telegram:** автоматичний логін через `initData` → `POST /auth/login`.

**Локально (браузер):** на splash-екрані натисніть «Увійти (dev)» — використовує `POST /auth/dev-login` (тільки `NODE_ENV=development` на backend).

## Підключення до Telegram Bot

1. Задеплойте frontend (Vercel/Netlify) або використайте ngrok для локального тесту.
2. У [@BotFather](https://t.me/BotFather) → ваш бот → **Bot Settings** → **Menu Button** / **Web App** → URL вашого frontend.
3. У backend `.env` вкажіть `FRONTEND_URL=https://your-app-url`.

## Структура

```
src/
  api/          # Axios + REST endpoints
  components/   # UI-компоненти
  pages/        # Екрани за ТЗ
  store/        # Zustand (auth, shifts, notifications, toasts)
  layouts/      # AppLayout + BottomNav
  sockets/      # Socket.io /events
  services/     # Telegram WebApp init
  types/        # TypeScript типи (синхронізовані з backend)
  utils/
```

## API endpoints

| Модуль | Prefix |
|--------|--------|
| Auth | `/auth` |
| Restaurants | `/restaurants` |
| Employees | `/employees` |
| Positions | `/positions` |
| Shifts | `/shifts` |
| Replacements | `/replacement` |
| Notifications | `/notifications` |
| Statistics | `/statistics` |

WebSocket: `ws://localhost:3000/events`
