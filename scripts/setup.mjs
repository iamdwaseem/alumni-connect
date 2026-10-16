import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync("backend/.env"))
  writeFileSync(
    "backend/.env",
    `PORT=5000\nMONGO_URI=mongodb://127.0.0.1:27017/alumni_connect\nJWT_SECRET=${randomBytes(48).toString("hex")}\nCLIENT_URL=http://localhost:5173\nADMIN_EMAIL=admin@example.com\nADMIN_PASSWORD=${randomBytes(18).toString("base64url")}\n`,
    { mode: 0o600 },
  );
if (!existsSync("frontend/.env"))
  writeFileSync("frontend/.env", "VITE_API_URL=http://localhost:5000\n");
console.log(
  "Environment files ready; existing files preserved. Find your generated admin password in backend/.env. Never commit this file.",
);
