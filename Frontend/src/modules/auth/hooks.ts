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

  // 🚀 HELPER: Translates technical Supabase errors into user-friendly messages
  const getFriendlyErrorMessage = (rawMessage: string) => {
    const msg = rawMessage.toLowerCase();
    
    if (msg.includes("invalid login credentials")) {
      return "The mobile number or password you entered is incorrect.";
    }
    if (msg.includes("network request failed") || msg.includes("failed to fetch")) {
      return "Network error. Please check your internet connection and try again.";
    }
    if (msg.includes("too many requests") || msg.includes("rate limit")) {
      return "Too many failed attempts. Please wait a few minutes and try again.";
    }
    if (msg.includes("email not confirmed") || msg.includes("not verified")) {
      return "Your account is pending activation. Please contact your manager.";
    }
    
    // Fallback for any other unknown errors
    return "An unexpected error occurred while logging in. Please try again.";
  };

  const submit = form.handleSubmit(async (values) => {
    setLoading(true);
    try {
      const { error } = await loginUser(values);
      if (error) {
        // Pass the translated, friendly error message to the UI
        onError(getFriendlyErrorMessage(error.message));
      } else {
        onSuccess();
      }
    } catch (err: any) {
      // Catch unexpected crashes
      onError(getFriendlyErrorMessage(err?.message || ""));
    } finally {
      setLoading(false);
    }
  });

  return { form, submit, loading };
}