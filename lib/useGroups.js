"use client";

import { useState, useEffect, useCallback } from "react";
import { getUserGroups, createGroup as createGroupService } from "@/services/groupService";
import { getCurrentUser } from "@/services/authService";

export function useGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await getCurrentUser();
      if (!user) {
        setError("Not authenticated");
        return;
      }

      const result = await getUserGroups(user.id);
      if (result.success) {
        setGroups(result.data || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); // always resets — even if getCurrentUser throws
    }
  }, []);


  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(async (name) => {
    const result = await createGroupService(name);

    if (result.success) {
      await fetchGroups(); // auto-refresh after creation
    }

    return result;
  }, [fetchGroups]);

  return { groups, loading, error, createGroup, refreshGroups: fetchGroups };
}
