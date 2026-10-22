# Session and header fixes

Based on main commit `9680dbc811fbfa9b498a9609e4d9ddaa4a13b076`.

The reported capabilities URL is the correct endpoint. A 401 means the API did not authenticate the request. The link alone cannot establish whether the user's token was absent, expired, issued with an old signing key, or rejected due to issuer/audience settings. No access to the user's local browser, token or backend process was available. A valid authenticated user without Admin permission would normally receive 403.

Confirmed source defects:

- Header/admin code treated any parseable stored token as logged in without checking expiry. Expired tokens could hide login/register while API requests failed.
- Header had no logged-in account/logout controls, and mobile CSS hid login/register buttons.
- Login API URL was hardcoded to localhost rather than using the build environment.
- Telegram polling repeated unauthorized requests without a dedicated session message.

The fix centralizes client-side token decoding/lifetime/role checks in AuthService. The interceptor sends Bearer only to the configured API, clears the rejected session on 401 and navigates to login. Responses from older requests cannot clear a newer login. A 403 retains the session. The server continues to validate signatures, issuer, audience, expiry and Admin authorization; no backend access checks were removed. Login returns to a relative internal route after reauthentication. Header state reacts to login/logout and displays the account/logout controls for a valid session; expired sessions expose login/register.

Verification: production and development builds, compilation of all specs, and ten focused Angular TestBed/Jasmine tests passed. Tests were executed in a temporary Happy DOM harness with HttpTestingController, covering expired/malformed/future tokens, role arrays, API base URL, Bearer attachment, 401 recovery, 403 preservation, newer-login race and header control rendering. No native desktop screenshot, live Admin login or SQL Server/Telegram integration was verified here. The existing jalali-ts CommonJS build warning remains.

Local verification after applying this PR: restart ng serve, sign in again with an Admin account against the same local API, then open the Telegram page. If a newly issued token still receives 401, inspect the Authorization header and the local backend's JWT issuer/audience/signing configuration; never post the token or key in logs/issues.

Backend master at `e8ba50d85f64873efd7c203fc9a2f69829ad4dcf` currently contains channel import, persistent job logs, pause/resume/retry, raw-message collection, Web Preview/MTProto selection, deterministic listing extraction and deduplication. No catalog matching or daily averaged price update is present in that branch, and the old car-site crawler remains registered. No backend files were modified for this fix.
