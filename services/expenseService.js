import { supabase } from "@/lib/supabaseClient";

export async function createExpense({
  groupId,
  paidBy,
  amount,
  description,
  members,
}) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };
    if (amount === undefined || amount === null)
      return { success: false, error: "Amount is required" };
    if (!description)
      return { success: false, error: "Description is required" };
    if (!Array.isArray(members) || members.length === 0) {
      return { success: false, error: "Members list is required" };
    }

    const uniqueMembers = Array.from(
      new Set(members.filter((m) => typeof m === "string" && m.trim().length))
    );
    if (uniqueMembers.length === 0) {
      return { success: false, error: "Members list is required" };
    }

    const amountNum = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return { success: false, error: "Amount must be a positive number" };
    }

    // With RLS as currently defined, `paid_by` must be the current authenticated user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }
    if (paidBy && paidBy !== user.id) {
      return { success: false, error: "paidBy must match current user" };
    }

    // 1) Insert expense
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        group_id: groupId,
        paid_by: user.id,
        amount: amountNum,
        description,
      })
      .select()
      .single();

    if (expenseError) return { success: false, error: expenseError.message };

    // 2) Calculate equal split among members (in cents to avoid float drift)
    const centsTotal = Math.round(amountNum * 100);
    const n = uniqueMembers.length;
    const baseCents = Math.floor(centsTotal / n);
    const remainder = centsTotal - baseCents * n;

    const splitsToInsert = uniqueMembers.map((memberId, idx) => {
      const cents = baseCents + (idx < remainder ? 1 : 0);
      return {
        expense_id: expense.id,
        user_id: memberId,
        amount: Number((cents / 100).toFixed(2)),
      };
    });

    // 3) Insert expense_splits
    const { data: splits, error: splitsError } = await supabase
      .from("expense_splits")
      .insert(splitsToInsert)
      .select();

    if (splitsError) {
      return { success: false, error: splitsError.message };
    }

    // 4) Return structured response
    return { success: true, data: { expense, splits } };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

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
