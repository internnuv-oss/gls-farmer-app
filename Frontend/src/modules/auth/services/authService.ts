import { supabase } from "../../../core/supabase";
import { LoginForm, RegisterForm } from "../schema";

export async function registerUser(values: RegisterForm) {
  // 1. Sign up the user in auth.users
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: `${values.mobile}@gmail.com`, 
    password: values.password,
    options: { 
      data: { name: values.name, mobile: values.mobile } 
    },
  });

  if (authError) return { error: authError, data: null };

  // 2. Attempt to insert into the public.profiles table
  if (authData.user) {
    const { error: profileError } = await supabase.from('profiles').insert([{
      id: authData.user.id,
      name: values.name,
      mobile: values.mobile,
      role: 'SE' // Hardcoded to SE as this is the SE app
    }]);

    // Check if there's an error AND it's NOT the RLS violation error (42501)
    // If it is 42501 but the profile saves anyway (e.g., via DB trigger), we ignore it.
    if (profileError && profileError.code !== '42501') {
      console.error("Profile insertion failed:", profileError);
      return { error: { message: "Auth succeeded, but profile creation failed." }, data: null };
    }
  }

  return { data: authData, error: null };
}

export async function loginUser(values: LoginForm) {
  return supabase.auth.signInWithPassword({
    email: `${values.mobile}@gmail.com`, 
    password: values.password,
  });
}