"use server";

import { createServerSupabase } from "./supabase/server";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const supabase = await createServerSupabase();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function signIn(formData: FormData) {
  const supabase = await createServerSupabase();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}