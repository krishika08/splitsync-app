import { supabase } from "@/lib/supabaseClient";

// ─── Category Definitions ───────────────────────────────────────────
const CATEGORIES = [
  {
    id: "food",
    label: "Food & Dining",
    icon: "🍽️",
    color: "#F97316",
    gradient: "from-orange-400 to-amber-500",
    keywords: [
      "food", "dinner", "lunch", "breakfast", "brunch", "meal", "restaurant",
      "pizza", "burger", "coffee", "cafe", "tea", "snack", "groceries",
      "grocery", "swiggy", "zomato", "uber eats", "doordash", "dominos",
      "mcdonald", "kfc", "subway", "starbucks", "biryani", "chicken",
      "paneer", "dal", "rice", "noodles", "pasta", "sushi", "bakery",
      "cake", "ice cream", "dessert", "drinks", "juice", "smoothie",
      "bar", "pub", "beer", "wine", "alcohol", "liquor", "milk", "eggs",
      "bread", "butter", "cheese", "fruits", "vegetables", "meat", "fish",
      "cooking", "kitchen"
    ],
  },
  {
    id: "transport",
    label: "Transport",
    icon: "🚗",
    color: "#3B82F6",
    gradient: "from-blue-400 to-indigo-500",
    keywords: [
      "uber", "ola", "lyft", "cab", "taxi", "auto", "rickshaw", "bus",
      "train", "metro", "flight", "airline", "airport", "fuel", "petrol",
      "diesel", "gas", "parking", "toll", "ride", "drive", "transport",
      "commute", "rapido", "grab", "gojek"
    ],
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: "🛍️",
    color: "#EC4899",
    gradient: "from-pink-400 to-rose-500",
    keywords: [
      "shopping", "clothes", "shoes", "amazon", "flipkart", "myntra",
      "online", "purchase", "buy", "store", "mall", "market", "gift",
      "present", "accessory", "watch", "jewelry", "bag", "electronics",
      "gadget", "phone", "laptop", "headphones", "charger", "fashion"
    ],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    icon: "🎬",
    color: "#8B5CF6",
    gradient: "from-violet-400 to-purple-500",
    keywords: [
      "movie", "cinema", "netflix", "spotify", "disney", "hotstar",
      "prime", "hulu", "youtube", "subscription", "game", "gaming",
      "concert", "show", "ticket", "event", "party", "club", "music",
      "dance", "karaoke", "bowling", "arcade", "amusement", "fun",
      "entertainment", "book", "novel", "magazine"
    ],
  },
  {
    id: "bills",
    label: "Bills & Utilities",
    icon: "📋",
    color: "#06B6D4",
    gradient: "from-cyan-400 to-teal-500",
    keywords: [
      "bill", "utility", "electric", "electricity", "water", "gas",
      "internet", "wifi", "broadband", "phone", "mobile", "recharge",
      "rent", "emi", "insurance", "tax", "maintenance", "repair",
      "plumber", "electrician", "laundry", "dry clean", "maid",
      "housekeeper", "cable", "dth"
    ],
  },
  {
    id: "health",
    label: "Health & Fitness",
    icon: "💊",
    color: "#10B981",
    gradient: "from-emerald-400 to-green-500",
    keywords: [
      "doctor", "hospital", "medicine", "pharmacy", "medical",
      "health", "gym", "fitness", "yoga", "workout", "supplement",
      "vitamin", "protein", "therapy", "dentist", "eye", "optical",
      "checkup", "test", "lab", "blood", "scan", "prescription",
      "clinic", "surgery"
    ],
  },
  {
    id: "travel",
    label: "Travel",
    icon: "✈️",
    color: "#F59E0B",
    gradient: "from-amber-400 to-yellow-500",
    keywords: [
      "travel", "trip", "vacation", "holiday", "hotel", "hostel",
      "airbnb", "oyo", "booking", "resort", "stay", "accommodation",
      "luggage", "visa", "passport", "tour", "sightseeing", "trek",
      "hike", "camp", "beach", "mountain", "explore"
    ],
  },
  {
    id: "other",
    label: "Other",
    icon: "📦",
    color: "#64748B",
    gradient: "from-slate-400 to-gray-500",
    keywords: [],
  },
];

