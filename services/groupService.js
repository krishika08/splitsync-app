import { supabase } from "@/lib/supabaseClient";

// Create a new group and add the creator as the first member
export async function createGroup(name, userId) {
  const { data, error } = await supabase
    .from("groups")
    .insert({ name, created_by: userId })
    .select()
    .single();

  if (error) throw error;

  // Automatically add the creator as a member
  await addMember(data.id, userId);

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
export async function getUserGroups(userId) {
  const { data, error } = await supabase
    .from("group_members")
    .select("groups(id, name, created_at)")
    .eq("user_id", userId);

  if (error) throw error;

  // Return a clean array of group objects
  return data.map((entry) => entry.groups);
}
