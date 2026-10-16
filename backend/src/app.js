import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Profile, Event } from "./models.js";
import {
  profileSchema,
  registerSchema,
  loginSchema,
  eventSchema,
} from "./validation.js";

export function createApp({
  secret,
  clientUrl = "http://localhost:5173",
  logging = true,
}) {
  if (!secret || secret.length < 32)
    throw new Error(
      "JWT_SECRET must contain at least 32 characters. Run npm run setup.",
    );
  const app = express();
  app.use(
    helmet(),
    cors({ origin: clientUrl }),
    express.json({ limit: "64kb" }),
  );
  if (logging) app.use(morgan(":method :url :status :response-time ms"));
  const fail = (status, message) =>
    Object.assign(new Error(message), { status });
  const send = (res, data, status = 200) =>
    res.status(status).json({ success: true, data });
  const token = (u) =>
    jwt.sign({ sub: String(u._id) }, secret, {
      expiresIn: "2h",
      issuer: "alumni-connect",
      audience: "alumni-web",
    });
  const safeUser = (u) => ({
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
  });
  const auth = async (req, res, next) => {
    try {
      const raw = req.headers.authorization?.split(" ");
      if (raw?.[0] !== "Bearer") throw Error();
      const payload = jwt.verify(raw[1], secret, {
        algorithms: ["HS256"],
        issuer: "alumni-connect",
        audience: "alumni-web",
      });
      req.user = await User.findById(payload.sub);
      if (!req.user) throw Error();
    } catch {
      throw fail(401, "Please sign in again.");
    }
    next();
  };
  const admin = (req, res, next) => {
    if (req.user.role !== "admin")
      throw fail(403, "Administrator access required.");
    next();
  };
  const load = (Model) => async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id))
      throw fail(400, "Invalid record ID.");
    req.record = await Model.findById(req.params.id);
    if (!req.record) throw fail(404, "Record not found.");
    next();
  };
  app.get("/healthz", (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    send(
      res,
      {
        status: ready ? "ok" : "degraded",
        database: ready ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
      },
      ready ? 200 : 503,
    );
  });
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 100,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        success: false,
        message: "Too many attempts. Try again later.",
      },
    }),
  );
  app.post("/api/auth/register", async (req, res) => {
    const { password, ...data } = registerSchema.parse(req.body);
    if (
      (await User.exists({ email: data.email })) ||
      (await Profile.exists({
        $or: [{ email: data.email }, { rollNumber: data.rollNumber }],
      }))
    )
      throw fail(409, "Email or roll number already registered.");
    const u = await User.create({
      name: data.fullName,
      email: data.email,
      passwordHash: await bcrypt.hash(password, 12),
    });
    try {
      await Profile.create({ ...data, userId: u._id });
    } catch (e) {
      await User.deleteOne({ _id: u._id });
      throw e;
    }
    send(res, { user: safeUser(u), token: token(u) }, 201);
  });
  app.post("/api/auth/login", async (req, res) => {
    const data = loginSchema.parse(req.body);
    const u = await User.findOne({ email: data.email }).select("+passwordHash");
    if (!u || !(await bcrypt.compare(data.password, u.passwordHash)))
      throw fail(401, "Invalid email or password.");
    send(res, { user: safeUser(u), token: token(u) });
  });
  app.get("/api/auth/me", auth, (req, res) => send(res, safeUser(req.user)));
  app.get("/api/dashboard", auth, async (req, res) =>
    send(res, {
      alumni: await Profile.countDocuments(),
      events: await Event.countDocuments({ eventDate: { $gte: new Date() } }),
      companies: (await Profile.distinct("company", { company: { $ne: "" } }))
        .length,
    }),
  );
  app.get("/api/alumni", auth, async (req, res) => {
    const q = String(req.query.search || "")
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter = q
      ? {
          $or: ["fullName", "company", "branch", "rollNumber"].map((k) => ({
            [k]: new RegExp(q, "i"),
          })),
        }
      : {};
    if (req.query.year) {
      const y = Number(req.query.year);
      if (!Number.isInteger(y)) throw fail(400, "Invalid graduation year.");
      filter.graduationYear = y;
    }
    if (req.query.mine === "true") filter.userId = req.user._id;
    send(res, await Profile.find(filter).sort({ createdAt: -1 }).limit(500));
  });
  app.post("/api/alumni", auth, admin, async (req, res) =>
    send(res, await Profile.create(profileSchema.parse(req.body)), 201),
  );
  app.get("/api/alumni/:id", auth, load(Profile), (req, res) =>
    send(res, req.record),
  );
  app.put("/api/alumni/:id", auth, load(Profile), async (req, res) => {
    if (
      req.user.role !== "admin" &&
      String(req.record.userId) !== String(req.user._id)
    )
      throw fail(403, "You can edit only your profile.");
    const data = profileSchema.parse(req.body);
    if (req.record.userId && data.email !== req.record.email)
      throw fail(400, "Account email cannot be changed in this prototype.");
    Object.assign(req.record, data);
    await req.record.save();
    send(res, req.record);
  });
  app.delete(
    "/api/alumni/:id",
    auth,
    admin,
    load(Profile),
    async (req, res) => {
      if (req.record.userId) {
        await Event.updateMany({}, { $pull: { attendees: req.record.userId } });
        await User.deleteOne({ _id: req.record.userId, role: "alumni" });
      }
      await req.record.deleteOne();
      send(res, { deleted: true });
    },
  );
  app.get("/api/events", auth, async (req, res) => {
    const rows = await Event.find()
      .sort({ eventDate: 1 })
      .populate("attendees", "name email");
    send(
      res,
      rows.map((e) => {
        const o = e.toObject();
        return {
          ...o,
          registered: e.attendees.some(
            (u) => String(u._id) === String(req.user._id),
          ),
          attendeeCount: e.attendees.length,
          attendees: req.user.role === "admin" ? e.attendees : undefined,
        };
      }),
    );
  });
  app.post("/api/events", auth, admin, async (req, res) =>
    send(
      res,
      await Event.create({
        ...eventSchema.parse(req.body),
        createdBy: req.user._id,
      }),
      201,
    ),
  );
  app.put("/api/events/:id", auth, admin, load(Event), async (req, res) => {
    Object.assign(req.record, eventSchema.parse(req.body));
    await req.record.save();
    send(res, req.record);
  });
  app.delete("/api/events/:id", auth, admin, load(Event), async (req, res) => {
    await req.record.deleteOne();
    send(res, { deleted: true });
  });
  app.post("/api/events/:id/register", auth, load(Event), async (req, res) => {
    if (req.user.role !== "alumni")
      throw fail(403, "Only alumni can register.");
    if (req.record.eventDate <= new Date())
      throw fail(400, "This event has ended.");
    await Event.updateOne(
      { _id: req.record._id },
      { $addToSet: { attendees: req.user._id } },
    );
    send(res, { registered: true });
  });
  app.use((req, res, next) => next(fail(404, "Endpoint not found.")));
  app.use((err, req, res, next) => {
    let status = err.status || 500,
      message = err.message;
    if (err.name === "ZodError") {
      status = 400;
      message = err.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
    }
    if (err.code === 11000) {
      status = 409;
      message = "Email or roll number already exists.";
    }
    if (status === 500) {
      console.error(err.name);
      message = "Unexpected server error.";
    }
    res.status(status).json({ success: false, message });
  });
  return app;
}
