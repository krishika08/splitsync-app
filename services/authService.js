import { supabase } from "@/lib/supabaseClient";

export async function signup(email, password, username) {
  try {
    if (!username || username.trim().length < 3) {
      return { success: false, error: "Username must be at least 3 characters" };
    }

    // Validate username format: alphanumeric + underscores, 3-20 chars
    const usernameClean = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(usernameClean)) {
      return {
        success: false,
        error: "Username can only contain letters, numbers, and underscores (3-20 chars)",
      };
    }

    // Check if username is already taken
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", usernameClean)
      .maybeSingle();

    if (existing) {
      return { success: false, error: "Username is already taken" };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return { success: false, error: error.message };

    if (data?.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email: data.user.email,
        username: usernameClean,
      });

      if (profileError) {
        console.error("Profile insert error:", profileError);
        // Don't fail signup entirely if profile insert fails,
        // but log it — the user can still work.
      }
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data?.user ?? null };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Fetch the current user's username from the profiles table.
 */
export async function getCurrentUsername() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data?.username || user.email?.split("@")[0] || "User" };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}