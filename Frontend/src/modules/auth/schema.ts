import { z } from "zod";

export const registerSchema = z
  .object({
    name: z.string().min(2),
    mobile: z.string().min(10),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  mobile: z.string().min(10),
  password: z.string().min(6),
});

export type RegisterForm = z.infer<typeof registerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
