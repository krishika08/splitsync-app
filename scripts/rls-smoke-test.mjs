import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function signIn(client, email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  assert(data?.user?.id, "Sign-in returned no user");
  return data.user;
}

async function signOut(client) {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const email1 = requireEnv("RLS_TEST_USER_1_EMAIL");
  const pass1 = requireEnv("RLS_TEST_USER_1_PASSWORD");
  const email2 = requireEnv("RLS_TEST_USER_2_EMAIL");
  const pass2 = requireEnv("RLS_TEST_USER_2_PASSWORD");

  const c1 = createClient(url, anon);
  const c2 = createClient(url, anon);

  let groupId;
  let u1;
  let u2;

  console.log("RLS smoke test: starting");

  try {
    u1 = await signIn(c1, email1, pass1);
    u2 = await signIn(c2, email2, pass2);

    console.log("1) Create group as user1");
    {
      const { data, error } = await c1
        .from("groups")
        .insert({ name: `RLS Smoke ${Date.now()}`, created_by: u1.id })
        .select("id")
        .single();
      if (error) throw error;
      groupId = data.id;
      assert(groupId, "Group insert returned no id");
    }

    console.log("2) Add creator membership (user1)");
    {
      const { error } = await c1
        .from("group_members")
        .insert({ group_id: groupId, user_id: u1.id });
      if (error) throw error;
    }

    console.log("3) user2 cannot read the group (not a member yet)");
    {
      const { data, error } = await c2.from("groups").select("id").eq("id", groupId);
      // With RLS, this should return 0 rows without error (most common case).
      assert(!error, `Unexpected error on select as non-member: ${error.message}`);
      assert(Array.isArray(data) && data.length === 0, "Non-member was able to read group");
    }

    console.log("4) user2 cannot insert expense into the group (not a member yet)");
    {
      const { error } = await c2.from("expenses").insert({
        group_id: groupId,
        amount: 10,
        description: "Should fail",
        paid_by: u2.id,
      });
      assert(error, "Non-member was able to insert expense (should be blocked by RLS)");
    }

    console.log("5) user1 adds user2 as member (creator can add anyone)");
    {
      const { error } = await c1
        .from("group_members")
        .insert({ group_id: groupId, user_id: u2.id });
      if (error) throw error;
    }

    console.log("6) user2 can now read the group");
    {
      const { data, error } = await c2.from("groups").select("id").eq("id", groupId);
      if (error) throw error;
      assert(Array.isArray(data) && data.length === 1, "Member could not read group after being added");
    }

    console.log("7) user2 can now insert expense (paid_by must be self)");
    {
      const { error } = await c2.from("expenses").insert({
        group_id: groupId,
        amount: 12.34,
        description: "Allowed",
        paid_by: u2.id,
      });
      if (error) throw error;
    }

    console.log("8) user2 cannot spoof paid_by");
    {
      const { error } = await c2.from("expenses").insert({
        group_id: groupId,
        amount: 1,
        description: "Spoof paid_by",
        paid_by: u1.id,
      });
      assert(error, "User was able to spoof paid_by (should be blocked by RLS)");
    }

    console.log("RLS smoke test: PASS");
  } finally {
    // Best-effort cleanup
    try {
      if (groupId) {
        await c1.from("groups").delete().eq("id", groupId);
      }
    } catch {}

    try { await signOut(c1); } catch {}
    try { await signOut(c2); } catch {}
  }
}

main().catch((err) => {
  console.error("RLS smoke test: FAIL");
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});

