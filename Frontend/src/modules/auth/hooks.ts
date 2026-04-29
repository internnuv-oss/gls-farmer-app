import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormValues, loginSchema, LoginForm } from "./schema";
import { registerUser, loginUser } from "./services/authService";

export function useRegisterForm(
  onSuccess: (message: string) => void,
  onError: (message: string) => void
) {
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      firstName: "", 
      lastName: "", 
      email: "",
      mobile: "", 
      password: "", 
      confirmPassword: "",
      dob: "" // 🚀 Defaults to empty string for DD-MM-YYYY format
    }
  });

  const submit = form.handleSubmit(async (values) => {
    setLoading(true);
    try {
      const { error } = await registerUser(values);
      if (error) {
        onError(error.message);
      } else {
        onSuccess("Account created successfully! Please login with your new credentials.");
      }
    } finally {
      setLoading(false);
    }
  });

  return { form, submit, loading };
}

export function useLoginForm(
  onSuccess: () => void,
  onError: (message: string) => void
) {
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: "", password: "" }
  });

  const submit = form.handleSubmit(async (values) => {
    setLoading(true);
    try {
      const { error } = await loginUser(values);
      if (error) {
        onError("Invalid mobile number or password.");
      } else {
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  });

  return { form, submit, loading };
}