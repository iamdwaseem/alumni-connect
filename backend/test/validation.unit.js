import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import {
  profileSchema,
  registerSchema,
  eventSchema,
} from "../src/validation.js";
import { createApp } from "../src/app.js";
const profile = {
  fullName: "Example User",
  email: "USER@example.com",
  rollNumber: "EX001",
  branch: "CSE",
  graduationYear: "2024",
};
test("profile normalizes email/year and strips privileged fields", () => {
  const p = profileSchema.parse({
    ...profile,
    role: "admin",
    userId: "injected",
  });
  assert.equal(p.email, "user@example.com");
  assert.equal(p.graduationYear, 2024);
  assert.equal(p.role, undefined);
  assert.equal(p.userId, undefined);
});
test("registration rejects short passwords", () => {
  assert.equal(
    registerSchema.safeParse({ ...profile, password: "short" }).success,
    false,
  );
});
test("profile rejects unsafe external links", () => {
  assert.equal(
    profileSchema.safeParse({ ...profile, linkedInUrl: "javascript:alert(1)" })
      .success,
    false,
  );
});
test("profile rejects invalid years", () => {
  assert.equal(
    profileSchema.safeParse({ ...profile, graduationYear: 100 }).success,
    false,
  );
});
test("event rejects past dates", () => {
  assert.equal(
    eventSchema.safeParse({
      title: "Meetup",
      description: "Community meetup",
      venue: "Campus",
      eventDate: "2020-01-01T00:00:00Z",
    }).success,
    false,
  );
});
test("weak application secret is rejected", () => {
  assert.throws(() => createApp({ secret: "short" }));
});
test("unauthenticated request is blocked before database access", async () => {
  const app = createApp({
    secret: "unit-only-secret-with-at-least-32-characters",
    logging: false,
  });
  const r = await request(app).get("/api/alumni");
  assert.equal(r.status, 401);
});
test("health reports disconnected database", async () => {
  const app = createApp({
    secret: "unit-only-secret-with-at-least-32-characters",
    logging: false,
  });
  const r = await request(app).get("/healthz");
  assert.equal(r.status, 503);
});
