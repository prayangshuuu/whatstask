import { z } from "zod";

// Auth schemas
export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Todo schemas
const repeatTypeEnum = z.enum(["NONE", "DAILY", "WEEKLY"]);

// Helper to validate time format HH:MM
const timeOfDaySchema = z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
  message: "Time must be in HH:MM format (24-hour)",
});

export const todoCreateSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().nullable(),
    repeatType: repeatTypeEnum,
    // For NONE: remindAt (ISO datetime string)
    remindAt: z.string().optional(),
    // For DAILY/WEEKLY: timeOfDay (HH:MM)
    timeOfDay: z.string().optional(),
    // For WEEKLY: repeatDays (comma-separated or array)
    repeatDays: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.repeatType === "NONE") {
        if (!data.remindAt) {
          return false;
        }
        const date = new Date(data.remindAt);
        if (isNaN(date.getTime())) return false;
        // Allow dates up to 1 hour in the past
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return date >= oneHourAgo;
      }
      return true;
    },
    {
      message: "remindAt is required and must be a valid future date for one-time reminders",
      path: ["remindAt"],
    }
  )
  .refine(
    (data) => {
      if (data.repeatType === "DAILY" || data.repeatType === "WEEKLY") {
        if (!data.timeOfDay) {
          return false;
        }
        return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(data.timeOfDay);
      }
      return true;
    },
    {
      message: "timeOfDay is required and must be in HH:MM format for daily/weekly reminders",
      path: ["timeOfDay"],
    }
  )
  .refine(
    (data) => {
      if (data.repeatType === "WEEKLY") {
        if (!data.repeatDays) {
          return false;
        }
        const days = Array.isArray(data.repeatDays)
          ? data.repeatDays
          : data.repeatDays.split(",").map((d) => d.trim());
        return days.length > 0 && days.every((d) => ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].includes(d.toUpperCase()));
      }
      return true;
    },
    {
      message: "repeatDays is required and must include at least one valid weekday (SUN-SAT) for weekly reminders",
      path: ["repeatDays"],
    }
  );

export const todoUpdateSchema = z
  .object({
    title: z.string().min(1, "Title is required").optional(),
    description: z.string().optional().nullable(),
    repeatType: repeatTypeEnum.optional(),
    // For NONE: remindAt (ISO datetime string)
    remindAt: z.string().optional(),
    // For DAILY/WEEKLY: timeOfDay (HH:MM)
    timeOfDay: z.string().optional(),
    // For WEEKLY: repeatDays
    repeatDays: z.union([z.string(), z.array(z.string())]).optional().nullable(),
    isCompleted: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // If switching to NONE, require remindAt
      if (data.repeatType === "NONE" && data.remindAt !== undefined) {
        if (!data.remindAt) {
          return false;
        }
        const date = new Date(data.remindAt);
        if (isNaN(date.getTime())) return false;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return date >= oneHourAgo;
      }
      return true;
    },
    {
      message: "remindAt is required and must be a valid future date when repeatType is NONE",
      path: ["remindAt"],
    }
  )
  .refine(
    (data) => {
      // If switching to DAILY or WEEKLY, require timeOfDay
      if ((data.repeatType === "DAILY" || data.repeatType === "WEEKLY") && data.timeOfDay !== undefined) {
        if (!data.timeOfDay) {
          return false;
        }
        return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(data.timeOfDay);
      }
      return true;
    },
    {
      message: "timeOfDay is required and must be in HH:MM format for daily/weekly reminders",
      path: ["timeOfDay"],
    }
  )
  .refine(
    (data) => {
      // If switching to WEEKLY, require repeatDays
      if (data.repeatType === "WEEKLY" && data.repeatDays !== undefined) {
        if (!data.repeatDays) {
          return false;
        }
        const days = Array.isArray(data.repeatDays)
          ? data.repeatDays
          : data.repeatDays.split(",").map((d) => d.trim());
        return days.length > 0 && days.every((d) => ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].includes(d.toUpperCase()));
      }
      return true;
    },
    {
      message: "repeatDays is required and must include at least one valid weekday for weekly reminders",
      path: ["repeatDays"],
    }
  );

