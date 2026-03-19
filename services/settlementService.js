import { supabase } from "@/lib/supabaseClient";

/**
 * Record a settlement between two users in a group.
 *
 * currentUserId = payer
 * otherUserId   = receiver
 */
export async function settleUp(groupId, currentUserId, otherUserId, amount) {
  try {
    if (!groupId) return { success: false, error: "groupId is required" };
    if (!currentUserId)
      return { success: false, error: "currentUserId is required" };
    if (!otherUserId) return { success: false, error: "otherUserId is required" };

    const amt = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return { success: false, error: "amount must be > 0" };
    }

    // Assumes a `settlements` table exists in Supabase.
    const { data, error } = await supabase
      .from("settlements")
      .insert({
        group_id: groupId,
        payer_id: currentUserId,
        receiver_id: otherUserId,
        amount: amt,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
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

