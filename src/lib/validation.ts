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

export const todoCreateSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().nullable(),
    remindAt: z.string().refine(
      (val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        // Allow dates up to 1 hour in the past (for timezone/clock differences)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return date >= oneHourAgo;
      },
      {
        message: "Reminder time must be a valid date and not in the past",
      }
    ),
    repeatType: repeatTypeEnum,
    repeatDays: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.repeatType === "WEEKLY") {
        return data.repeatDays && data.repeatDays.trim().length > 0;
      }
      return true;
    },
    {
      message: "repeatDays is required when repeatType is WEEKLY",
      path: ["repeatDays"],
    }
  );

export const todoUpdateSchema = z
  .object({
    title: z.string().min(1, "Title is required").optional(),
    description: z.string().optional().nullable(),
    remindAt: z
      .string()
      .refine(
        (val) => {
          const date = new Date(val);
          if (isNaN(date.getTime())) return false;
          // Allow dates up to 1 hour in the past
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return date >= oneHourAgo;
        },
        {
          message: "Reminder time must be a valid date and not in the past",
        }
      )
      .optional(),
    repeatType: repeatTypeEnum.optional(),
    repeatDays: z.string().optional().nullable(),
    isCompleted: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.repeatType === "WEEKLY" && data.repeatDays !== undefined) {
        return data.repeatDays === null || data.repeatDays.trim().length > 0;
      }
      return true;
    },
    {
      message: "repeatDays cannot be empty when repeatType is WEEKLY",
      path: ["repeatDays"],
    }
  );

