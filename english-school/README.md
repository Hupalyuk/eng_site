# English School Platform

React + Node.js застосунок для керування онлайн-школою англійської мови.

## Опис

Проєкт містить публічний сайт, запис на курси, робочий простір класу, блог, авторизацію, заявки викладачів, адмін-панель, керування групами, призначення викладачів, завантаження файлів і синхронізацію з Google Calendar.

## Технології

- React
- Vite
- React Router
- i18next
- Node.js
- Express
- PostgreSQL
- Multer
- Google APIs

## Можливості

- Реєстрація студентів і викладачів
- Вхід і session-based авторизація
- Завантаження документів викладача та підтвердження заявки
- Каталог курсів і заявки на запис
- Автоматичне створення груп за розкладом курсу
- Призначення викладача до групи
- Сторінка класу з викладачем, Meet-посиланням, розкладом, матеріалами та домашніми завданнями
- Підключення Google Calendar і синхронізація розкладу
- Пости в блозі
- Адмін-панель для користувачів, заявок, груп, викладачів, постів і журналу дій

## Встановлення

Встановити залежності frontend:

```bash
npm install
```

Встановити залежності backend:

```bash
cd backend
npm install
```

## Змінні середовища

Frontend `.env`:

```env
VITE_API_BASE=http://localhost:4000
```

Backend `.env`:

```env
PORT=4000
NODE_ENV=development
SESSION_SECRET=
SESSION_COOKIE_NAME=sid
FRONTEND_ORIGIN=http://localhost:5173

PGHOST=localhost
PGUSER=
PGPASSWORD=
PGDATABASE=
PGPORT=5432

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/google/callback
```

## База даних

Запустіть схему з `backend/schema.sql` у PostgreSQL:

```bash
cd backend
psql -d english_school -f schema.sql
```

## Локальний запуск

Запуск backend:

```bash
cd backend
npm run dev
```

Запуск frontend в іншому терміналі:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

Backend:

```text
http://localhost:4000
```

## Скрипти

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

Backend:

```bash
cd backend
npm run dev
npm start
```

## Структура папок

```text
english-school
|-- backend
|   |-- lib
|   |-- middleware
|   |-- routes
|   |-- uploads (local fallback only)
|   |-- db.js
|   |-- schema.sql
|   `-- server.js
|-- src
|   |-- components
|   |-- context
|   |-- data
|   |-- lib
|   |-- pages
|   |-- styles
|   `-- i18n.js
`-- package.json
```

## Ролі

- Студент: записується на курси та переглядає дані призначеного класу
- Викладач: керує призначеними групами, матеріалами, домашніми завданнями, Meet-посиланнями та синхронізацією розкладу
- Адміністратор: керує користувачами, групами, викладачами, заявками, постами блогу та має права викладача на сторінці класу

## Ліцензія

Проєкт створено з навчальною метою.
