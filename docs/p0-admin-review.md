# P0 admin review (draft)

The production frontend (`main` at `751f05f0988cf94cdf35bf2912e9e3f2dd584372`) receives `/adminDashboard/marketReview` for used/zero pricing, source evidence, manual decisions and overrides, catalog correction and audit history. Existing zero imports and shared channel administration retain their routes. The API proxy reports upstream timeouts as 504 and connection failure as 502 with a request ID; a temporary network error does not clear the session. The existing auth interceptor clears only a rejected token on API 401 and does not clear a newer token after a delayed response.

Backend prerequisite: deploy the matching CarShow branch after a successful SQL Server migration rehearsal. The `mayaCarFront` repository has no source branch; this change targets the production frontend repository only.

Verification: `npm run test:api-proxy` passed 18/18. `npm run build` output is recorded in the backend release matrix. Angular browser and responsive review need an environment that permits Chrome sockets and a live test API. The operational root cause of historical server-connection and logout incidents needs timestamped backend/proxy logs.

**Release gate: BLOCKED.** No production deployment or merge is authorized by this document.
