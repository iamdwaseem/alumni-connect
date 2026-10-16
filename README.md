# Alumni Connect

A complete course prototype: React interface, Express REST API, MongoDB persistence, administrator and alumni roles, events, API tests, container configuration, and GitHub CI. It runs on your own computer; no account or hosting service is connected by this ZIP.

## Start here on your Mac

1. Extract this ZIP. Move the `alumni-connect` folder into `~/Projects` if you like.
2. Install **Node.js 24 LTS** and **Docker Desktop**. Open Docker Desktop and wait until the engine is running. Git is optional until you want version control.
3. Open Terminal in the extracted folder. All commands below run from that folder, not from backend/frontend.

```bash
cd ~/Projects/alumni-connect
node --version
npm install
npm run setup
docker compose up --build -d
docker compose exec backend npm run seed
```

4. Open **http://localhost:5173**. Choose Sign in.
5. Open `backend/.env` in your editor. Use its `ADMIN_EMAIL` and generated `ADMIN_PASSWORD`. Never share or commit these values.
6. You now have six clearly fictional demo profiles and one event. Register your own alumni account through the website to test the alumni role. Demo profiles do not have logins.

`npm run setup` creates secrets locally and preserves existing environment files. No fixed admin password is distributed. The seed script preserves existing records and does not reset an existing admin password.

### Everyday commands

```bash
docker compose ps
docker compose logs -f backend
docker compose stop
docker compose start
```

`docker compose down` removes the containers but preserves the database volume. Do not add `-v` unless you intentionally want to delete all local database data. Port bindings are localhost-only.

## Edit the code with live reload

Use this instead of the full Compose application when developing:

1. Stop the full app with `docker compose down` if running.
2. Start a separate local database:

```bash
docker run -d --name alumni-dev-mongo -p 127.0.0.1:27017:27017 -v alumni_dev_data:/data/db mongo:7
npm run setup
npm run seed
npm run dev
```

If the database container already exists, use `docker start alumni-dev-mongo` instead of `docker run`. This development database is separate from Compose's database. If you already have MongoDB running locally, skip the docker run command. Never run two databases on the same port.

Open http://localhost:5173. React hot reloads; the backend restarts when its source changes. Stop the dev servers using Ctrl+C. Backend lives at http://localhost:5000 and health at http://localhost:5000/healthz.

## What is implemented

- Public landing page, signup, login and session-tab logout.
- Password hashing, expiring JWT, server-enforced roles and ownership, validation, rate limiting, security headers and restricted CORS.
- Dashboard totals; alumni directory with literal search and graduation-year filter (maximum 500 results).
- Administrator creates, edits, views and deletes alumni records.
- Alumni edit their own profile. Linked account email is immutable in this prototype.
- Admin event create/edit/delete and attendee names; alumni view and register once.
- HTTP access logs and database-aware health check (503 if disconnected).
- Responsive design, form feedback, loading/error/empty states, confirmation before deletion.
- Persistent MongoDB volume, multi-stage frontend image and backend Dockerfile.
- Automated integration tests and GitHub CI jobs.

Deleting an account-linked profile also removes its alumni login and event registrations. Confirmation explains this in the interface. Manual admin-created profiles are directory-only; existing records cannot be claimed automatically by public signup. This avoids accidental account takeover. Email changes, record claiming, password reset, email verification, photos, chat and full production account management are future work.

## Step-by-step learning path

1. **Structure:** inspect package.json and the two workspace directories.
2. **Database:** read backend/src/models.js. Users are login identities, profiles are directory entries, events hold attendee references.
3. **Validation:** read backend/src/validation.js. Zod validates bodies and strips unapproved fields.
4. **API:** read backend/src/app.js. Routes perform authentication, permission checks and database operations.
5. **Startup:** server.js loads local environment variables, connects MongoDB and listens on PORT.
6. **UI:** frontend/src/main.jsx contains named React pages, auth context, API helper and routing. It is intentionally one navigable file for the prototype; split components into files as your next refactor.
7. **Design:** style.css controls desktop/mobile layouts. Fonts have local fallbacks if Google Fonts is unavailable.
8. **Verification:** run npm test and npm run build.
9. **Containers:** inspect Dockerfiles, nginx.conf and docker-compose.yml. Nginx handles React deep-link refresh.
10. **CI:** push to your own GitHub repository; the included workflow tests API, builds React, and builds images. It does not deploy.
11. **Deployment:** follow DEPLOYMENT.md only after the local flow works.

