# MayacarFront

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.25.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
# mayaCarFrontProduc

## Telegram channel management

Run `npx ng serve --configuration development` and use `/admin/dashboard/telegram-channels` (redirects to the existing `/adminDashboard/telegramChannels` dashboard child route). Log in as Admin first. Development explicitly replaces `environment.ts` with `environment.development.ts`, using `http://localhost:8080/api`. Production uses `https://api.mayakhodro.com/api`. Telegram requests always append `/admin/telegram-channels`; `/api/capabilities` is not a valid Telegram route.

The form posts `{ input: "@username" }` to `/admin/telegram-channels/import`. Import state is separate from list-refresh state, so a failed initial GET cannot permanently disable the submit button. API failures are shown in the page. The list, summary, capabilities and job logs reload from the API every five seconds; no channel data is stored in local browser state across refreshes. The existing JWT interceptor supplies the login token.

Validation commands:

```bash
npx tsc --noEmit -p tsconfig.spec.json
npx ng build --configuration production
npx ng build --configuration development
npx ng test --watch=false --browsers=ChromeHeadless --polyfills=zone.js --polyfills=zone.js/testing --include='src/app/components/admin/telegram-channels/*.spec.ts'
```

The focused tests exercise the template submit event, textarea binding, service URL/body, HTTP error/loading recovery and API-fed table updates. Test HTTP responses are fixtures, not production data. Compilation of all existing specs also checks the migrated Angular `waitForAsync` imports and corrected service/component class names. The broader legacy runtime test suite has not been certified by this change.

Both build configurations and spec TypeScript compilation passed during this fix. Three focused tests passed with Angular TestBed/Jasmine in a temporary Happy DOM harness. Native ChromeHeadless execution was blocked by the execution environment's Unix socket restriction; a real browser Network/Console session with SQL Server and live Telegram still requires verification locally. The production build retains the existing `jalali-ts` CommonJS warning.
