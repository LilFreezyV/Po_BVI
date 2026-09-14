# Бэкенд «Без Вступительных» (FastAPI)

Контент (темы/задачи/олимпиады/вузы/тарифы) и прогресс пользователя — на реальной БД
вместо хардкода в `src/data/*.js`. ИИ-помощник и оплата в этой версии не реализованы.

## Запуск (Windows, PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Впишите в `.env` строку подключения к облачному Postgres (Neon/Supabase) и случайный
`JWT_SECRET` (например `python -c "import secrets; print(secrets.token_hex(32))"`).

```powershell
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

Дальше — `http://localhost:8000/docs` (Swagger UI). Там же можно зарегистрироваться,
авторизоваться (кнопка Authorize — вставить `access_token` из ответа `/api/auth/login`
или `/api/auth/register`) и вызывать защищённые ручки `/api/progress/*`.

## Структура

- `app/models` — SQLAlchemy 2.0 ORM-модели.
- `app/schemas` — Pydantic-схемы ответов/запросов.
- `app/routers` — эндпоинты, сгруппированные по доменам.
- `app/crud` — запросы к БД, включая агрегацию прогресса на лету по `task_attempts`.
- `alembic/` — миграции схемы.
- `scripts/seed_data.py` + `scripts/seed.py` — перенос контента из `src/data/topics.js`
  и `src/data/site.js` в БД (идемпотентный upsert, не трогает пользователей/прогресс).

## Известные упрощения v1

- Один JWT-токен на 7 дней, без refresh-токенов и подтверждения email.
- Подписка — просто флаг `subscription_active` на пользователе, без реальной оплаты.
- ИИ-помощник не реализован — на фронтенде остаётся мок.
- Фронтенд пока не переключён на этот API (использует статичные `src/data/*.js`) —
  это отдельный следующий этап.
