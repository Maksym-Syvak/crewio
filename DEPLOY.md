# Деплой Crewio

## Архітектура

| Компонент | Платформа | URL (після деплою) |
|-----------|-----------|-------------------|
| Frontend (Mini App) | **Vercel** | `https://*.vercel.app` |
| Backend (NestJS API) | **Render** | `https://crewio-api.onrender.com` |
| PostgreSQL | **Render** (free) | internal |

---

## Крок 1 — GitHub репозиторій

```bash
cd restaurant-shifts-backend   # корінь монорепо (папка з render.yaml)
git init
git add .
git commit -m "Initial Crewio monorepo"
```

Створіть репозиторій на GitHub і запуште:

```bash
git remote add origin https://github.com/YOUR_USER/crewio.git
git branch -M main
git push -u origin main
```

---

## Крок 2 — Backend на Render

1. Зайдіть на [render.com](https://render.com) → **New** → **Blueprint**
2. Підключіть GitHub-репозиторій
3. Render знайде `render.yaml` і створить **crewio-api** + **crewio-db**
4. Після створення сервісу додайте змінні вручну:

| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | ваш токен від @BotFather |
| `FRONTEND_URL` | URL з Vercel (крок 3) |

5. Дочекайтесь деплою → перевірте: `https://YOUR-API.onrender.com/health`

> Free tier на Render «засинає» після 15 хв без активності — перший запит може зайняти ~30 сек.

---

## Крок 3 — Frontend на Vercel

### Варіант A — через CLI (швидко)

```bash
cd restaurant-shifts-frontend
npx vercel login
npx vercel --prod
```

При деплої вкажіть **Environment Variable**:

```
VITE_API_URL=https://YOUR-API.onrender.com
VITE_WS_URL=https://YOUR-API.onrender.com
```

### Варіант B — через GitHub

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import репозиторій, **Root Directory** = `restaurant-shifts-frontend`
3. Framework: **Vite**
4. Environment Variables (Production):
   - `VITE_API_URL` = URL Render API
   - `VITE_WS_URL` = URL Render API
5. Deploy

---

## Крок 4 — Telegram Bot (Mini App)

1. Відкрийте [@BotFather](https://t.me/BotFather)
2. `/mybots` → **@Crewiostaffbot** → **Bot Settings** → **Menu Button**
3. Вкажіть URL: `https://YOUR-FRONTEND.vercel.app`
4. Або: `/setmenubutton` → оберіть бота → URL Mini App

5. Оновіть на Render:
   ```
   FRONTEND_URL=https://YOUR-FRONTEND.vercel.app
   ```

---

## Перевірка

- [ ] `GET /health` → `{ "ok": true }`
- [ ] `GET /docs` → Swagger
- [ ] Frontend відкривається в браузері
- [ ] Mini App відкривається в Telegram
- [ ] Логін через Telegram працює

---

## Локальний preview через ngrok (альтернатива)

Якщо потрібно швидко протестувати в Telegram без деплою:

```bash
# Термінал 1 — backend
cd restaurant-shifts-backend && npm run start:dev

# Термінал 2 — frontend  
cd restaurant-shifts-frontend && npm run dev

# Термінал 3 — тунель для frontend
npx ngrok http 5173
```

URL ngrok вставте в BotFather як Mini App URL, а в `.env` frontend:
```
VITE_API_URL=http://localhost:3000
```

(Для Telegram потрібен HTTPS — ngrok дає його автоматично.)
