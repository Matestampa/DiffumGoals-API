# Diffum Dreams — API — Context

This file is meant to bring a new AI agent (or dev) up to speed quickly on this codebase.

## What is this project

"Diffum Dreams" is a goal-tracking app with an image "diffusion/reveal" mechanic:
a user uploads a goal image (PNG, fixed size, e.g. 100x100), and the image is
gradually "diffumed" (revealed/altered) day by day until the `limit_date`. When
the user finishes their goal, they upload a "completed" image. Users authenticate
via Google OAuth (JWT stored in an httpOnly cookie). Images are stored in S3 and
served via signed CloudFront URLs. Data is stored in MongoDB (via Mongoose), using
schemas imported from an external package `@matestampa/diffum-goals_mongoose-schemas`.

This repo is the **backend REST API** only (Node.js + Express).

## Tech stack

- Node.js + Express 4
- MongoDB / Mongoose (schemas come from external npm package, not defined locally)
- AWS S3 (image storage) + AWS CloudFront (signed URLs for private image access)
- AWS CloudWatch (remote logging in non-local envs) via `winston` + `winston-cloudwatch`
- Auth: Passport Google OAuth20 strategy + JWT (`jsonwebtoken`) stored in an httpOnly cookie
- Validation: Joi
- Image processing: `sharp` (validate dimensions/format, add alpha channel)
- File uploads: `multer` (memory storage, single file field `img`)
- Tests: Jest + Supertest (see `__tests__/`)
- Env config: `APP_ENV=local`/`test` use `dotenv` (`.env.local` / `.env.test`, see `.env.example`); `APP_ENV=dev`/`prod`
  fetch vars from AWS SSM Parameter Store instead (EC2 instance role, no `.env` file involved)

## Running / scripts (package.json)

- `npm run local` — `APP_ENV=local nodemon ./src/index.js` (local machine dev loop)
- `npm run dev` — `APP_ENV=dev NODE_ENV=production node ./src/index.js` (shared `dev` server/branch)
- `npm start` — `APP_ENV=prod NODE_ENV=production node ./src/index.js`
- `npm test` / `npm run test` — `cross-env APP_ENV=test jest`

Env var loading is split across [src/config/get_env.js](src/config/get_env.js) and
[src/config/load_env.js](src/config/load_env.js):
- `APP_ENV=local` — `get_env.js` synchronously loads `.env.local` via `dotenv` at require-time.
- `APP_ENV=test` — same mechanism, but loads `.env.test` (git-ignored) and validates only the reduced
  `REQUIRED_TEST` list (see below). Used by `npm test`, since tests `require` the app directly.
  `load_env()` returns early for both `local` and `test` (no SSM).
- `APP_ENV=dev`/`prod` — `src/index.js` awaits `load_env()` **before** requiring `app.js` or any
  config module. `load_env()` fetches every parameter under `/diffumGoals/api/{dev|prod}/` from
  AWS SSM Parameter Store (`GetParametersByPathCommand`, paginated) and copies each one into
  `process.env` using the parameter's last path segment as the var name. No `.env` file is used
  or needed for these environments — the app must run on an EC2 instance with a role that can
  read that SSM path, read/write the S3 bucket, and write to CloudWatch.
- AWS SDK clients (`S3Client` in [src/aws_services/s3.js](src/aws_services/s3.js), and
  `winston-cloudwatch` in [src/logs/loggers.js](src/logs/loggers.js)) only pass explicit
  `accessKeyId`/`secretAccessKey` when those vars are present (i.e. `local`, from `.env.local`);
  otherwise credentials are omitted so the AWS SDK's default credential chain picks up the EC2
  instance role. The `SSMClient` itself also relies on the instance role, but still needs an
  explicit `AWS_REGION` — that one env var must be set directly in the EC2 process environment
  (launch template/systemd), since it can't be fetched from SSM before you know the region.
- `.env.example` documents every variable used in `local` (Mongo URL, JWT secret, Google OAuth
  creds, S3/CloudFront/CloudWatch creds, goals limits, log paths/group names); the same variable
  names (minus the local-only AWS access keys) must exist as SSM parameters for `dev`/`prod`.
