/**
 * Calculate balances for a given group.
 *
 * For now this returns an empty list so the UI can
 * render safely. You can later replace this with a
 * real Supabase-backed implementation.
 */
export async function calculateBalances(groupId) {
  try {
    if (!groupId) {
      return { success: false, error: "Group ID is required" };
    }

    // Placeholder: no balances yet
    return { success: true, data: [] };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

