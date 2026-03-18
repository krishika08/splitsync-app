## Scripts

### RLS smoke test

Runs a quick end-to-end check against your linked Supabase project:
- user1 creates a group and becomes a member
- user2 cannot read/write before being added
- user1 adds user2
- user2 can read/write after being added
- user2 cannot spoof `paid_by`

#### Required environment variables

Set these in your shell (or `.env.local` if you prefer, but **don’t commit**):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RLS_TEST_USER_1_EMAIL`
- `RLS_TEST_USER_1_PASSWORD`
- `RLS_TEST_USER_2_EMAIL`
- `RLS_TEST_USER_2_PASSWORD`

#### Run

```bash
npm run rls:smoke
```