- [src/config/required_env_vars.js](src/config/required_env_vars.js) is the single source of
  truth listing every hardcoded `process.env.X` key the app reads, split into `REQUIRED_COMMON`
  (all envs), `REQUIRED_LOCAL_ONLY` (`.env.local` log file paths + local-only AWS access keys),
  and `REQUIRED_REMOTE_ONLY` (`AWS_REGION` + CloudWatch log group names for `dev`/`prod`).
  `APP_ENV=test` uses its own `REQUIRED_TEST` list instead of those: `JWT_COOKIE_SECURE`, `JWT_SECRET`,
  `JWT_EXPIRATION_MS`, `GOALS_USER_LIMIT`, `GOALS_GLOBAL_LIMIT`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, `CLOUDFRONT_URL`, `CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_PRIVATE_KEY`,
  `MONGODB_URL` (no host/port, S3, CloudWatch or log vars — AWS services and loggers are mocked in tests).
  Update this file whenever a feature starts reading a new env var.
  [src/config/validate_env.js](src/config/validate_env.js) exports `validate_env(APP_ENV)`, which
  diffs that list against `process.env` and, on any missing key, logs the missing var name(s) and
  calls `process.exit(1)`. It's called right after whatever populated `process.env` for that
  environment — inside `get_env.js` after `dotenv.config()` (`local`/`test`), and inside `load_env.js`
  after `load_from_ssm()` (`dev`/`prod`) — so a missing var always fails fast before the server starts.

### Branch ↔ env mapping

| Git branch         | APP_ENV | npm script   |
|---------------------|---------|--------------|
| `master`            | `prod`  | `npm start`  |
| `dev`               | `dev`   | `npm run dev`|
| feature branches    | `local` | `npm run local` |
| (running tests)     | `test`  | `npm test`   |

## Entry point / bootstrap flow

1. [src/index.js](src/index.js): connects to MongoDB, then starts Express (`App.listen`) on `APP_CONN_VARS.port`.
   If Mongo connection fails, it's routed through `internalError_handler` and the server does NOT start.
2. [src/app.js](src/app.js): builds the Express app — CORS (reflects any origin, `credentials:true`),
   `express.json()`, `cookie-parser`, `passport.initialize()`, then mounts routes:
   - `GET /serverUp` — health check
   - `/users` → [src/routes/usersRoutes.js](src/routes/usersRoutes.js)
   - `/goals` → [src/routes/goalsRoutes.js](src/routes/goalsRoutes.js)

## Routes / Controllers

### `usersRoutes.js`
- `GET /users/auth/google` — kicks off Google OAuth (passport, `session:false`)
- `GET /users/auth/google/callback` — passport callback; sets `req.oauth_user`, then
  `UsersController.googleAuthCallback` sets the JWT cookie and redirects to `FRONTEND_URL`
- `POST /users/logout` (auth required) — clears the JWT cookie
- `GET /users/isLoggedIn` (auth required) — returns `user_id`/`username` from the JWT

Note: there's a `validate_register_login` validator and `register_Service`/`login_Service` in
`api/users/service/usersService.js`, but there are currently **no routes wired up** for classic
username/password register/login — only Google OAuth is exposed via routes. If asked to add
password-based auth endpoints, the validator/service functions already exist and just need
controller functions + routes.

