import { supabase } from "@/lib/supabaseClient";
import { saveSettlements } from "./settlementService";
import { notifyGroupMembers } from "./notificationService";

export async function createExpense({
  groupId,
  paidBy,
  amount,
  description,
  members = [],
  splitType = "equal",
  splitDetails = {} // Expects { [userId]: amountOrPercentageValue }
}) {
  try {
    // --- Input validation ---
    if (!groupId) return { success: false, error: "Group ID is required" };
    if (!paidBy) return { success: false, error: "paidBy is required" };
    if (!description) return { success: false, error: "Description is required" };

    const amountNum = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return { success: false, error: "Amount must be a positive number" };
    }
    const safeAmountNum = Number(amountNum.toFixed(2));

    // With RLS updated, `paid_by` can be any member in the group.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // --- 1) Prepare splits dynamically BEFORE inserting anything ---
    let splitsToInsert = [];

    if (splitType === "equal") {
      if (!Array.isArray(members) || members.length === 0) {
        return { success: false, error: "Members list is required for equal split" };
      }
      const uniqueMembers = Array.from(new Set(members.filter(m => typeof m === "string" && m.length)));
      const centsTotal = Math.round(safeAmountNum * 100);
      const n = uniqueMembers.length;
      const baseCents = Math.floor(centsTotal / n);
      const remainder = centsTotal - baseCents * n;

      splitsToInsert = uniqueMembers.map((memberId, idx) => {
        const cents = baseCents + (idx < remainder ? 1 : 0);
        return {
          user_id: memberId,
          amount: Number((cents / 100).toFixed(2)),
        };
      });
    } 
    else if (splitType === "exact") {
      let sum = 0;
      for (const [uid, amt] of Object.entries(splitDetails)) {
        const amtNum = Number(amt);
        if (isNaN(amtNum) || amtNum < 0) return { success: false, error: "Invalid split amount" };
        sum += amtNum;
        splitsToInsert.push({
          user_id: uid,
          amount: Number(amtNum.toFixed(2)),
        });
      }
      if (Math.abs(sum - safeAmountNum) > 0.05) { // higher threshold for floats
        return { success: false, error: `Exact splits sum to ${sum}, must equal ${safeAmountNum}` };
      }
    } 
    else if (splitType === "percentage") {
      let sumPct = 0;
      for (const [uid, pct] of Object.entries(splitDetails)) {
        const pctNum = Number(pct);
        if (isNaN(pctNum) || pctNum < 0) return { success: false, error: "Invalid percentage" };
        sumPct += pctNum;
      }
      if (Math.abs(sumPct - 100) > 0.05) {
        return { success: false, error: "Percentages must sum up to 100%" };
      }

      splitsToInsert = Object.entries(splitDetails).map(([uid, pct]) => ({
        user_id: uid,
        amount: Number(((Number(pct) / 100) * safeAmountNum).toFixed(2)),
      }));

      // Patch the difference to first user to ensure ledger matches perfect accuracy
      const sumAmt = splitsToInsert.reduce((a, b) => a + b.amount, 0);
      const diff = safeAmountNum - sumAmt;
      if (Math.abs(diff) > 0.001 && splitsToInsert.length > 0) {
         splitsToInsert[0].amount = Number((splitsToInsert[0].amount + diff).toFixed(2));
      }
    } 
    else {
      return { success: false, error: "Unsupported split type" };
    }

    // --- 2) Insert expense ---
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        group_id: groupId,
        paid_by: paidBy || user.id,
        amount: safeAmountNum,
        description,
      })
      .select()
      .single();

    if (expenseError) return { success: false, error: expenseError.message };

    // Update with inserted expense_id
    const finalSplits = splitsToInsert.map(s => ({ ...s, expense_id: expense.id }));

    // --- 3) Insert expense_splits ---
    const { data: splits, error: splitsError } = await supabase
      .from("expense_splits")
      .insert(finalSplits)
      .select();

    if (splitsError) {
      return { success: false, error: splitsError.message };
    }

    return { success: true, data: { expense, splits } };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// Add a new expense to a group
export async function addExpense(groupId, amount, description) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };
    const amountNum = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return { success: false, error: "Amount must be a positive number" };
    }
    const safeAmountNum = Number(amountNum.toFixed(2));
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
        amount: safeAmountNum,
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

    // Apply strict group-membership validation via inner joins to match correct visibility requirement
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("expenses")
      .select("id, amount, description, paid_by, created_at, groups!inner(group_members!group_members_group_id_fkey!inner(user_id))")
      .eq("group_id", groupId)
      .eq("groups.group_members.user_id", user?.id)
      .order("created_at", { ascending: false });

    // Strip nested join data for cleanliness
    const cleanedData = data ? data.map(e => {
        const { groups, ...rest } = e;
        return rest;
    }) : [];

    if (error) return { success: false, error: error.message };

    return { success: true, data: cleanedData };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Calculate net balances (paid - owed) for all users in a group
