# Verification report

## Completed in the build workspace

- npm install succeeded; root package-lock.json is included for reproducible installation.
- npm run build succeeded (Vite production build).
- node --test backend/test/validation.unit.js: 8 passed, 0 failed.
- npm audit --omit=dev --audit-level=high: 0 vulnerabilities reported at build time. This is not a guarantee of security.

## Not verified here

- Full npm test integration suite: MongoDB startup was denied by this environment (`open: Operation not permitted`, exit code 100). The 15 integration cases could not execute their database-dependent assertions. They are included, not claimed to pass.
- Browser visual/end-to-end checks: the Vite dev server could not enumerate network interfaces in this workspace. The interface is production-build checked, not browser-tested here.
- Docker build/start: Docker is not installed here. Configuration is provided, not runtime-verified.
- GitHub Actions and Render/Atlas deployment: no repository was pushed and no cloud account was connected. CI and deployment instructions are provided, not claimed to have run.

## Verify on your Mac

1. Follow README.md startup instructions.
2. Run npm test (temporary isolated MongoDB) and npm run build.
3. Confirm docker compose ps lists three healthy services.
4. Sign in as the seeded admin; create, view, search, edit, and delete a manual alumni profile.
5. Register an alumni account using unique email and roll number; edit that profile and confirm admin-only actions are unavailable.
6. Create an event as admin. Register as alumni twice; attendee count should remain one. Confirm admin sees the attendee name/email.
7. Refresh /app/events; the frontend should still load.
8. Stop/restart containers and confirm records persist.
9. Inspect the app at desktop and phone widths.

Report any exact error with secrets removed. Do not disable tests or authorization to bypass failures.
