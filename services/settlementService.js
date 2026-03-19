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

