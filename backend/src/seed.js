import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Profile, Event } from "./models.js";
if (
  !process.env.ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD.length < 12 ||
  process.env.ADMIN_PASSWORD === "SET_A_UNIQUE_PASSWORD"
)
  throw Error(
    "Set a unique ADMIN_PASSWORD (12+ characters) in backend/.env first.",
  );
await mongoose.connect(process.env.MONGO_URI);
try {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  let admin = await User.findOne({ email });
  if (admin && admin.role !== "admin")
    throw Error("Email belongs to a non-admin account. Choose another email.");
  if (!admin)
    admin = await User.create({
      name: "College Administrator",
      email,
      role: "admin",
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    });
  const names = [
    "Ananya Rao",
    "Vikram Shah",
    "Meera Iyer",
    "Arjun Reddy",
    "Diya Menon",
    "Rohan Das",
  ];
  for (const [i, fullName] of names.entries())
    await Profile.updateOne(
      { rollNumber: `DEMO${i + 1}` },
      {
        $setOnInsert: {
          fullName,
          email: `alumni${i + 1}@example.com`,
          rollNumber: `DEMO${i + 1}`,
          branch: ["CSE", "IT", "ECE"][i % 3],
          graduationYear: 2020 + i,
          company: ["Microsoft", "Deloitte", "Infosys"][i % 3],
          jobTitle: ["Software Engineer", "Data Analyst", "Product Engineer"][
            i % 3
          ],
          location: "Hyderabad",
          skills: ["JavaScript", "Problem solving"],
          achievements: ["Demo record"],
        },
      },
      { upsert: true },
    );
  if (!(await Event.exists({ title: "Alumni Career Circle" })))
    await Event.create({
      title: "Alumni Career Circle",
      description:
        "A friendly conversation about first jobs, career changes and lessons learned.",
      venue: "VNR VJIET Auditorium",
      eventDate: new Date(Date.now() + 14 * 86400000),
      createdBy: admin._id,
    });
  console.log(
    "Seed complete. Sign in with ADMIN_EMAIL and ADMIN_PASSWORD from backend/.env. Existing admin password was not changed.",
  );
} finally {
  await mongoose.disconnect();
}
