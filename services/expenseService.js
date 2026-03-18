import { supabase } from "@/lib/supabaseClient";

// Add a new expense to a group
export async function addExpense(groupId, amount, description) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        group_id: groupId,
        amount,
        description,
        paid_by: user.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Get all expenses for a group
export async function getExpenses(groupId) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };

    const { data, error } = await supabase
      .from("expenses")
      .select("id, amount, description, paid_by, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
