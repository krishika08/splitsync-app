import { supabase } from "@/lib/supabaseClient";

/**
 * Send a notification to a specific user.
 */
export async function sendNotification({ userId, type, title, message, groupId = null, actorId = null }) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      group_id: groupId,
      actor_id: actorId,
    });
    if (error) {
      console.error("[sendNotification] Error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("[sendNotification] Unexpected error:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Send notifications to all group members except the actor.
 */
export async function notifyGroupMembers({ groupId, actorId, type, title, message }) {
  try {
    // Get all group members
    const { data: members, error: memberError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (memberError) {
      console.error("[notifyGroupMembers] Fetch members error:", memberError);
      return { success: false, error: memberError.message };
    }

    if (!members || members.length === 0) return { success: true };

    // Filter out the actor (don't notify yourself)
    const recipients = members.filter(m => m.user_id !== actorId);

    if (recipients.length === 0) return { success: true };

    // Batch insert
    const rows = recipients.map(r => ({
      user_id: r.user_id,
      type,
      title,
      message,
      group_id: groupId,
      actor_id: actorId,
    }));

    const { error } = await supabase.from("notifications").insert(rows);
    if (error) {
      console.error("[notifyGroupMembers] Insert error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[notifyGroupMembers] Unexpected error:", err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Get all notifications for the current user (last 50 most recent).
 */
export async function getNotifications() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Get the count of unread notifications for the current user.
 */
export async function getUnreadCount() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Not authenticated", data: 0 };

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return { success: false, error: error.message, data: 0 };
    return { success: true, data: count || 0 };
  } catch (err) {
    return { success: false, error: err?.message || String(err), data: 0 };
  }
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllAsRead() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Not authenticated" };

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Subscribe to new notifications in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeToNotifications(userId, onNewNotification) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewNotification(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
