# Telegram daily pricing panel

Base: `main` at `9680dbc811fbfa9b498a9609e4d9ddaa4a13b076`.
Requires the companion CarShow Telegram daily pricing API and migration.

The existing Telegram channel page now polls real persisted observations, daily history and calculation state.
It shows source links, original currency amount, normalized toman amount, car ID, publication day,
match status/reason and calculation failures. Observation status filters and page controls use the backend.
Daily history supports a car ID filter and 100-row pagination and displays sample count, last successful
calculation and final/open state. API errors remain visible; empty responses do not imply a completed import.

The existing car management table displays calculated MarketPrice, PriceDay, valid sample count
and calculation timestamp for both new and used cars. AdminService and car image URLs now use
the selected environment, fixing the pre-existing localhost API / fixed production-image mismatch.
The existing public car list/details already use MarketPrice and automatically consume updated values.
No site-crawler controls existed in this base; Telegram collection and retry controls remain.

No credentials, mocks or hardcoded success data were added to production.
The new services use the same existing JWT interceptor. After refresh/re-entry, state comes from API/SQL.
UTC values are interpreted explicitly before displaying Tehran time.

Install: `npm ci --legacy-peer-deps`. The existing datepicker peer dependency chain conflicts under
plain npm install; package-lock.json records the validated dependency resolution.
Build: `npm run build`. Type-check tests: `npx tsc -p tsconfig.spec.json --noEmit`.
The targeted Karma suite compiled but could not launch ChromeHeadless because no Chrome binary
was available; downloading Chromium also failed. No browser pass is claimed.
The build retains the existing jalali-ts CommonJS optimization warning.

Executed successfully: production build and test-source TypeScript compilation.
Companion backend: restore/build and 29 tests passed; live Telegram/SQL Server/browser verification
remains environment-blocked. See the PR description for companion backend link.

## Changed paths

- `package-lock.json`
- `src/app/components/admin/carManagment/carManagment.component.html`
- `src/app/components/admin/carManagment/carManagment.component.ts`
- `src/app/components/admin/telegram-channels/telegram-channels.component.css`
- `src/app/components/admin/telegram-channels/telegram-channels.component.html`
- `src/app/components/admin/telegram-channels/telegram-channels.component.spec.ts`
- `src/app/components/admin/telegram-channels/telegram-channels.component.ts`
- `src/app/models/car/car.ts`
- `src/app/services/admin/admin.service.ts`
- `src/app/services/telegram-channels.service.ts`
