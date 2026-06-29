-- ============================================================
-- RESIDANCE HOTEL MANAGEMENT — FULL SUPABASE SQL SCHEMA
-- Project: https://vgqewdwjonkukkdgvboy.supabase.co
-- Run this entire file in Supabase SQL Editor (Dashboard → SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS throughout
-- ============================================================


-- ============================================================
-- SECTION 0 — EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- SECTION 1 — STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos', 'logos', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-photos', 'client-photos', true, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SECTION 2 — STORAGE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "logos: authenticated can upload"  ON storage.objects;
DROP POLICY IF EXISTS "logos: authenticated can update"  ON storage.objects;
DROP POLICY IF EXISTS "logos: authenticated can delete"  ON storage.objects;
DROP POLICY IF EXISTS "logos: public read"               ON storage.objects;
DROP POLICY IF EXISTS "avatars: authenticated can upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars: authenticated can update" ON storage.objects;
DROP POLICY IF EXISTS "avatars: authenticated can delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars: public read"              ON storage.objects;
DROP POLICY IF EXISTS "client-photos: authenticated can upload" ON storage.objects;
DROP POLICY IF EXISTS "client-photos: authenticated can update" ON storage.objects;
DROP POLICY IF EXISTS "client-photos: authenticated can delete" ON storage.objects;
DROP POLICY IF EXISTS "client-photos: authenticated read"       ON storage.objects;

-- logos
CREATE POLICY "logos: authenticated can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
CREATE POLICY "logos: authenticated can update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY "logos: authenticated can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY "logos: public read"              ON storage.objects FOR SELECT TO public      USING (bucket_id = 'logos');

-- avatars
CREATE POLICY "avatars: authenticated can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatars: authenticated can update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars: authenticated can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars: public read"              ON storage.objects FOR SELECT TO public      USING (bucket_id = 'avatars');

-- client-photos
CREATE POLICY "client-photos: authenticated can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-photos');
CREATE POLICY "client-photos: authenticated can update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'client-photos');
CREATE POLICY "client-photos: authenticated can delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-photos');
CREATE POLICY "client-photos: authenticated read"       ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-photos');


-- ============================================================
-- SECTION 3 — USER PROFILES & ROLES
-- NOTE: email column is required for username-based login lookup
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  username    TEXT UNIQUE,
  name        TEXT,
  email       TEXT,          -- required: username→email lookup at login
  avatar_url  TEXT,
  worker_id   UUID,          -- set when role = 'worker'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── is_admin() helper — SECURITY DEFINER bypasses RLS so it never
--    recurses when used inside profile policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Drop old policies before recreating
DROP POLICY IF EXISTS "profiles: admin full access"  ON public.profiles;
DROP POLICY IF EXISTS "profiles: worker reads own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: worker updates own" ON public.profiles;
DROP POLICY IF EXISTS "profiles: public read"        ON public.profiles;
DROP POLICY IF EXISTS "profiles: anon read"          ON public.profiles;
DROP POLICY IF EXISTS "profiles: authenticated full" ON public.profiles;
DROP POLICY IF EXISTS "profiles: insert by trigger"  ON public.profiles;

-- Anon SELECT is required so the login form can look up email by username
-- (the Supabase client uses the anon key before authentication completes).
CREATE POLICY "profiles: anon read"
  ON public.profiles FOR SELECT TO anon USING (true);

-- Authenticated users have full access (internal app — no row-level filtering needed)
CREATE POLICY "profiles: authenticated full"
  ON public.profiles FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Trigger and service-role inserts
CREATE POLICY "profiles: insert by trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (true);


-- ── Auto-create profile on signup ───────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, role, username, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SECTION 4 — SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL DEFAULT 'Ma Résidence',
  logo_url    TEXT,
  description TEXT,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  nif         TEXT,
  nis         TEXT,
  article     TEXT,
  rc          TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings: authenticated read" ON public.settings;
DROP POLICY IF EXISTS "settings: admin write"        ON public.settings;

CREATE POLICY "settings: authenticated read" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings: admin write"        ON public.settings FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Single default row (safe to re-run)
INSERT INTO public.settings (name)
SELECT 'Ma Résidence'
WHERE NOT EXISTS (SELECT 1 FROM public.settings);


-- ============================================================
-- SECTION 5 — FLOORS & CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.floors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "floors: authenticated read" ON public.floors;
DROP POLICY IF EXISTS "floors: admin write"        ON public.floors;

CREATE POLICY "floors: authenticated read" ON public.floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "floors: admin write"        ON public.floors FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


CREATE TABLE IF NOT EXISTS public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories: authenticated read" ON public.categories;
DROP POLICY IF EXISTS "categories: admin write"        ON public.categories;

CREATE POLICY "categories: authenticated read" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories: admin write"        ON public.categories FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- SECTION 6 — ROOMS & MAINTENANCES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  capacity         INTEGER NOT NULL DEFAULT 2,
  floor_id         UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  category_id      UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  price_per_night  NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'available'
                     CHECK (status IN ('available','occupied','maintenance')),
  maintenance_note TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms: authenticated read"   ON public.rooms;
DROP POLICY IF EXISTS "rooms: write by permission"  ON public.rooms;

CREATE POLICY "rooms: authenticated read"  ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms: write by permission" ON public.rooms FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


CREATE TABLE IF NOT EXISTS public.maintenances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  cost        NUMERIC(10,2) NOT NULL DEFAULT 0,
  date        DATE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenances: authenticated read" ON public.maintenances;
DROP POLICY IF EXISTS "maintenances: admin write"        ON public.maintenances;

CREATE POLICY "maintenances: authenticated read" ON public.maintenances FOR SELECT TO authenticated USING (true);
CREATE POLICY "maintenances: admin write"        ON public.maintenances FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- SECTION 7 — SERVICES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services: authenticated read" ON public.services;
DROP POLICY IF EXISTS "services: admin write"        ON public.services;

CREATE POLICY "services: authenticated read" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services: admin write"        ON public.services FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- SECTION 8 — CLIENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  birth_date           DATE,
  birth_place          TEXT,
  sexe                 TEXT CHECK (sexe IN ('M','F')),
  profession           TEXT,
  address              TEXT,
  city                 TEXT,
  phone                TEXT NOT NULL,
  phone2               TEXT,
  email                TEXT,
  document_type        TEXT CHECK (document_type IN ('permis','cin','passeport')),
  document_number      TEXT,
  document_issue_date  DATE,
  document_expiry_date DATE,
  document_issue_place TEXT,
  photo_urls           TEXT[] DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients: authenticated read"  ON public.clients;
DROP POLICY IF EXISTS "clients: authenticated write" ON public.clients;

CREATE POLICY "clients: authenticated read"  ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients: authenticated write" ON public.clients FOR ALL    TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- SECTION 9 — RESERVATIONS
-- check_in_time / check_out_time stored as TEXT (app sends '14:00' strings)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT NOT NULL UNIQUE,
  client_id      UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  check_in       DATE NOT NULL,
  check_out      DATE NOT NULL,
  check_in_time  TEXT NOT NULL DEFAULT '14:00',
  check_out_time TEXT NOT NULL DEFAULT '11:00',
  nights         INTEGER NOT NULL DEFAULT 1,
  total          NUMERIC(10,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'debt'
                   CHECK (status IN ('paid','debt','active','cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations: authenticated read"  ON public.reservations;
DROP POLICY IF EXISTS "reservations: authenticated write" ON public.reservations;

CREATE POLICY "reservations: authenticated read"  ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "reservations: authenticated write" ON public.reservations FOR ALL    TO authenticated USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.reservation_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  room_id         UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.reservation_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "res_rooms: authenticated read"  ON public.reservation_rooms;
DROP POLICY IF EXISTS "res_rooms: authenticated write" ON public.reservation_rooms;

CREATE POLICY "res_rooms: authenticated read"  ON public.reservation_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "res_rooms: authenticated write" ON public.reservation_rooms FOR ALL    TO authenticated USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.reservation_services (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  service_id     UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  quantity       INTEGER NOT NULL DEFAULT 1,
  unit_price     NUMERIC(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.reservation_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "res_services: authenticated read"  ON public.reservation_services;
DROP POLICY IF EXISTS "res_services: authenticated write" ON public.reservation_services;

CREATE POLICY "res_services: authenticated read"  ON public.reservation_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "res_services: authenticated write" ON public.reservation_services FOR ALL    TO authenticated USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  amount         NUMERIC(10,2) NOT NULL,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments: authenticated read"  ON public.payments;
DROP POLICY IF EXISTS "payments: authenticated write" ON public.payments;

CREATE POLICY "payments: authenticated read"  ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "payments: authenticated write" ON public.payments FOR ALL    TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- SECTION 10 — WORKERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  birth_date    DATE,
  cin           TEXT,
  phone         TEXT NOT NULL,
  role          TEXT NOT NULL,
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  has_salary    BOOLEAN NOT NULL DEFAULT true,
  salary_type   TEXT CHECK (salary_type IN ('daily','monthly')),
  salary_amount NUMERIC(10,2),
  has_account   BOOLEAN NOT NULL DEFAULT false,
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  permissions   JSONB NOT NULL DEFAULT '{}',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK: profiles.worker_id → workers.id
-- (PostgreSQL has no IF NOT EXISTS for ADD CONSTRAINT — use DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_worker_id_fkey'
      AND table_schema    = 'public'
      AND table_name      = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_worker_id_fkey
      FOREIGN KEY (worker_id) REFERENCES public.workers(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workers: authenticated read" ON public.workers;
DROP POLICY IF EXISTS "workers: admin write"        ON public.workers;
DROP POLICY IF EXISTS "workers: worker reads own"   ON public.workers;

CREATE POLICY "workers: authenticated read" ON public.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "workers: admin write"        ON public.workers FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "workers: worker reads own"   ON public.workers FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());


CREATE TABLE IF NOT EXISTS public.worker_advances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  amount      NUMERIC(10,2) NOT NULL,
  deducted    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.worker_advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_advances: admin all" ON public.worker_advances;

CREATE POLICY "worker_advances: admin all" ON public.worker_advances FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


CREATE TABLE IF NOT EXISTS public.worker_absences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  description TEXT,
  cost        NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.worker_absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_absences: admin all" ON public.worker_absences;

CREATE POLICY "worker_absences: admin all" ON public.worker_absences FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


CREATE TABLE IF NOT EXISTS public.worker_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  amount      NUMERIC(10,2) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.worker_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "worker_payments: admin all" ON public.worker_payments;

CREATE POLICY "worker_payments: admin all" ON public.worker_payments FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


CREATE TABLE IF NOT EXISTS public.job_roles (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_roles: authenticated read" ON public.job_roles;
DROP POLICY IF EXISTS "job_roles: admin write"        ON public.job_roles;

CREATE POLICY "job_roles: authenticated read" ON public.job_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "job_roles: admin write"        ON public.job_roles FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ============================================================
-- SECTION 11 — EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exp_cats: authenticated read" ON public.expense_categories;
DROP POLICY IF EXISTS "exp_cats: admin write"        ON public.expense_categories;

CREATE POLICY "exp_cats: authenticated read" ON public.expense_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "exp_cats: admin write"        ON public.expense_categories FOR ALL    TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


CREATE TABLE IF NOT EXISTS public.expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description TEXT,
  amount      NUMERIC(10,2) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses: authenticated read"  ON public.expenses;
DROP POLICY IF EXISTS "expenses: authenticated write" ON public.expenses;

CREATE POLICY "expenses: authenticated read"  ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses: authenticated write" ON public.expenses FOR ALL    TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- SECTION 12 — CASH TRANSACTIONS (Caisse)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('deposit','withdrawal')),
  amount      NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash: authenticated read"  ON public.cash_transactions;
DROP POLICY IF EXISTS "cash: authenticated write" ON public.cash_transactions;

CREATE POLICY "cash: authenticated read"  ON public.cash_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "cash: authenticated write" ON public.cash_transactions FOR ALL    TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- SECTION 13 — USEFUL VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.reservations_summary AS
SELECT
  r.id,
  r.code,
  r.client_id,
  c.first_name || ' ' || c.last_name       AS client_name,
  c.phone                                   AS client_phone,
  r.check_in,
  r.check_out,
  r.nights,
  r.total,
  COALESCE(SUM(p.amount), 0)               AS paid,
  r.total - COALESCE(SUM(p.amount), 0)     AS balance,
  r.status,
  r.created_at
FROM public.reservations r
JOIN public.clients c  ON c.id = r.client_id
LEFT JOIN public.payments p ON p.reservation_id = r.id
GROUP BY r.id, c.id;


-- ============================================================
-- SECTION 14 — HELPER FUNCTION: current_user_role
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- ============================================================
-- SECTION 15 — HELPER FUNCTION: create_worker_account
-- Creates an auth.users entry for a worker with app access.
-- Called via supabase.rpc() — errors are caught silently in the app.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_worker_account(
  p_worker_id UUID,
  p_email     TEXT,
  p_username  TEXT,
  p_password  TEXT,
  p_name      TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if auth user with this email already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

  IF v_user_id IS NULL THEN
    -- Insert directly into auth.users (requires SECURITY DEFINER + superuser grant)
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'name',      p_name,
        'username',  p_username,
        'role',      'worker',
        'worker_id', p_worker_id::text
      ),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Upsert profile row linking auth user ↔ worker
  INSERT INTO public.profiles (id, email, name, username, role, worker_id)
  VALUES (v_user_id, p_email, p_name, p_username, 'worker', p_worker_id)
  ON CONFLICT (id) DO UPDATE SET
    worker_id = EXCLUDED.worker_id,
    username  = EXCLUDED.username,
    email     = EXCLUDED.email;

  -- Link the auth user back to the worker record
  UPDATE public.workers
  SET auth_user_id = v_user_id, has_account = true
  WHERE id = p_worker_id;

  RETURN v_user_id;
END;
$$;


-- ============================================================
-- SECTION 16 — HELPER FUNCTION: delete_worker_account
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_worker_account(p_worker_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  SELECT auth_user_id INTO v_auth_id FROM public.workers WHERE id = p_worker_id;
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_id;
    UPDATE public.workers SET auth_user_id = NULL, has_account = false WHERE id = p_worker_id;
  END IF;
END;
$$;


-- ============================================================
-- SECTION 17 — FIRST-TIME ADMIN ACCOUNT
-- Creates the admin user if it doesn't already exist.
-- Change the email/password below before running if desired.
-- The handle_new_user trigger automatically creates the profile row.
-- ============================================================

DO $$
DECLARE
  v_uid UUID;
BEGIN
  -- Only create the admin if this email doesn't already exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@residance.dz') THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid,
      'authenticated',
      'authenticated',
      'admin@residance.dz',
      crypt('Admin@123456', gen_salt('bf')),
      NOW(),
      jsonb_build_object(
        'role',     'admin',
        'name',     'Administrateur',
        'username', 'admin'
      ),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      NOW(),
      NOW(),
      '',
      ''
    );

    -- Manually create the profile row (trigger may not fire for direct inserts)
    INSERT INTO public.profiles (id, email, name, username, role)
    VALUES (v_uid, 'admin@residance.dz', 'Administrateur', 'admin', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ── Backfill: fix any existing auth users missing a profile row ──
INSERT INTO public.profiles (id, email, name, username, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name',     u.email),
  COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role',     'admin')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- END OF SCHEMA
-- ============================================================
-- Tables: profiles, settings, floors, categories, rooms,
--   maintenances, services, clients, reservations,
--   reservation_rooms, reservation_services, payments,
--   workers, worker_advances, worker_absences, worker_payments,
--   job_roles, expense_categories, expenses, cash_transactions
--
-- Buckets: logos, avatars, client-photos
--
-- Default admin (change before running if needed):
--   Email:    admin@residance.dz
--   Password: Admin@123456
-- ============================================================
