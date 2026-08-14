import { z } from "zod";

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name is too short").max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().regex(/^01[0-9]{9}$/, "Enter a valid 11-digit Bangladesh phone number"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or phone number"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^01[0-9]{9}$/, "Enter the phone number used for this account"),
});

export const uploadFileSchema = z.object({
  title: z.string().trim().min(5).max(150),
  description: z.string().trim().max(2000).optional(),
  category: z.enum([
    "notes", "quiz_questions", "mid_questions", "final_questions",
    "assignment", "lab_report", "project", "presentation_slide", "research_report",
  ]),
  courseId: z.string().uuid("Please select a course."),
  departmentId: z.string().uuid("Please select a department."),
  teacherId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(new Date().getFullYear()).optional(),
  semester: z.enum(["Spring", "Summer", "Fall"]).optional(),
  language: z.enum(["bn", "en"]).default("bn"),
  pricingType: z.enum(["free", "paid"]),
  priceCents: z.coerce.number().int().min(0).max(100000), // ৳1000 max
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});

// EWU student email format: 2022-3-60-070@std.ewubd.edu
// Capture group 1 is the student ID portion (2022-3-60-070).
export const EWU_STUDENT_EMAIL_REGEX = /^(\d{4}-\d-\d{2}-\d{3})@std\.ewubd\.edu$/i;

export const universityEmailSchema = z.object({
  universityEmail: z
    .string()
    .trim()
    .toLowerCase()
    .regex(EWU_STUDENT_EMAIL_REGEX, "Use your EWU student email, e.g. 2022-3-60-070@std.ewubd.edu"),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const reportFileSchema = z.object({
  fileId: z.string().uuid(),
  reason: z.enum(["wrong_course", "fake_file", "duplicate", "blank_pdf", "copyright", "spam", "other"]),
  details: z.string().trim().max(1000).optional(),
});

export const reviewSchema = z.object({
  fileId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().trim().length(6, "Enter the 6-digit code from your email"),
});