/**
 * Infer a category from an expense description using keyword matching.
 */
export function inferCategory(description) {
  if (!description) return CATEGORIES.find((c) => c.id === "other");

  const lower = description.toLowerCase().trim();

  // Skip "Settle Up" entries — they're not real expenses
  if (lower === "settle up") return null;

  for (const cat of CATEGORIES) {
    if (cat.id === "other") continue;
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) return cat;
    }
  }
  return CATEGORIES.find((c) => c.id === "other");
}

export function getAllCategories() {
  return CATEGORIES;
}

// ─── Time Range Filters ────────────────────────────────────────────
const TIME_RANGES = [
  { id: "7d", label: "7 Days", days: 7 },
  { id: "30d", label: "30 Days", days: 30 },
  { id: "3m", label: "3 Months", days: 90 },
  { id: "6m", label: "6 Months", days: 180 },
  { id: "1y", label: "1 Year", days: 365 },
  { id: "all", label: "All Time", days: null },
];

export function getTimeRanges() {
  return TIME_RANGES;
}

// ─── Core Analytics Fetcher ────────────────────────────────────────
/**
 * Fetch all expenses for the current user across all groups,
 * optionally filtered by time range, and produce analytics data.
 */
export async function getAnalyticsData(timeRangeId = "all") {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // 1. Get all groups the user is a member of
    const { data: memberRows, error: memberError } = await supabase
      .from("group_members")
      .select("group_id, groups!group_members_group_id_fkey(name, type)")
      .eq("user_id", user.id);

    if (memberError) return { success: false, error: memberError.message };
    if (!memberRows || memberRows.length === 0) {
      return { success: true, data: buildEmptyAnalytics() };
    }

    const groupIds = memberRows.map((r) => r.group_id);
    const groupMap = {};
    memberRows.forEach((r) => {
      groupMap[r.group_id] = {
        name: r.groups?.name || "Unknown",
        type: r.groups?.type || "group",
      };
    });

    // 2. Build date filter
    const range = TIME_RANGES.find((r) => r.id === timeRangeId) || TIME_RANGES[5];
    let query = supabase
      .from("expenses")
      .select("id, amount, description, paid_by, created_at, group_id")
      .in("group_id", groupIds)
      .order("created_at", { ascending: true });

    if (range.days) {
      const since = new Date();
      since.setDate(since.getDate() - range.days);
      query = query.gte("created_at", since.toISOString());
    }

    const { data: expenses, error: expError } = await query;
    if (expError) return { success: false, error: expError.message };

    if (!expenses || expenses.length === 0) {
      return { success: true, data: buildEmptyAnalytics() };
    }

    // 3. Process & aggregate
    return {
      success: true,
      data: aggregateExpenses(expenses, groupMap, user.id),
    };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// ─── Aggregation Engine ────────────────────────────────────────────
function aggregateExpenses(expenses, groupMap, userId) {
  // Filter out settle-ups for analytics
  const realExpenses = expenses.filter(
    (e) => e.description?.toLowerCase() !== "settle up"
  );

  if (realExpenses.length === 0) return buildEmptyAnalytics();

  // ── Category aggregation ──
  const categoryTotals = {};
  const monthlyCategoryTotals = {};
  const monthlyTotals = {};
  const groupTotals = {};
  let totalSpent = 0;
  let biggestExpense = null;

  for (const exp of realExpenses) {
    const cat = inferCategory(exp.description);
    if (!cat) continue;

    const amount = Number(exp.amount) || 0;
    totalSpent += amount;

    // Category totals
    if (!categoryTotals[cat.id]) {
      categoryTotals[cat.id] = { ...cat, total: 0, count: 0 };
    }
    categoryTotals[cat.id].total += amount;
    categoryTotals[cat.id].count += 1;

    // Monthly totals
    const monthKey = getMonthKey(exp.created_at);
    if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = 0;
    monthlyTotals[monthKey] += amount;

    // Monthly category breakdown
    if (!monthlyCategoryTotals[monthKey]) monthlyCategoryTotals[monthKey] = {};
    if (!monthlyCategoryTotals[monthKey][cat.id])
      monthlyCategoryTotals[monthKey][cat.id] = 0;
    monthlyCategoryTotals[monthKey][cat.id] += amount;

    // Group totals
    const gName = groupMap[exp.group_id]?.name || "Unknown";
    if (!groupTotals[exp.group_id]) {
      groupTotals[exp.group_id] = { name: gName, total: 0, count: 0 };
    }
    groupTotals[exp.group_id].total += amount;
    groupTotals[exp.group_id].count += 1;

    // Biggest expense tracker
    if (!biggestExpense || amount > biggestExpense.amount) {
      biggestExpense = {
        amount,
        description: exp.description,
        date: exp.created_at,
        group: gName,
      };
    }
  }

  // Sort categories by total descending
  const sortedCategories = Object.values(categoryTotals).sort(
    (a, b) => b.total - a.total
  );

  // Sort months chronologically
  const sortedMonths = Object.keys(monthlyTotals).sort();
  const monthlyData = sortedMonths.map((key) => ({
    month: key,
    label: formatMonthLabel(key),
    total: Number(monthlyTotals[key].toFixed(2)),
  }));

  // Category trend lines (top 4 categories over time)
  const topCategoryIds = sortedCategories.slice(0, 4).map((c) => c.id);
  const categoryTrends = sortedMonths.map((month) => {
    const point = { month, label: formatMonthLabel(month) };
    topCategoryIds.forEach((catId) => {
      point[catId] = Number(
        (monthlyCategoryTotals[month]?.[catId] || 0).toFixed(2)
      );
    });
    return point;
  });

  // Group breakdown sorted
  const sortedGroups = Object.values(groupTotals).sort(
    (a, b) => b.total - a.total
  );

  // Monthly average
  const numMonths = sortedMonths.length || 1;
  const monthlyAvg = totalSpent / numMonths;

  // Most active group
  const mostActiveGroup = sortedGroups[0] || null;

  // Top 5 biggest expenses
  const topExpenses = [...realExpenses]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((e) => ({
      description: e.description,
      amount: Number(e.amount),
      date: e.created_at,
      group: groupMap[e.group_id]?.name || "Unknown",
      category: inferCategory(e.description),
    }));

  return {
    totalSpent: Number(totalSpent.toFixed(2)),
    monthlyAverage: Number(monthlyAvg.toFixed(2)),
    transactionCount: realExpenses.length,
    biggestExpense,
    mostActiveGroup,
    categories: sortedCategories.map((c) => ({
      ...c,
      total: Number(c.total.toFixed(2)),
      percentage: Number(((c.total / totalSpent) * 100).toFixed(1)),
    })),
    monthlyData,
    categoryTrends,
    topCategoryIds,
    groupBreakdown: sortedGroups.map((g) => ({
      ...g,
      total: Number(g.total.toFixed(2)),
      percentage: Number(((g.total / totalSpent) * 100).toFixed(1)),
    })),
    topExpenses,
  };
}

function buildEmptyAnalytics() {
  return {
    totalSpent: 0,
    monthlyAverage: 0,
    transactionCount: 0,
    biggestExpense: null,
    mostActiveGroup: null,
    categories: [],
    monthlyData: [],
    categoryTrends: [],
    topCategoryIds: [],
    groupBreakdown: [],
    topExpenses: [],
  };
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
}