export async function calculateBalances(groupId) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };

    // 1) Fetch all expenses for this group using exact user membership constraint
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("id, amount, paid_by, groups!inner(group_members!group_members_group_id_fkey!inner(user_id))")
      .eq("group_id", groupId)
      .eq("groups.group_members.user_id", user?.id);

    if (expensesError) {
      return { success: false, error: expensesError.message };
    }

    if (!expenses || expenses.length === 0) {
      return { success: true, data: {} };
    }

    const expenseIds = expenses.map((e) => e.id);

    // 2) Fetch all related splits, applying the exact same recursive membership constraint
    const { data: splits, error: splitsError } = await supabase
      .from("expense_splits")
      .select("expense_id, user_id, amount, expenses!inner(groups!inner(group_members!group_members_group_id_fkey!inner(user_id)))")
      .in("expense_id", expenseIds)
      .eq("expenses.groups.group_members.user_id", user?.id);

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
    if (Array.isArray(splits) && splits.length > 0) {
      for (const split of splits) {
        if (!split || !split.user_id) continue;
        const amt =
          typeof split.amount === "number"
            ? split.amount
            : Number(split.amount);
        if (!Number.isFinite(amt)) continue;
        addToBalance(split.user_id, -amt);
      }
    }

    const sortedDebts = simplifyDebts(balances);
    return { success: true, data: sortedDebts };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// Given balances { userId: balance }, produce simplified transfers
// where positive balance means "should receive", negative means "should pay".
export function simplifyDebts(balances) {
  if (!balances || typeof balances !== "object" || Array.isArray(balances)) return [];

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
        payer_id: debtor.userId,
        receiver_id: creditor.userId,
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

export async function createExpenseAndUpdate({
  groupId,
  paidBy,
  amount,
  description,
  members = [],
  splitType = "equal",
  splitDetails = {}
}) {
  try {
    // 1. Call createExpense()
    const expenseRes = await createExpense({
      groupId,
      paidBy,
      amount,
      description,
      members,
      splitType,
      splitDetails
    });
    if (!expenseRes.success) {
      return expenseRes;
    }

    // 2. Call calculateBalances()
    const balancesRes = await calculateBalances(groupId);
    if (!balancesRes.success) {
      return balancesRes;
    }

    // 3. Set transactions
    const transactions = balancesRes.data;

    // 4. Call saveSettlements()
    const settlementsRes = await saveSettlements(groupId, transactions);
    if (!settlementsRes.success) {
      return settlementsRes;
    }

    // 4.5 Insert auto-pending personal expenses for all members in the split
    if (description !== "Settle Up" && expenseRes.data.expense && expenseRes.data.splits) {
      try {
        const expenseData = expenseRes.data.expense;
        const groupBillDetails = {
           description: expenseData.description,
           total_amount: expenseData.amount,
           paid_by: paidBy
        };
        
        const personalExpensesToInsert = expenseRes.data.splits.map(split => ({
           user_id: split.user_id,
           amount: split.amount, // Their exact share
           description: expenseData.description,
           category: 'other', // Default category
           expense_date: new Date().toISOString().split('T')[0],
           is_pending: true,
           group_expense_id: expenseData.id,
           group_id: groupId,
           group_bill_details: groupBillDetails
        }));

        if (personalExpensesToInsert.length > 0) {
           const { error: pendingErr } = await supabase.from("personal_expenses").insert(personalExpensesToInsert);
           if (pendingErr) console.error("[createExpenseAndUpdate] Insert error details:", pendingErr);
        }
      } catch (err) {
        console.error("[createExpenseAndUpdate] Failed to create pending personal expenses:", err);
      }
    }

    // 5. Send notifications to group members (fire-and-forget)
    try {
      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", paidBy)
        .single();
      const actorName = actorProfile?.username || "Someone";

      const isSettleUp = description === "Settle Up";
      notifyGroupMembers({
        groupId,
        actorId: paidBy,
        type: isSettleUp ? "settle_up" : "expense_added",
        title: isSettleUp ? "Settlement" : "New Expense",
        message: isSettleUp
          ? `@${actorName} settled up ₹${Number(amount).toFixed(2)}`
          : `@${actorName} added "${description}" — ₹${Number(amount).toFixed(2)}`,
      });
    } catch (notifErr) {
      console.warn("[createExpenseAndUpdate] Notification send failed (non-blocking):", notifErr);
    }

    return {
      success: true,
      data: {
        expense: expenseRes.data.expense,
        splits: expenseRes.data.splits,
        settlements: settlementsRes.data,
      },
    };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

/**
 * Get the recent activity feed for a group, detailing who added what or settled.
 */
export async function getActivityFeed(groupId) {
  try {
    if (!groupId) return { success: false, error: "Group ID is required" };

    const { data: expenses, error } = await supabase
      .from("expenses")
      .select("id, amount, description, paid_by, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    // Fetch usernames from joined profiles
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id, profiles!inner(username, email)")
      .eq("group_id", groupId);

    const nameMap = {};
    if (members) {
      members.forEach((m) => {
        nameMap[m.user_id] = m.profiles?.username || m.profiles?.email?.split("@")[0] || "Someone";
      });
    }

    const feed = expenses.map((e) => {
      const actor = nameMap[e.paid_by] || "Someone";
      return {
        id: e.id,
        actor,
        action: e.description === "Settle Up" ? "settled up" : `added "${e.description}"`,
        amount: e.amount,
        timestamp: e.created_at,
      };
    });

    return { success: true, data: feed };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}
