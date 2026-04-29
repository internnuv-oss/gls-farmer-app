import { supabase } from "../../../core/supabase";
import { LoginForm, RegisterFormValues } from "../schema";

export async function registerUser(values: RegisterFormValues) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: `${values.mobile}@gmail.com`, 
    password: values.password,
    options: {
      data: {
        first_name: values.firstName,
        last_name: values.lastName,
        real_email: values.email, 
        mobile: values.mobile,
        dob: values.dob,
        role: 'SE'
      }
    },
  });

  if (authError) return { error: authError, data: null };
  return { data: authData, error: null };
}

export async function loginUser(values: LoginForm) {
  return supabase.auth.signInWithPassword({
    email: `${values.mobile}@gmail.com`, 
    password: values.password,
  });
}