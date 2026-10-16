# Optional deployment after local verification

Nothing is deployed automatically by this project. You need your own GitHub, Render and MongoDB Atlas accounts. Provider plans, pricing and UI can change. Use the official documentation to confirm current options: https://render.com/docs/docker, https://render.com/docs/static-sites and https://www.mongodb.com/docs/atlas/.

## 1 MongoDB Atlas

Create a cluster and database user with access only to the project database. Store its connection string as MONGO_URI in the backend service secrets. URL-encode password special characters. Use an appropriate network access list for your host; do not permanently allow the entire internet for convenience. Never put this URI in the frontend or repository.

## 2 Backend on Render

Create a Docker Web Service using your repository. Leave root directory at repository root (this is an npm workspace). Dockerfile path: `backend/Dockerfile`. Docker context: repository root. Set health check path `/healthz`.

Environment:
- MONGO_URI: your Atlas URI
- JWT_SECRET: independently generated random 48-byte secret (do not reuse a shared example)
- CLIENT_URL: exact deployed frontend HTTPS origin
- NODE_ENV: production

The server binds to `0.0.0.0` and uses Render's PORT. Do not hardcode a Render port. Obtain the backend HTTPS URL. The backend image runs as the unprivileged node user.

## 3 Frontend on Render

Choose one route:

**Static site:** repository root unchanged; build `npm ci && npm run build`; publish `frontend/dist`. Set VITE_API_URL to the backend HTTPS URL before building. Add a rewrite from `/*` to `/index.html` for React routes. This uses the production React build but not the frontend container.

**Docker service:** Dockerfile `frontend/Dockerfile`, repository root context; provide VITE_API_URL as a build argument using the host's supported Docker build configuration. Nginx serves port 8080 and handles SPA fallbacks. Confirm your host detects/listens to that container port. This route demonstrates containerized hosting for both tiers.

Local Compose orchestrates three services; Render deployment uses independent web services and Atlas, not the Compose database. Do not upload local .env files.

## 4 Create the production admin

Use the seed script with MONGO_URI, ADMIN_EMAIL and a new ADMIN_PASSWORD in a trusted local environment pointing to your new deployment database, or a supported private service shell. It also adds synthetic demo records. Do not run this on an unrelated database. Remove ADMIN_PASSWORD from long-lived service configuration after seeding if not needed. The script will not elevate existing alumni accounts.

## 5 Smoke test and CI/CD distinction

Check /healthz, admin login, alumni CRUD, signup, owner-only profile editing, event creation/registration, and page refresh at /app/events. Check that secrets are absent from frontend assets and Git history.

The supplied GitHub workflow is CI, not a deployed CD pipeline. Configure hosting to deploy only after passing CI (where supported), or deploy manually after checks pass. A green GitHub run alone does not prove production was deployed. Capture real deployment and health screenshots for your course report.
