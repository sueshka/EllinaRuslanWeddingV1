# Приглашение Руслан & Эллина · «Вечер при свечах»

Мобильное приглашение на 26.12.2026. Vite + React + TypeScript, без UI-библиотек.
Свеча → вспышка → обложка с фото пары → письмо и три зимы → детали дня → ответ гостя.

## Запуск

```bash
npm install
npm run dev       # http://localhost:5173 (и адрес в локальной сети — открыть с телефона)
npm run build     # статическая сборка в dist/ — деплой на Vercel / Netlify / любой хостинг
```

## Структура

- `src/CandlesEvening.tsx` — сцены приглашения, «камера», страницы с прокруткой
- `src/RsvpForm.tsx` — форма ответа (валидация имени, отправка/ошибка/«Спасибо»)
- `src/rsvp.ts` — отправка ответа и сохранение в localStorage
- `src/event.ts` — маршруты (Google Maps → Яндекс Карты) и «В календарь» (iPhone — .ics, Android — Google Календарь)
- `public/calendar/*.ics` — события для календаря на iPhone/Mac (если меняется время или адрес — поправить и здесь, и в `src/event.ts`)
- `src/nav.ts` — свайп / колесо / тачпад и prefers-reduced-motion
- `src/audio.ts` — фоновая песня `src/assets/misc/music.MP3` (с первого нажатия, по кругу) и звук свечи `candle_sound.MP3`
- `src/assets/` — фото пары (`couple.jpg`, `proposal.jpg`, `family.jpg`), `src/assets/candles/` — атмосферные фото-моки

## Что сделать перед отправкой гостям

1. **Сбор ответов**: задать `VITE_RSVP_ENDPOINT` в `.env` (см. `.env.example`). Тело запроса:
   `{ name, attend: 'both'|'ceremony'|'dinner'|'no', token, submittedAt }`.
   Подходит Google Apps Script (`doPost` → запись строки в таблицу), Supabase Edge Function и т. п.
   Пока адрес не задан, отправка только имитируется.
2. **Музыка**: песня ≈6.9 МБ — для мобильного интернета её стоит ужать до ~3 МБ (отрезок или 96 kbps).

Личная ссылка: `/?g=<token>` — токен прикладывается к ответу, чтобы связать его с гостем.
