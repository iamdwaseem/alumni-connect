import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
const app = createApp({
  secret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL,
});
await mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
});
const server = app.listen(process.env.PORT || 5000, "0.0.0.0", () =>
  console.log("Alumni Connect API ready"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    }),
  );
