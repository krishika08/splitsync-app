import { supabase } from "@/lib/supabaseClient";

// Create a new group and add the creator as the first member
export async function createGroup(name) {
  // Always resolve the user inside the service — avoids stale userId from props
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("groups")
    .insert({ name, created_by: user.id })
    .select()
    .single();

  if (error) throw error;

  // Automatically add the creator as a member
  await addMember(data.id, user.id);

  return data;
}

// Add a user to a group
export async function addMember(groupId, userId) {
  const { data, error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId })
    .select()
    .single();

  if (error) throw error;

  return data;
}

// Get all groups that a user belongs to
export async function getUserGroups() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("group_members")
    .select("groups(id, name, created_at)")
    .eq("user_id", user.id);

  if (error) throw error;

  // Return a clean array of group objects
  return data.map((entry) => entry.groups);
}
