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

    const user = await getCurrentUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await getUserGroups();

    if (fetchError) {
      setError(fetchError);
    } else {
      setGroups(data || []);
    }

    setLoading(false);
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
