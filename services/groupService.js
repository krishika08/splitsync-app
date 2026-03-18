import { supabase } from "@/lib/supabaseClient";

// Create a new group and add the creator as the first member
export async function createGroup(name) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("groups")
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Automatically add the creator as a member
    const memberResult = await addMember(data.id, user.id);
    if (!memberResult.success) return memberResult;

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Add a user to a group
export async function addMember(groupId, userId) {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userId })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Get all groups a user is a member of (via group_members junction table)
export async function getUserGroups(userId) {
  try {
    if (!userId) {
      return { success: false, error: "User ID is required" };
    }

    const { data, error } = await supabase
      .from("group_members")
      .select("groups(id, name, created_at)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false, referencedTable: "groups" });

    if (error) return { success: false, error: error.message };

    // Unwrap the nested groups object from each row
    const cleaned = data.map((row) => row.groups).filter(Boolean);

    return { success: true, data: cleaned };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