### `goalsRoutes.js`
- `POST /goals/new` (multer single `img`, then `authentication`) — `GoalsController.newGoal`
- `POST /goals/complete` (multer single `img`, then `authentication`) — `GoalsController.completeGoal`
- Custom Multer error-handling middleware right after those two routes
- `GET /goals/all` — `GoalsController.getGoals` (public, paginated, filter by status)
- `GET /goals/myGoals` (auth required) — `GoalsController.getMyGoals` (paginated, user's own goals)

## Auth mechanism

[src/middlewares/auth.js](src/middlewares/auth.js) `authentication` middleware reads the JWT
from cookie `AUTH_VARS.JWT_COOKIE_NAME` (`"token"`), verifies it with `JWT_SECRET`, and sets
`req.user_id` / `req.username`. On failure, responds with `DEFLT_API_ERRORS.NOT_AUTH()` (401).

Google OAuth flow: `src/config/passport_config.js` wires the Google strategy, delegating to
`googleOAuth_Service` (in `api/users/service/usersService.js`) which finds-or-creates a user by
`provider_id` (`google_<profileId>`) and returns a signed JWT.

## API module convention (`src/api/<feature>/`)

Each feature folder under `src/api/` follows this pattern:
- `const_vars.js` — feature-local constants (image size, page limits, cache/signed-url durations, etc.)
- `validator.js` — Joi schema + validation function(s), returns `{error}` using `DEFLT_API_ERRORS`
- `service/xxxService.js` — business logic; always returns `{error, data}` (never throws to caller)
- `service/utils.js` — feature-local DB queries / helpers
- `service/error_handler.js` — maps low-level errors (AWS errors, Mongoose errors, unknown) to
  a `DEFLT_API_ERRORS.SERVER()` response, while logging the real error via `internalError_handler`

Feature folders: `newGoal`, `completeGoal`, `getGoals`, `users`.

Controllers (`src/controllers/`) glue routes → validator → service → `normal_response`/`apiError_handler`.
The pattern in every controller/service is destructuring `{error, ...}` and early-returning on error
(no try/catch at the controller level; services swallow internal errors and always resolve).

## Error handling architecture (`src/error_handling/`)

Two parallel error systems:
- **API errors** (`error_handling/api/`): `Error4User` base class + `DEFLT_API_ERRORS` factory
  (`NOT_AUTH` 401, `BAD_REQ` 404, `RETRY` 404, `SERVER` 500). `apiError_handler(error, res)` sends
  the formatted JSON error response `{status, error:{message, code, sub_code, data}}`.
- **Internal errors** (`error_handling/internal/`): `InternalError` base class + `GEN_INT_ERRORS`.
  `internalError_handler(error)` logs via winston (`infoLogger`/`errorLogger`) and could disable
  requests / send alert mail for "critic" errors (that part is commented out / not implemented).

Feature-level `error_handler.js` files (in each `service/`) catch raw errors (AWS SDK errors,
Mongoose `Error`, or unknown), call `internalError_handler` to log them, and always return a
generic `DEFLT_API_ERRORS.SERVER()` to the caller (so internal details never leak to the API response).

## AWS services (`src/aws_services/`)

- `s3.js` — save/get objects from S3 (`S3_FUNCS`)
- `cloudfront.js` — `get_SignedUrl(key, expiryDate)` for private image access (`CLOUDFRONT`)
- `error_handler.js` — normalizes AWS SDK errors into `AwsService_TimeOut_Error` /
  `AwsService_Unavailable_Error` / `AwsService_Unknown_Error` (all extend `InternalError`, `critic:true`)

## Database (`src/db/mongodb/`)

- `connection.js` — `connect_MongoDB()` / `disconnect_MongoDB()`, wraps connection failures in `MongoDB_Error`
- `models.js` — `GoalModel` / `UserModel`, built from schemas imported from the external package
  `@matestampa/diffum-goals_mongoose-schemas` (schemas are NOT defined in this repo)
- Goal document fields (inferred from usage): `user_id, username, descr, limit_date, expired,
  completed, completed_date, s3_imgName_original, s3_imgName_latest, s3_imgName_completed,
  cant_pix_xday, last_diffumDate`

Note: there's a stray file [src/db/mhgjh](src/db/mhgjh) at the `db/` root — looks like an
accidental/typo file, likely safe to delete (verify before removing).

## Config (`src/config/`)

- `get_env.js` — determines `APP_ENV` (default `"local"`); for `"local"`/`"test"` also loads `.env.local` / `.env.test` via dotenv and validates
- `load_env.js` — for `"dev"`/`"prod"` (no-op for `local`/`test`), async-loads vars from AWS SSM Parameter Store (awaited in `src/index.js` before anything else is required)
- `app_config.js` — `APP_CONN_VARS` (host/port), `AUTH_VARS` (JWT cookie/secret/expiry),
  `GOALS_LOGIC_VARS` (per-user/global goal limits), `GOOGLE_OAUTH_VARS`
- `aws_config.js` — S3, CloudFront, CloudWatch credentials/settings
- `mongodb.js` — `MONGODB_VARS.url`
- `passport_config.js` — Google strategy wiring, delegates to `googleOAuth_Service`
- `logger_config.js` — winston transport setup for CloudWatch vs local files, referenced by `src/logs/loggers.js`

## Logging (`src/logs/`)

`infoLogger` / `errorLogger` (winston). Console output always; additionally writes to local
file or CloudWatch depending on environment (see `logger_config.js` / `get_env.js`). Error log
file sample at `src/logs/files/error.json`.

## Tests (`__tests__/`)

Run with `npm test` (`cross-env APP_ENV=test jest`, `testEnvironment: node`). Env vars come from `.env.test`
(git-ignored; only the `REQUIRED_TEST` vars are validated). Needs a reachable MongoDB at
`MONGODB_URL` (from `.env.test`) for the service/integration tests that hit the DB.

### Layout and format

`__tests__/` mirrors the `src/api/` feature folders. Every feature has one test file per layer:

| File                  | What it tests                                                                    | DB | What is mocked |
|------------------------|-----------------------------------------------------------------------------------|----|----------------|
| `validator.test.js`    | The Joi validator function only (pure unit test)                                  | no | nothing |
| `service.test.js`      | The service function, calling it directly (`{error, data}` results + DB state)    | yes | AWS (S3/CloudFront) and the logger |
| `integration.test.js`  | The HTTP endpoint through the real Express `App` with Supertest (route → middleware → controller → validator → service) | yes* | AWS and the logger |

\* The `users` integration test is the exception: it mocks the service and needs no DB (see below).

Features covered: `newGoal`, `completeGoal`, `getGoals` (all three layers each) and `users`
(only `service` + `integration`, because there is no validator; see below).

### Shared helpers: [__tests__/test_utils.js](__tests__/test_utils.js)

Not a test suite: `package.json` → `jest.testPathIgnorePatterns` excludes it from test discovery. Import it from
feature tests with `require('../test_utils.js')`.

- `connectTestDb` / `disconnectTestDb` — every Jest worker uses its own DB (`diffum_test_<JEST_WORKER_ID>`),
  dropped at the end, so parallel test files never collide and the DB in `MONGODB_URL` is never touched.
  Use as `beforeAll(connectTestDb)` / `afterAll(disconnectTestDb)`.
- `clearGoals` / `clearUsers` — `beforeEach` cleanup.
- `buildAuthCookie(user_id, username)` — `Cookie` header with a valid signed JWT, to call authenticated endpoints.
- `buildGoal` / `buildCompletedGoal` / `buildExpiredGoal` / `seedGoals` / `seedDiffumingGoals` — goal fixtures.

### Mocking conventions

- The logger module (`src/logs/loggers.js`) is always mocked, so tests don't write logs/CloudWatch.
- Only the external AWS boundary is mocked, by overriding `S3_FUNCS` / `CLOUDFRONT` inside
  `jest.mock('../../src/aws_services', ...)`. The rest of that module (`AWS_GEN_ERRORS`) is kept real with
  `jest.requireActual`, because the error handlers use `instanceof` checks against it.
- The DB, validators, services and error handlers are real (so error paths are checked end-to-end: internal
  errors must come back as a generic `SERVER` error with no details leaked).
- Image fixtures are generated with `sharp` (100x100 PNG buffers), no files on disk.

### Notes per feature

- **newGoal / completeGoal**: S3 saving is mocked, the tests assert on what was saved and on the goal state in the DB
  (user/global goal limits, ownership, already completed/expired goals, image validation).
- **getGoals**: covers `goalStatus` filter, ordering, pagination (`nextPage`) and invalid query params for both
  `/goals/all` (public) and `/goals/myGoals` (auth). Response shape checks that internal fields (`user_id`,
  `s3_imgName_*`) aren't exposed.
- **users** (Google OAuth only; the legacy username/password `register_Service`/`login_Service` are intentionally
  NOT tested, they will be removed):
  - No `validator.test.js`, since this feature has no validator.
  - `service.test.js` covers only `googleOAuth_Service` against the real test DB: user creation, username generation
    and collision suffix, JWT claims/expiry, re-login without duplicates, and DB failures → `SERVER` error.
  - `integration.test.js` mocks `usersService.js` and replaces only the *callback step* of `passport-google-oauth20`
    (a subclass of the real `Strategy` that fakes Google returning a profile or denying access). So the real routes,
    passport verify function (`passport_config.js`) and controller run, while no Google/network/DB is involved. The
    first step (`/users/auth/google`) is the real strategy: it only builds the Google redirect URL, which the test
    checks (client_id, redirect_uri, scopes). It asserts redirections (`FRONTEND_URL` vs `?error=oauth_failed`), the
    cookie flags, and that the service receives the Google profile. It also covers `POST /users/logout` and the
    `authentication` middleware (exercised through `GET /users/isLoggedIn`: missing/invalid/expired/forged/`alg:none` tokens).
  - The real Google consent screen can't be automated, so a full login with Google is only checked manually / in an
    E2E run against a deployed environment (cross-site cookie behaviour between frontend and API also belongs there).
  - The cookie `Secure` flag is intentionally not asserted: `JWT_COOKIE_SECURE` is a string (`"false"` is truthy).

## Known gaps / things a future agent may need to address

- No routes exposed for classic username/password register/login (service + validator exist, unused).
- `src/db/mhgjh` — unidentified stray file, confirm and likely delete.
- `get_diffumColor` (in `newGoal/service/utils.js`) is implemented but commented out where called
  in `newGoalService.js` — the "diffum color" isn't currently persisted/used anywhere.
- Internal error handler's "disable requests on critical error" and "send error email" logic are
  stubbed out/commented — no actual circuit-breaker or alerting is active yet.
- CORS in `app.js` reflects any origin with `credentials:true` — very permissive; tighten if this
  goes to production seriously.