## Tests and build

```bash
npm test
npm run build
```

Tests use an isolated temporary MongoDB downloaded automatically by mongodb-memory-server. The first run needs internet and a compatible MongoDB binary. If the download is blocked, use a dedicated empty test database:

```bash
TEST_MONGO_URI=mongodb://127.0.0.1:27017/alumni_connect_test npm test
```

Never point TEST_MONGO_URI at your real database. When using an external test database, start with an empty database for each run; the test suite deliberately leaves its fixtures for inspection. GitHub CI starts a fresh MongoDB service each run.

## Repository setup

```bash
git init
git add .
git commit -m "feat: build Alumni Connect prototype"
```

Before committing, inspect `git status` and confirm no `.env` or node_modules is staged. Create your GitHub repository yourself, then follow its remote/push instructions. No GitHub credentials are needed to run locally.

## API map

| Endpoint | Access | Function |
| --- | --- | --- |
| GET /healthz | Public | Database-aware readiness |
| POST /api/auth/register | Public | Create alumni user + profile |
| POST /api/auth/login | Public | Return JWT + user |
| GET /api/auth/me | Signed in | Current identity |
| GET /api/dashboard | Signed in | Community counts |
| GET /api/alumni?search=&year=&mine=true | Signed in | Directory/filter/own profile |
| POST /api/alumni | Admin | Create directory entry |
| GET /api/alumni/:id | Signed in | Profile detail |
| PUT /api/alumni/:id | Owner/admin | Full validated profile update |
| DELETE /api/alumni/:id | Admin | Delete profile and linked account |
| GET /api/events | Signed in | Events; attendees visible only to admin |
| POST /api/events | Admin | Create event |
| PUT or DELETE /api/events/:id | Admin | Update/delete event |
| POST /api/events/:id/register | Alumni | Idempotent registration |

Authenticated requests use `Authorization: Bearer <token>`. Success responses contain `{success:true,data:...}`; errors contain `{success:false,message:...}`. See `backend/test/api.test.js` for runnable examples.

## Troubleshooting

- **Cannot connect to Docker:** launch Docker Desktop first.
- **Port 5000 in use on macOS:** AirPlay Receiver may own it. Stop the conflicting service, or edit Compose host port and frontend build argument together; for development change PORT and VITE_API_URL then restart.
- **Database unavailable:** check MONGO_URI; inside Compose it must use `mongo`, not localhost.
- **Login fails after editing ADMIN_PASSWORD:** seed does not reset existing accounts. Use the original password. Password reset is not implemented.
- **401 after two hours:** log in again. JWTs expire after two hours.
- **403:** that account does not own the record or lacks administrator access.
- **CORS error:** CLIENT_URL must equal the frontend origin, including protocol and port.
- **Frontend API URL change:** rebuild; VITE_API_URL is a build-time value in a production bundle.
- **Blank directory:** run the seed command against the database used by that running backend.

## Prototype limitations and safety

Use synthetic data for demonstrations. Authenticated directory members can see contact information. Obtain consent before uploading real alumni data. Session storage is a beginner-friendly token strategy, not hardened production session management. For production add audited HttpOnly cookie sessions/CSRF handling, verification and password reset, backups, structured privacy-safe logs, transactional account/profile deletion, pagination and security review. Morgan request logging is not a complete monitoring/alerting service.

Node 24 replaces the older guide's Node 20 recommendation. See https://nodejs.org/en/about/previous-releases and https://vite.dev/guide/ for runtime compatibility. The guide's authentication/events are concrete MVP design choices; source report inconsistencies such as /api/faculty have been normalized to /api/alumni.
