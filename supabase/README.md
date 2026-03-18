## Supabase migrations (schema + RLS)

This project expects these tables (public schema):
- `groups`
- `group_members`
- `expenses`

And these foreign keys:
- `group_members.group_id → groups.id`
- `group_members.user_id → auth.users.id`
- `groups.created_by → auth.users.id`
- `expenses.group_id → groups.id`
- `expenses.paid_by → auth.users.id`

And RLS enabled on all tables.

### How to apply

Recommended: use the Supabase CLI and apply migrations to your local/remote project.

1. Install the CLI (one-time): see Supabase docs
2. Link your project (one-time)
3. Apply migrations:

```bash
supabase db push
```

If you already created these tables manually in the Supabase dashboard, you should either:
- export your current schema into migrations (best), or
- review the SQL here and reconcile differences before pushing.

