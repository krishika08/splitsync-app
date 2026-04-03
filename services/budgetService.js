import { supabase } from "@/lib/supabaseClient";

/**
 * Get the budget for a specific month.
 * monthYear format: '2026-04'
 */
export async function getBudget(monthYear) {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("monthly_budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || null };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Upsert (create or update) a monthly budget.
 */
export async function setBudget({ monthYear, totalLimit, categoryLimits = {} }) {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Not authenticated" };

    // Check if budget exists
    const { data: existing } = await supabase
      .from("monthly_budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("month_year", monthYear)
      .maybeSingle();

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from("monthly_budgets")
        .update({
          total_limit: Number(totalLimit),
          category_limits: categoryLimits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } else {
      // Insert
      const { data, error } = await supabase
        .from("monthly_budgets")
        .insert({
          user_id: user.id,
          month_year: monthYear,
          total_limit: Number(totalLimit),
          category_limits: categoryLimits,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    }
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Delete a monthly budget.
 */
export async function deleteBudget(monthYear) {
  try {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("monthly_budgets")
      .delete()
      .eq("user_id", user.id)
      .eq("month_year", monthYear);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}
