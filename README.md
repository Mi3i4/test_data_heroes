# Notification Preferences Service

Единый источник правды по уведомлениям. Сервис отвечает на вопрос:

> **Можно ли отправить данный тип уведомления конкретному пользователю по конкретному каналу в данный момент времени?**

Решение учитывает дефолтные настройки, индивидуальный выбор пользователя, глобальные политики платформы и quiet hours с таймзоной.

## Стек

- **TypeScript**, **Node.js**
- **Fastify** — HTTP-слой и JSON-schema валидация
- **PostgreSQL** (драйвер `pg`)
- **Vitest** — unit + integration тесты
- **Docker Compose** — Postgres + сервис

Зависимости намеренно минимальны: нет ORM (сырой SQL через `pg`), нет библиотеки дат (таймзоны через встроенный `Intl.DateTimeFormat`).

---

## Быстрый старт

### Docker Compose

Поднимает Postgres и сервис, прогоняет миграции и seed-данные на старте.

```bash
docker compose up --build
```

Сервис: `http://localhost:3000`. Postgres проброшен на `5433` (чтобы не конфликтовать с локальным 5432).

Переменные окружения (`.env.example`):

| Переменная    | По умолчанию          | Назначение            |
|---------------|-----------------------|-----------------------|
| `DB_HOST`     | `localhost`           | хост Postgres         |
| `DB_PORT`     | `5433`                | порт Postgres         |
| `DB_USER`     | `postgres`            | пользователь          |
| `DB_PASSWORD` | `postgres`            | пароль                |
| `DB_NAME`     | `notification_prefs`  | база                  |
| `PORT`        | `3000`                | порт HTTP-сервиса     |

---

## Тесты

```bash
npm test                 # все тесты
npm run test:unit        # только доменная логика (без БД)
npm run test:integration # HTTP + реальная БД
```

Интеграционные тесты ходят в **реальный Postgres**, который поднимается через compose и сбрасывают состояние через `TRUNCATE` в `beforeEach`. Unit-тесты `EvaluationEngine` чистые и БД не требуют.

Покрытие соответствует пяти сценариям из задания:
1. Дефолты для нового пользователя
2. Изменение настроек пользователем
3. Quiet hours
4. Глобальные политики
5. Идемпотентность

---

## API

Базовый URL: `http://localhost:3000`.

### `GET /users/:userId/preferences`

Текущие предпочтения пользователя.

```json
{
  "userId": "user-1",
  "preferences": [
    { "notificationType": "marketing_email", "channel": "email", "enabled": false }
  ],
  "quietHours": { "start": "22:00", "end": "08:00", "timezone": "Europe/Berlin" }
}
```

`preferences` — это витрина: по одной записи на каждую известную пару (notificationType, channel) из дефолтов, где `enabled` уже учитывает индивидуальное переопределение пользователя, если оно задано. `quietHours` равен `null`, если не заданы.

### `POST /users/:userId/preferences`

Изменение предпочтений.

```json
{
  "preferences": [
    { "notificationType": "marketing_email", "channel": "email", "enabled": false }
  ],
  "quietHours": { "start": "22:00", "end": "08:00", "timezone": "Europe/Berlin" }
}
```

Ответ: `{ "userId": "user-1", "updated": true }`.

### `POST /evaluate`

Проверка возможности отправки.

```json
{
  "userId": "user-1",
  "notificationType": "marketing_email",
  "channel": "email",
  "region": "EU",
  "datetime": "2026-05-21T21:30:00Z"
}
```

Ответ:

```json
{ "decision": "deny", "reason": "blocked_by_global_policy" }
```

`decision` одно из `allow | deny`. `reason` одно из `blocked_by_global_policy | disabled_by_user | quiet_hours` (или `null` при `allow`).

### `GET /health`

Liveness процесса: `{ "status": "ok" }`. (Готовность к трафику / проверку БД — см. раздел «Дальнейшие шаги».)

---

## Доменная модель

**NotificationType:** `transactional_email`, `marketing_email`, `transactional_sms`, `marketing_sms`, `transactional_push`, `marketing_push`.

**Channel:** `email`, `sms`, `push`. Канал «мессенджеры» из примера в ТЗ сознательно не включён — ни один из пяти обязательных сценариев его не задействует.

