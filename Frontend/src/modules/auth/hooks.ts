import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/authStore";
import { loginUser, registerUser } from "./services/authService";
import { LoginForm, RegisterForm, loginSchema, registerSchema } from "./schema";

export function useRegisterForm(
  onSuccess: (message: string) => void, 
  onError: (message: string) => void
) {
  const [loading, setLoading] = useState(false);
  const form = useForm<RegisterForm>({ 
    resolver: zodResolver(registerSchema), 
    defaultValues: { name: "", mobile: "", password: "", confirmPassword: "" } 
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
      const { error, data } = await loginUser(values);
      if (error) {
        onError(error.message);
      } else {
        useAuthStore.getState().setUser({
          id: data.user?.id ?? "",
          name: String(data.user?.user_metadata?.name ?? "Sales Executive"),
          mobile: values.mobile,
        });
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  });
  
  return { form, submit, loading };
}