import { supabase } from "@/lib/supabaseClient";
import { notifyGroupMembers, sendNotification } from "./notificationService";

/**
 * Helper to securely map a username to a user ID.
 */
export async function getUserIdByUsername(username) {
  try {
    const cleanUsername = username.trim().toLowerCase();
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", cleanUsername)
      .single();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "User not found with that username" };
    return { success: true, data: data.id };
  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

// Create a new group and add the creator as the first member
export async function createGroup(name, type = "group") {
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
      .insert({
        name: name.trim(),
        created_by: user.id,
        type: type
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Automatically add the creator as a member
    const memberResult = await addMemberToGroup(data.id, user.id);
    if (!memberResult.success) return memberResult;

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Add a user to a group by username or userId
export async function addMemberToGroup(groupId, identifier) {
  try {
    let userId = identifier;
    
    // If identifier looks like a username (no @, not a UUID pattern), convert it
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    if (!isUuid && !identifier.includes("@")) {
      // Treat as username
      const cleanUsername = identifier.toLowerCase().trim();
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .single();
      if (error || !data) {
        return { success: false, error: "User not found. Make sure the username is correct." };
      }
      userId = data.id;
    } else if (identifier.includes("@")) {
      // Legacy email support (fallback)
      const sanitizedEmail = identifier.toLowerCase().trim();
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", sanitizedEmail)
        .single();
      if (error || !data) {
        return { success: false, error: "User must sign up first" };
      }
      userId = data.id;
    }

    const { data, error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return { success: false, error: "User is already a member" };
      return { success: false, error: error.message };
    }

    // Notify existing members that someone joined (fire-and-forget)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", currentUser?.id)
        .single();
      const { data: newMemberProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .single();
      const actorName = actorProfile?.username || "Someone";
      const newMemberName = newMemberProfile?.username || "A new member";

      // Notify existing group members
      notifyGroupMembers({
        groupId,
        actorId: currentUser?.id,
        type: "member_joined",
        title: "New Member",
        message: `@${actorName} added @${newMemberName} to the group`,
      });

      // Notify the invited user themselves
      if (userId !== currentUser?.id) {
        sendNotification({
          userId,
          type: "member_joined",
          title: "You were added to a group",
          message: `@${actorName} added you to a group`,
          groupId,
          actorId: currentUser?.id,
        });
      }
    } catch (notifErr) {
      console.warn("[addMemberToGroup] Notification failed (non-blocking):", notifErr);
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Get all members of a group with username + email details
export async function getGroupMembers(groupId) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };

    const { data, error } = await supabase
      .from("group_members")
      .select("*, profiles!inner(email, username)")
      .eq("group_id", groupId);

    if (error) return { success: false, error: error.message };

    const membersData = data ? data.map(m => ({
      ...m,
      email: m.profiles?.email,
      username: m.profiles?.username,
    })) : [];

    return { success: true, data: membersData };
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

    // Defense-in-depth: ensure callers can only query their own groups.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return { success: false, error: "Not authenticated" };
    }
    if (session.user.id !== userId) {
      return { success: false, error: "Forbidden" };
    }

    const { data, error } = await supabase
      .from("groups")
      .select("*, group_members!group_members_group_id_fkey!inner(user_id)")
      .eq("group_members.user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DEBUG getUserGroups ERROR:", JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    // Strip the inner join array from the final objects
    const cleanedData = data ? data.map(g => {
      const { group_members, ...rest } = g;
      return rest;
    }) : [];

    return { success: true, data: cleanedData };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Gets or creates a 1-to-1 individual expense tracking group between two users.
export async function getOrCreateIndividualGroup(userA, userB) {
  try {
    if (!userA || !userB) return { success: false, error: "Both users are required" };
    if (userA === userB) return { success: false, error: "Cannot track expenses with yourself" };

    // 1. Find all individual groups that userA is in
    const { data: userAGroups, error: fetchError } = await supabase
      .from("group_members")
      .select("group_id, groups!group_members_group_id_fkey!inner(type)")
      .eq("user_id", userA)
      .eq("groups.type", "individual");

    if (fetchError) return { success: false, error: fetchError.message };

    if (userAGroups && userAGroups.length > 0) {
      const groupIds = userAGroups.map(g => g.group_id);
      
      const { data: allMembers, error: membersError } = await supabase
        .from("group_members")
        .select("group_id, user_id")
        .in("group_id", groupIds);

      if (membersError) return { success: false, error: membersError.message };

      if (allMembers && allMembers.length > 0) {
        const groupMap = {};
        allMembers.forEach(m => {
          if (!groupMap[m.group_id]) groupMap[m.group_id] = [];
          groupMap[m.group_id].push(m.user_id);
        });

        const matchingGroupId = Object.keys(groupMap).find(gid => {
           const membersArr = groupMap[gid];
           return membersArr.length === 2 && membersArr.includes(userA) && membersArr.includes(userB);
        });

        if (matchingGroupId) {
           const { data: group } = await supabase
            .from("groups")
            .select("*")
            .eq("id", matchingGroupId)
            .single();
           if (group) return { success: true, data: group };
        }
      }
    }

    // 4. Create new 1-to-1 connection
    const { success, data: newGroup, error: createError } = await createGroup("Individual", "individual");
    if (!success) return { success: false, error: createError };

    const addRes = await addMemberToGroup(newGroup.id, userB);
    if (!addRes.success) return { success: false, error: addRes.error };

    return { success: true, data: newGroup };

  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}

// Delete a group and all its related records securely
export async function deleteGroup(groupId) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) return { success: false, error: "Not authenticated" };

    console.log(`[deleteGroup] Attempting to delete group ${groupId}...`);

    // 1. Delete expense splits first to avoid FK constraints
    const { data: expenses, error: fetchExpError } = await supabase
      .from('expenses')
      .select('id')
      .eq('group_id', groupId);
    
    if (fetchExpError) {
      console.error("[deleteGroup] Fetch expenses error:", fetchExpError);
      return { success: false, error: fetchExpError.message };
    }

    if (expenses && expenses.length > 0) {
      const expenseIds = expenses.map(e => e.id);
      const { error: splitError } = await supabase
        .from('expense_splits')
        .delete()
        .in('expense_id', expenseIds);
      
      if (splitError) {
        console.error("[deleteGroup] Delete splits error:", splitError);
        return { success: false, error: `Splits: ${splitError.message}` };
      }
    }
    
    // 2. Delete expenses
    const { error: expError } = await supabase.from('expenses').delete().eq('group_id', groupId);
    if (expError) {
      console.error("[deleteGroup] Delete expenses error:", expError);
      return { success: false, error: `Expenses: ${expError.message}` };
    }

    // 3. Delete settlements
    const { error: settError } = await supabase.from('settlements').delete().eq('group_id', groupId);
    if (settError) {
      console.error("[deleteGroup] Delete settlements error:", settError);
      return { success: false, error: `Settlements: ${settError.message}` };
    }

    // 4. Delete group members
    const { error: memberError } = await supabase.from('group_members').delete().eq('group_id', groupId);
    if (memberError) {
      console.error("[deleteGroup] Delete members error:", memberError);
      return { success: false, error: `Members: ${memberError.message}` };
    }
    
    // 5. Delete the group itself
    const { error: groupError } = await supabase.from('groups').delete().eq('id', groupId);
    if (groupError) {
      console.error("[deleteGroup] Delete group error:", groupError);
      return { success: false, error: `Group: ${groupError.message}` };
    }

    console.log("[deleteGroup] Successfully deleted group and all associated records.");
    return { success: true };
  } catch (err) {
    console.error("[deleteGroup] Unexpected error:", err);
    return { success: false, error: err?.message || String(err) };
  }
}
