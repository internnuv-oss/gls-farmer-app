import { z } from "zod";

// Helper to calculate age strictly from DD-MM-YYYY format
const calculateAge = (dob: string) => {
  if (!dob) return 0;
  const [day, month, year] = dob.split('-').map(Number);
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const registerSchema = z.object({
  firstName: z.string().min(2, "First Name is required"),
  lastName: z.string().min(2, "Last Name is required"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  dob: z.string().min(1, "Date of Birth is required").refine((date) => calculateAge(date) >= 18, {
    message: "You must be at least 18 years old to register",
  }),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  password: z.string().min(6, "Password is required"),
});

export type LoginForm = z.infer<typeof loginSchema>;