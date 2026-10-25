-- Minimal PostgreSQL roles/auth helpers for the existing Supabase API contracts.
\set pgpass `echo "$POSTGRES_PASSWORD"`
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD :'pgpass';
GRANT anon, authenticated, service_role TO authenticator;
CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD :'pgpass';
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path TO auth, public;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SET ROLE supabase_auth_admin;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid; $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role'; $$;
CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'email'; $$;
RESET ROLE;
