import { supabase } from "@/lib/supabaseClient";
import { calculateBalances, simplifyDebts } from "./expenseService";

/**
 * Settle up a debt between a payer and receiver in a group.
 */
export async function settleUp(groupId, payerId, receiverId) {
  try {
    if (!groupId) return { success: false, error: "groupId is required" };
    if (!payerId) return { success: false, error: "payerId is required" };
    if (!receiverId) return { success: false, error: "receiverId is required" };

    // 1. Delete a settlement from "settlements" table
    const { error: deleteError } = await supabase
      .from("settlements")
      .delete()
      .eq("group_id", groupId)
      .eq("payer_id", payerId)
      .eq("receiver_id", receiverId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // 2. Recalculate balances
    const balancesRes = await calculateBalances(groupId);
    if (!balancesRes.success) {
      return { success: false, error: balancesRes.error };
    }

    // 3. Recompute simplified debts
    const debts = simplifyDebts(balancesRes.data);
    const transactions = debts.map((d) => ({
      payer_id: d.from,
      receiver_id: d.to,
      amount: d.amount,
    }));

    // 4. Save updated settlements
    const settlementsRes = await saveSettlements(groupId, transactions);
    if (!settlementsRes.success) {
      return { success: false, error: settlementsRes.error };
    }

    return { success: true, data: settlementsRes.data };
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

/**
 * Get all settlements for a group.
 */
export async function getSettlements(groupId) {
  try {
    if (!groupId) return { success: false, error: "groupId is required" };

    const { data, error } = await supabase
      .from("settlements")
      .select("*")
      .eq("group_id", groupId);

    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

