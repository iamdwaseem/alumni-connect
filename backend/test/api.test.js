import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.js";
import { User, Profile, Event } from "../src/models.js";
let mongo, adminToken, alumniToken, profileId, eventId;
const app = createApp({
  secret: "test-only-secret-at-least-thirty-two-characters",
  logging: false,
});
const sample = {
  fullName: "Test Alumnus",
  email: "test@example.com",
  rollNumber: "TEST001",
  branch: "CSE",
  graduationYear: 2024,
  password: "Testing12345!",
};
const bearer = (t) => ({ Authorization: `Bearer ${t}` });
before(async () => {
  if (process.env.TEST_MONGO_URI)
    await mongoose.connect(process.env.TEST_MONGO_URI);
  else {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  }
  await Promise.all([User.init(), Profile.init(), Event.init()]);
});
after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
test("health reports live database", async () => {
  const r = await request(app).get("/healthz");
  assert.equal(r.status, 200);
  assert.equal(r.body.data.database, "connected");
});
test("unauthenticated directory is rejected", async () => {
  assert.equal((await request(app).get("/api/alumni")).status, 401);
});
test("registration validates fields", async () => {
  assert.equal(
    (
      await request(app)
        .post("/api/auth/register")
        .send({ ...sample, password: "short" })
    ).status,
    400,
  );
});
test("registration hashes password and never accepts admin role", async () => {
  const r = await request(app)
    .post("/api/auth/register")
    .send({ ...sample, role: "admin" });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.user.role, "alumni");
  alumniToken = r.body.data.token;
  const u = await User.findOne({ email: sample.email }).select("+passwordHash");
  assert.notEqual(u.passwordHash, sample.password);
  assert.ok(await bcrypt.compare(sample.password, u.passwordHash));
  profileId = String((await Profile.findOne({ email: sample.email }))._id);
});
test("duplicate email and roll number are rejected", async () => {
  assert.equal(
    (await request(app).post("/api/auth/register").send(sample)).status,
    409,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/register")
        .send({ ...sample, email: "other@example.com" })
    ).status,
    409,
  );
});
test("bad login fails and good login succeeds", async () => {
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: sample.email, password: "wrong" })
    ).status,
    401,
  );
  assert.equal(
    (await request(app).post("/api/auth/login").send(sample)).status,
    200,
  );
});
test("current user and own profile load", async () => {
  assert.equal(
    (await request(app).get("/api/auth/me").set(bearer(alumniToken))).status,
    200,
  );
  const r = await request(app)
    .get("/api/alumni?mine=true")
    .set(bearer(alumniToken));
  assert.equal(r.body.data.length, 1);
});
test("alumni can update own profile, but cannot delete it", async () => {
  const r = await request(app)
    .put("/api/alumni/" + profileId)
    .set(bearer(alumniToken))
    .send({ ...sample, company: "Example Corp" });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.company, "Example Corp");
  assert.equal(
    (
      await request(app)
        .delete("/api/alumni/" + profileId)
        .set(bearer(alumniToken))
    ).status,
    403,
  );
});
test("admin login and alumni CRUD work", async () => {
  await User.create({
    name: "Admin",
    email: "admin@example.com",
    role: "admin",
    passwordHash: await bcrypt.hash("AdminTesting123!", 12),
  });
  adminToken = (
    await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "AdminTesting123!" })
  ).body.data.token;
  const created = await request(app)
    .post("/api/alumni")
    .set(bearer(adminToken))
    .send({ ...sample, email: "manual@example.com", rollNumber: "MAN001" });
  assert.equal(created.status, 201);
  const id = created.body.data._id;
  assert.equal(
    (
      await request(app)
        .put("/api/alumni/" + id)
        .set(bearer(alumniToken))
        .send(sample)
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/alumni/" + id)
        .set(bearer(adminToken))
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .delete("/api/alumni/" + id)
        .set(bearer(adminToken))
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .get("/api/alumni/" + id)
        .set(bearer(adminToken))
    ).status,
    404,
  );
});
test("malformed ID, literal search, invalid year are safe", async () => {
  assert.equal(
    (await request(app).get("/api/alumni/not-an-id").set(bearer(adminToken)))
      .status,
    400,
  );
  assert.equal(
    (await request(app).get("/api/alumni?search=%5B").set(bearer(adminToken)))
      .status,
    200,
  );
  assert.equal(
    (await request(app).get("/api/alumni?year=no").set(bearer(adminToken)))
      .status,
    400,
  );
});
test("only admin can create events; validation rejects past dates", async () => {
  const data = {
    title: "Test meetup",
    description: "A test community meetup",
    venue: "Campus",
    eventDate: new Date(Date.now() + 86400000).toISOString(),
  };
  assert.equal(
    (await request(app).post("/api/events").set(bearer(alumniToken)).send(data))
      .status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/events")
        .set(bearer(adminToken))
        .send({ ...data, eventDate: "2020-01-01T00:00:00Z" })
    ).status,
    400,
  );
  const r = await request(app)
    .post("/api/events")
    .set(bearer(adminToken))
    .send(data);
  assert.equal(r.status, 201);
  eventId = r.body.data._id;
});
test("event registration is idempotent and private", async () => {
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await request(app)
          .post("/api/events/" + eventId + "/register")
          .set(bearer(alumniToken))
      ).status,
      200,
    );
  const member = await request(app).get("/api/events").set(bearer(alumniToken));
  assert.equal(member.body.data[0].attendeeCount, 1);
  assert.equal(member.body.data[0].attendees, undefined);
  const admin = await request(app).get("/api/events").set(bearer(adminToken));
  assert.equal(admin.body.data[0].attendees[0].email, sample.email);
});
test("dashboard, event update and delete work", async () => {
  assert.equal(
    (await request(app).get("/api/dashboard").set(bearer(adminToken))).body.data
      .alumni,
    1,
  );
  assert.equal(
    (
      await request(app)
        .put("/api/events/" + eventId)
        .set(bearer(adminToken))
        .send({
          title: "Updated meetup",
          description: "Updated description",
          venue: "Online",
          eventDate: new Date(Date.now() + 86400000).toISOString(),
        })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .delete("/api/events/" + eventId)
        .set(bearer(adminToken))
    ).status,
    200,
  );
});
test("deleting linked profile revokes login", async () => {
  assert.equal(
    (
      await request(app)
        .delete("/api/alumni/" + profileId)
        .set(bearer(adminToken))
    ).status,
    200,
  );
  assert.equal(
    (await request(app).get("/api/auth/me").set(bearer(alumniToken))).status,
    401,
  );
});
test("health is 503 when database is disconnected", async () => {
  await mongoose.disconnect();
  assert.equal((await request(app).get("/healthz")).status, 503);
});
