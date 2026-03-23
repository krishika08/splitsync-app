import { supabase } from "@/lib/supabaseClient";
import { createExpenseAndUpdate } from "./expenseService";

/**
 * Settle up a debt between a payer and receiver in a group by creating an offsetting payment expense.
 */
export async function settleUp(groupId, payerId, receiverId, amount) {
  try {
    if (!groupId) return { success: false, error: "groupId is required" };
    if (!payerId) return { success: false, error: "payerId is required" };
    if (!receiverId) return { success: false, error: "receiverId is required" };
    if (!amount) return { success: false, error: "amount is required" };

    return await createExpenseAndUpdate({
      groupId,
      paidBy: payerId,
      amount: Number(amount),
      description: "Settle Up",
      members: [receiverId]
    });
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Save computed settlements for a group.
 * Deletes old settlements before inserting new ones.
 */
export async function saveSettlements(groupId, transactions) {
  try {
    if (!groupId) return { success: false, error: "groupId is required" };
    if (!Array.isArray(transactions)) {
      return { success: false, error: "transactions must be an array" };
    }

    // 1. Delete old settlements
    const { error: deleteError } = await supabase
      .from("settlements")
      .delete()
      .eq("group_id", groupId);

    if (deleteError) return { success: false, error: deleteError.message };

    // 2. If no new transactions, return empty
    if (transactions.length === 0) {
      return { success: true, data: [] };
    }

    // 3. Prepare new settlements
    const rows = transactions.map((t) => ({
      group_id: groupId,
      payer_id: t.payer_id,
      receiver_id: t.receiver_id,
      amount: t.amount,
    }));

    // 4. Insert new settlements
    const { data, error: insertError } = await supabase
      .from("settlements")
      .insert(rows)
      .select();

    if (insertError) return { success: false, error: insertError.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

import { calculateBalances } from "./expenseService";

/**
 * Get all settlements for a group by calculating who owes whom.
 */
export async function getSettlements(groupId) {
  try {
    if (!groupId) return { success: false, error: "groupId is required" };

    // Simply delegate to calculateBalances which runs this sequential pipeline:
    // 1) Fetch expenses
    // 2) Fetch splits 
    // 3) Build balance map
    // 4) simplifyDebts(balances) -> { payer_id, receiver_id, amount }
    return await calculateBalances(groupId);

  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

