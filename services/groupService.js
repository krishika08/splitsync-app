import { supabase } from "@/lib/supabaseClient";

/**
 * Helper to securely map an email to a user ID.
 */
export async function getUserIdByEmail(email) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "User not found with that email" };
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

// Add a user to a group by email or userId
export async function addMemberToGroup(groupId, identifier) {
  try {
    let userId = identifier;
    
    // If identifier is an email, convert it to a userId via RPC
    if (identifier.includes("@")) {
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

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Get all members of a group with email details
export async function getGroupMembers(groupId) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };

    const { data, error } = await supabase
      .from("group_members")
      .select("*, profiles!inner(email)")
      .eq("group_id", groupId);

    if (error) return { success: false, error: error.message };

    const membersData = data ? data.map(m => ({
      ...m,
      email: m.profiles?.email
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
    // Use getSession() (local) to avoid extra network round-trips/flakiness.
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

    // Strip the inner join array from the final objects to mirror SELECT groups.* exactly
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
      
      // 2. Fetch all members for these groups by group_id
      const { data: allMembers, error: membersError } = await supabase
        .from("group_members")
        .select("group_id, user_id")
        .in("group_id", groupIds);

      if (membersError) return { success: false, error: membersError.message };

      if (allMembers && allMembers.length > 0) {
        // Group members by group_id
        const groupMap = {};
        allMembers.forEach(m => {
          if (!groupMap[m.group_id]) groupMap[m.group_id] = [];
          groupMap[m.group_id].push(m.user_id);
        });

        // 3. Find the one group with EXACTLY 2 members where both userA and userB exist
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

    // 4. Create new 1-to-1 connection reusing group logic securely
    const { success, data: newGroup, error: createError } = await createGroup("Individual", "individual");
    if (!success) return { success: false, error: createError };

    const addRes = await addMemberToGroup(newGroup.id, userB);
    if (!addRes.success) return { success: false, error: addRes.error };

    return { success: true, data: newGroup };

  } catch (err) {
    return { success: false, error: err?.message || String(err) };
  }
}
