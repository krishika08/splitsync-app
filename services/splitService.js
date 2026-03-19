import { supabase } from "@/lib/supabaseClient";

/**
 * Create split rows for a given expense.
 *
 * @param {string|number} expenseId - ID of the expense to attach splits to
 * @param {{ user_id: string | number, amount: number }[]} splits - array of split entries
 */
export async function createSplits(expenseId, splits) {
  try {
    if (!expenseId) {
      return { success: false, error: "expenseId is required" };
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      return { success: false, error: "At least one split is required" };
    }

    const cleanedSplits = splits
      .filter(
        (s) =>
          s &&
          s.user_id &&
          Number.isFinite(
            typeof s.amount === "number" ? s.amount : Number(s.amount)
          )
      )
      .map((s) => ({
        expense_id: expenseId,
        user_id: s.user_id,
        amount:
          typeof s.amount === "number" ? s.amount : Number(s.amount),
      }));

    if (cleanedSplits.length === 0) {
      return { success: false, error: "No valid splits to insert" };
    }

    const { data, error } = await supabase
      .from("expense_splits")
      .insert(cleanedSplits)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

