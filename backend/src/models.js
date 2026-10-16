import mongoose from "mongoose";
const { Schema } = mongoose;
const fields = {
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  rollNumber: { type: String, required: true, unique: true },
  branch: String,
  graduationYear: Number,
  phone: String,
  location: String,
  company: String,
  jobTitle: String,
  skills: [String],
  achievements: [String],
  linkedInUrl: String,
};
export const User = mongoose.model(
  "User",
  new Schema(
    {
      name: String,
      email: { type: String, unique: true, required: true },
      passwordHash: { type: String, required: true, select: false },
      role: { type: String, enum: ["admin", "alumni"], default: "alumni" },
    },
    { timestamps: true },
  ),
);
export const Profile = mongoose.model(
  "Profile",
  new Schema(
    {
      ...fields,
      userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    },
    { timestamps: true },
  ),
);
export const Event = mongoose.model(
  "Event",
  new Schema(
    {
      title: String,
      description: String,
      eventDate: Date,
      venue: String,
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      attendees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true },
  ),
);
