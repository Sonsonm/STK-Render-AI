"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionResult {
  error?: string;
  message?: string;
}

function validateEmail(email: string): string | null {
  if (!email || email.trim() === "") return "Email e obrigatorio.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email invalido.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 6) return "Senha deve ter pelo menos 6 caracteres.";
  return null;
}

export async function login(
  _prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email ou senha invalidos." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prevState: AuthActionResult | undefined,
  formData: FormData
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!fullName) return { error: "Nome e obrigatorio." };
  if (fullName.length < 2) return { error: "Nome muito curto." };

  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };

  const passwordErr = validatePassword(password);
  if (passwordErr) return { error: passwordErr };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "Este email ja esta cadastrado. Faca login." };
    }
    return { error: "Nao foi possivel criar a conta. Tente novamente." };
  }

  redirect("/auth/confirm-email");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
