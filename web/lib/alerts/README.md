# lib/alerts

Learners create, list, pause (`PATCH` with `active: false`), and delete their own
subscriptions through `/api/subscriptions`. Matching uses any keyword plus the
optional location and job type. Telegram is the default channel.

`GET /api/cron/alerts` requires `Authorization: Bearer $CRON_SECRET`. Vercel runs
it every 15 minutes. The persisted cursor and unique subscription/job delivery
key prevent duplicate sends; failed sends retry up to three times. Telegram
delivery uses the Bot API. SMS is disabled unless `SMS_ENABLED=true`; replace
the SMS sender adapter when a gateway is selected.
