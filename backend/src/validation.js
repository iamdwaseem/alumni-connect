import { z } from "zod";
const text = z.string().trim().max(200);
export const profileSchema = z.object({
  fullName: text.min(2),
  email: z.email().transform((v) => v.toLowerCase()),
  rollNumber: text.min(2),
  branch: text.min(1),
  graduationYear: z.coerce.number().int().min(1950).max(2100),
  phone: text.default(""),
  location: text.default(""),
  company: text.default(""),
  jobTitle: text.default(""),
  skills: z.array(text).max(30).default([]),
  achievements: z.array(text).max(30).default([]),
  linkedInUrl: z
    .union([
      z.url().refine((v) => v.startsWith("https://"), "Use an HTTPS URL"),
      z.literal(""),
    ])
    .default(""),
});
export const registerSchema = profileSchema.extend({
  password: z.string().min(10).max(72),
});
export const loginSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(72),
});
export const eventSchema = z.object({
  title: text.min(3),
  description: z.string().trim().min(5).max(3000),
  eventDate: z.iso
    .datetime({ offset: true })
    .refine((v) => Date.parse(v) > Date.now(), "Choose a future date"),
  venue: text.min(2),
});