**Region:** строковый код (`EU`, `US`, …).

Типы перечислены как `as const`-кортежи в `src/domain/types.ts` и переиспользуются и в TypeScript-типах, и в JSON-schema валидации, и в `CHECK`-ограничениях БД — один источник правды для допустимых значений.

Каждый `notificationType` детерминированно подразумевает ровно один `channel` (`marketing_email` → `email` и т. д.; карта `CHANNEL_BY_TYPE`). Поэтому на входе `/evaluate` и `POST /preferences` пара (type, channel) проверяется на согласованность: несогласованная пара (например `marketing_email` + `push`) отклоняется с `400 validation_error`. Это держит хранилище чистым и исключает расхождение между витриной `GET` и решением `/evaluate`.

### Алгоритм evaluate

Чистая функция `evaluate(input, context)` в `src/domain/evaluationEngine.ts`. Порядок проверок:

1. **Глобальная политика** — если есть запрет на `(notificationType, channel, region)` → `deny: blocked_by_global_policy`. Высший приоритет.
2. **Индивидуальная настройка** — если пользователь явно задал этот `(type, channel)` и `enabled = false` → `deny: disabled_by_user`.
3. **Дефолт** — если индивидуальной настройки нет, берётся дефолт; `enabled = false` → `deny: disabled_by_user`.
4. **Quiet hours** — применяется последним и **только к marketing-типам**. Если время `datetime`, переведённое в таймзону пользователя, попадает в тихий период → `deny: quiet_hours`. Транзакционные уведомления quiet hours не блокируют никогда.
5. Иначе → `allow`.

---

## Архитектура и ключевые решения

Layered architecture, домен не зависит от инфраструктуры:

```
HTTP (Fastify routes + controllers + JSON-schema валидация)
        ↓
Application (PreferencesService — оркестрация репозиториев и движка)
        ↓
Domain (EvaluationEngine — чистые функции, доменные типы)
        ↓
Infrastructure (PostgreSQL-репозитории, логгер, пул соединений)
```

- **`EvaluationEngine` — чистая функция.** Принимает на вход уже собранный контекст (настройки, дефолты, политики, quiet hours), не знает про БД и HTTP. Поэтому бизнес-правила тестируются юнит-тестами без инфраструктуры.
- **Валидация на границе.** Входные данные проверяются JSON-schema (Fastify) + дополнительные проверки datetime/timezone; в домен попадают только корректные значения.
- **Идемпотентность через upsert.** Все операции изменения — `INSERT ... ON CONFLICT DO UPDATE`. Повторы безопасны без дополнительной логики.
- **Кеш справочных данных с TTL.** Дефолты и глобальные политики читаются часто и меняются редко, поэтому кешируются в памяти (`src/infrastructure/ttlCache.ts`) с **TTL = 30 c**.
- **Graceful shutdown.** По `SIGTERM` / `SIGINT` сервис дожидается завершения текущих запросов (`app.close()`) и закрывает пул соединений (`pool.end()`) перед выходом — корректное поведение при rolling-деплое.
- **Структурное логирование.** Каждое изменение настроек и каждое решение `allow`/`deny` логируется в JSON (через логгер Fastify).

---

## Дальнейшие шаги (до продакшена)

**Эксплуатация**

- **Полноценные health.** Сейчас `/health` подтверждает только «процесс жив». Нужно разделить на `/health/live` (liveness) и `/health/ready` (readiness c `SELECT 1` к БД, 503 при недоступности)
- **Явная политика на недоступность БД (fail-open vs fail-closed).** Сейчас при сбое БД `/evaluate` возвращает 500, и вызывающий сервис сам решает, что делать.
- **Retry / backoff подключения к БД на старте.**
- **Redis** если будет несколько инстансов.

**Безопасность**

- **Менеджер секретов.**
- **Аутентификация / авторизация** на эндпоинтах.
- **Rate limiting.**

**Процессы**

- **Изолированная тестовая БД.**
- **Версионируемые миграции** вместо прогона всех `.sql` на каждом старте.

**Метрики**

- **Метрики**: счётчики `allow`/`deny` по reason, латентность `/evaluate`, hit/miss кеша.
- **Спека** для эндпоинтов.
