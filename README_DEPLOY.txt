KP Master v26 — установка

1) Supabase
- Открой Supabase SQL Editor.
- Запусти файл supabase_clean_from_zero.sql.
- Перед запуском замени ADMIN-KP-MASTER-CHANGE-ME на новый рабочий админ-ключ.
- Внимание: SQL удаляет старые таблицы KP Master и создаёт чистую схему с нуля.

2) Приложение
- Загрузи файлы из архива в рабочий репозиторий сайта.
- В app.js уже оставлены рабочие Supabase URL и publishable key из kp-master-main.zip.
- Привязка ключа к браузеру/устройству не менялась.

3) Cloudflare Worker бот
- Используй файл cloudflare-worker.js.
- В Cloudflare Worker должны быть переменные:
  BOT_TOKEN
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
- bot.py оставлен из старого архива, но для Cloudflare Worker не нужен.

4) Проверка
- Сначала создай/замени админ-ключ в SQL.
- Войди на сайт по админ-ключу.
- Проверь: настройки, КП, документы, график, сохранение выезда, удаление выезда.
