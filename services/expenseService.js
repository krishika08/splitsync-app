import { supabase } from "@/lib/supabaseClient";

export async function createExpense({
  groupId,
  paidBy,
  amount,
  description,
  members,
}) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };
    if (amount === undefined || amount === null)
      return { success: false, error: "Amount is required" };
    if (!description)
      return { success: false, error: "Description is required" };
    if (!Array.isArray(members) || members.length === 0) {
      return { success: false, error: "Members list is required" };
    }

    const uniqueMembers = Array.from(
      new Set(members.filter((m) => typeof m === "string" && m.trim().length))
    );
    if (uniqueMembers.length === 0) {
      return { success: false, error: "Members list is required" };
    }

    const amountNum = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return { success: false, error: "Amount must be a positive number" };
    }

    // With RLS as currently defined, `paid_by` must be the current authenticated user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }
    if (paidBy && paidBy !== user.id) {
      return { success: false, error: "paidBy must match current user" };
    }

    // 1) Insert expense
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        group_id: groupId,
        paid_by: user.id,
        amount: amountNum,
        description,
      })
      .select()
      .single();

    if (expenseError) return { success: false, error: expenseError.message };

    // 2) Calculate equal split among members (in cents to avoid float drift)
    const centsTotal = Math.round(amountNum * 100);
    const n = uniqueMembers.length;
    const baseCents = Math.floor(centsTotal / n);
    const remainder = centsTotal - baseCents * n;

    const splitsToInsert = uniqueMembers.map((memberId, idx) => {
      const cents = baseCents + (idx < remainder ? 1 : 0);
      return {
        expense_id: expense.id,
        user_id: memberId,
        amount: Number((cents / 100).toFixed(2)),
      };
    });

    // 3) Insert expense_splits
    const { data: splits, error: splitsError } = await supabase
      .from("expense_splits")
      .insert(splitsToInsert)
      .select();

    if (splitsError) {
      return { success: false, error: splitsError.message };
    }

    // 4) Return structured response
    return { success: true, data: { expense, splits } };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// Add a new expense to a group
export async function addExpense(groupId, amount, description) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        group_id: groupId,
        amount,
        description,
        paid_by: user.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Get all expenses for a group
export async function getExpenses(groupId) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };

    const { data, error } = await supabase
      .from("expenses")
      .select("id, amount, description, paid_by, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Calculate net balances (paid - owed) for all users in a group
export async function calculateBalances(groupId) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };

    // 1) Fetch all expenses for this group
    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("id, amount, paid_by")
      .eq("group_id", groupId);

    if (expensesError) {
      return { success: false, error: expensesError.message };
    }

    if (!expenses || expenses.length === 0) {
      return { success: true, data: {} };
    }

    const expenseIds = expenses.map((e) => e.id);

    // 2) Fetch all related splits, restricted by this group's expenses
    const { data: splits, error: splitsError } = await supabase
      .from("expense_splits")
      .select("expense_id, user_id, amount")
      .in("expense_id", expenseIds);

    if (splitsError) {
      return { success: false, error: splitsError.message };
    }

    const balances = {};

    // Helper to add to a user's balance (paid or owed)
    const addToBalance = (userId, delta) => {
      if (!userId) return;
      const current = balances[userId] ?? 0;
      const next = current + delta;
      // Keep as Number with 2 decimals max
      balances[userId] = Number(next.toFixed(2));
    };

    // 3a) Sum amounts each user paid
    for (const expense of expenses) {
      const amt =
        typeof expense.amount === "number"
          ? expense.amount
          : Number(expense.amount);
      if (!Number.isFinite(amt)) continue;
      addToBalance(expense.paid_by, amt);
    }

    // 3b) Subtract what each user owes (from splits)
    if (Array.isArray(splits)) {
      for (const split of splits) {
        const amt =
          typeof split.amount === "number"
            ? split.amount
            : Number(split.amount);
        if (!Number.isFinite(amt)) continue;
        addToBalance(split.user_id, -amt);
      }
    }

    return { success: true, data: balances };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// Given balances { userId: balance }, produce simplified transfers
// where positive balance means "should receive", negative means "should pay".
export function simplifyDebts(balances) {
  if (!balances || typeof balances !== "object") return [];

  const creditors = [];
  const debtors = [];

  for (const [userId, raw] of Object.entries(balances)) {
    const amount = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) continue;
    if (amount > 0) {
      creditors.push({ userId, amount });
    } else if (amount < 0) {
      debtors.push({ userId, amount: -amount }); // store as positive owed
    }
  }

  // Nothing to settle
  if (!creditors.length || !debtors.length) return [];

  // Greedy match: largest creditors and debtors first
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const txs = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.004) {
      txs.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Number(amount.toFixed(2)),
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount <= 0.004) i += 1;
    if (creditor.amount <= 0.004) j += 1;
  }

  return txs;
}
