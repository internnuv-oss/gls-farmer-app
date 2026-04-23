import { supabase } from "../../../core/supabase";
import { LoginForm, RegisterForm } from "../schema";

export async function registerUser(values: RegisterForm) {
  // 1. Sign up the user in auth.users. 
  // The database trigger will automatically catch this and create the profile.
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: `${values.mobile}@gmail.com`, 
    password: values.password,
    options: { 
      // We pass all necessary fields into the user_metadata so your DB trigger can access them
      data: { 
        name: values.name, 
        mobile: values.mobile,
        role: 'SE' // Passing the role here so the trigger knows what to set
      } 
    },
  });

  if (authError) return { error: authError, data: null };

  // 2. No manual .insert() needed here anymore! 
  // The backend handles the 'profiles' row creation automatically.

  return { data: authData, error: null };
}

export async function loginUser(values: LoginForm) {
  return supabase.auth.signInWithPassword({
    email: `${values.mobile}@gmail.com`, 
    password: values.password,
  });
}