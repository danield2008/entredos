# EntreDos — migration: accounts and couples

The migration `entredos_accounts_couples` has been applied to the Supabase project `EntreDos`.

It adds profile, couple, invite, favorites, and memory tables with row-level security. It is additive and does not replace the existing online-room tables.

For repeatable local deployment, use the SQL migration supplied by the project maintainer or export the migration from Supabase. OAuth provider credentials must be configured separately in Supabase Authentication.
