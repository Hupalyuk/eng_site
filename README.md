# English School Platform

Full-stack вебплатформа для онлайн-школи англійської мови. Застосунок об'єднує публічні сторінки курсів, реєстрацію студентів, заявки викладачів, керування групами, навчальні матеріали, домашні завдання, блог і інтеграцію з Google Calendar.

## Огляд

English School Platform допомагає онлайн-школі керувати навчальним процесом: від перегляду курсів до запланованих занять. Студенти можуть переглядати курси, подавати заявки на навчання та відкривати свою сторінку класу. Викладачі й адміністратори можуть керувати посиланнями на заняття, матеріалами, домашніми завданнями та розкладом. Адміністратори також мають панель для користувачів, груп, заявок викладачів, записів на курси, постів і журналу дій.

## Можливості

- Авторизація з ролями студента, викладача та адміністратора
- Реєстрація і вхід для студентів
- Реєстрація викладачів із завантаженням документів та підтвердженням адміністратором
- Каталог курсів із заявками на запис
- Автоматичний підбір або створення групи за курсом, днями й часом
- Прив'язка викладача до групи
- Сторінка класу з призначеним викладачем, Google Meet, розкладом, матеріалами та домашніми завданнями
- Підключення Google Calendar і синхронізація розкладу
- Блог зі створенням, редагуванням і видаленням постів
- Адмін-панель для користувачів, заявок, груп, викладачів, постів і журналу дій
- Збереження сесій і даних у PostgreSQL
- Інтерфейс українською та англійською мовами

## Технології

**Frontend**

- React
- Vite
- React Router
- i18next / react-i18next
- CSS

**Backend**

- Node.js
- Express
- PostgreSQL
- express-session + connect-pg-simple
- Multer для завантаження файлів
- Google APIs
- Helmet і CORS

## Структура проєкту

```text
.
|-- README.md
`-- english-school
    |-- src
    |   |-- components
    |   |-- context
    |   |-- data
    |   |-- lib
    |   |-- pages
    |   |-- styles
    |   `-- i18n.js
    |-- backend
    |   |-- middleware
    |   |-- routes
    |   |-- uploads
    |   |-- db.js
    |   |-- schema.sql
    |   `-- server.js
    |-- package.json
    `-- vite.config.js
```

## Запуск проєкту

### Передумови

- Node.js
- npm
- PostgreSQL
- Облікові дані Google Cloud OAuth, якщо потрібна синхронізація з Google Calendar

### 1. Клонування репозиторію

```bash
git clone <your-repository-url>
cd eng_site/english-school
```

### 2. Встановлення залежностей frontend

```bash
npm install
```

### 3. Встановлення залежностей backend

```bash
cd backend
npm install
```

### 4. Налаштування змінних середовища

Створіть `english-school/.env`:

```env
VITE_API_BASE=http://localhost:4000
```

Створіть `english-school/backend/.env`:

```env
PORT=4000
NODE_ENV=development
SESSION_SECRET=change-me
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

Для Supabase або іншого хостингу PostgreSQL можна використовувати `DATABASE_URL` і `PGSSLMODE=require`.

### 5. Підготовка бази даних

Запустіть SQL-схему з `english-school/backend/schema.sql` у PostgreSQL.

```bash
cd backend
psql -d english_school -f schema.sql
```

### 6. Запуск backend

```bash
cd english-school/backend
npm run dev
```

Backend буде доступний за адресою:

```text
http://localhost:4000
```

### 7. Запуск frontend

Відкрийте другий термінал:

```bash
cd english-school
npm run dev
```

Frontend буде доступний за адресою:

```text
http://localhost:5173
```

## Доступні скрипти

Frontend:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

Backend:

```bash
npm run dev
npm start
```

## Основні сторінки

- `/` - головна сторінка
- `/courses` - каталог курсів
- `/courses/:courseId/enroll` - запис на курс
- `/class` - робочий простір класу для студента, викладача або адміністратора
- `/blog` - стрічка блогу
- `/blog/create` - створення поста
- `/login` - вхід
- `/register` - реєстрація
- `/admin/users` - адмін-панель

## Ролі

**Студент**

- Переглядає курси
- Подає заявки на запис
- Отримує доступ до класу після підтвердження
- Переглядає матеріали, домашні завдання, розклад і Meet-посилання

**Викладач**

- Має доступ до призначених груп
- Оновлює Meet-посилання
- Завантажує та видаляє матеріали класу
- Завантажує та видаляє домашні завдання
- Синхронізує розклад із Google Calendar

**Адміністратор**

- Має права викладача для інструментів класу
- Керує користувачами та блокуванням акаунтів
- Підтверджує або відхиляє заявки викладачів
- Керує заявками на курси
- Створює, редагує та видаляє групи, призначає викладачів
- Модерує пости блогу
- Переглядає журнал дій

## Основні API

- `POST /api/auth/register`
- `POST /api/auth/register-teacher`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/enrollments`
- `GET /api/class/next`
- `GET /api/class/groups`
- `GET /api/class/schedule`
- `POST /api/class/schedule/sync`
- `GET /api/google/connect`
- `GET /api/admin/groups`
- `PATCH /api/admin/groups/:id`

## Примітки

- Сесії зберігаються в PostgreSQL.
- Завантажені файли зберігаються в `backend/uploads`.
- Синхронізація з Google Calendar потребує OAuth-налаштувань.
- Для production з окремими доменами frontend/backend налаштуйте secure cookies:

```env
SESSION_SAME_SITE=none
SESSION_SECURE=true
```

## Автор

Проєкт створено як full-stack систему керування онлайн-школою англійської мови.
