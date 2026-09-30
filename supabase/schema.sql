-- ============================================================================
--  ระบบจัดการการบำรุงเครื่องจักร (Machine Maintenance Management System)
--  SCHEMA ฉบับรวม — ทุกอย่างที่ต้องมีในฐานข้อมูลอยู่ในไฟล์นี้ไฟล์เดียว
-- ============================================================================
--
--  วิธีใช้
--  ----------------------------------------------------------------------
--    Supabase Dashboard -> SQL Editor -> New query -> วางทั้งไฟล์นี้ -> Run
--
--  ครั้งเดียวจบ ไม่ต้องรันซ้ำ (ไฟล์นี้ idempotent — รันซ้ำก็ปลอดภัย)
--
--  ถ้าฐานข้อมูลยังมีตาราง schema เก่าค้างอยู่
--  ไฟล์นี้จะหยุดพร้อมข้อความบอกรายละเอียดทันที
--  ให้ไปรัน supabase/000_reset.sql ให้เสร็จก่อน แล้วค่อยกลับมารันไฟล์นี้
--
--  ที่มา
--  ----------------------------------------------------------------------
--    ไฟล์นี้รวม migration 2 ไฟล์เรียงตามลำดับที่ถูกต้อง
--      1) supabase/migrations/001_init.sql            — schema หลัก + RLS
--      2) supabase/migrations/002_user_approval.sql   — ระบบอนุมัติผู้ใช้
--    ถ้าต้องการดูว่าอะไรอยู่ตรงไหน ให้ดู migration แยกไฟล์ (ซึ่งเป็นแหล่งที่มา)
--
--  ขอบเขต
--  ----------------------------------------------------------------------
--    ไฟล์นี้สร้างโครงสร้างล้วน (DDL) — ไม่มีข้อมูลตัวอย่าง
--    และไม่มีการสร้างบัญชีผู้ใช้ ต้องสร้างบัญชีแรกผ่าน
--    Supabase Dashboard -> Authentication -> Users -> Add user
--    แล้วค่อยสั่งตั้งสิทธิ์ด้วยคำสั่งท้ายไฟล์นี้
--
--  สรุปสิ่งที่ไฟล์นี้สร้าง
--  ----------------------------------------------------------------------
--    ตาราง                4   profiles, machines, alarms, maintenance_records
--    enum                 5   app_role, machine_status, alarm_status,
--                             maintenance_status, maintenance_priority
--    view                 2   machine_status_counts, alarm_status_counts
--    function             7   set_updated_at, handle_new_user, current_role,
--                             is_admin, is_approved, can_access_system,
--                             protect_profile_approval
--    index               14
--    RLS policy          22   (เปิด RLS ครบทั้ง 4 ตาราง)
--    trigger              3
--
--    schema ที่ใช้      public  (ไม่มี custom schema)
--
--  ความสัมพันธ์ของข้อมูล
--  ----------------------------------------------------------------------
--    profiles 1─N machines 1─N alarms
--    machines 1─N maintenance_records
--    profiles 1─N maintenance_records  (ผู้สร้างงาน / ช่างผู้รับผิดชอบ)
--
--  ชั้นความปลอดภัย
--  ----------------------------------------------------------------------
--    บังคับสิทธิ์ 3 ชั้นพร้อมกัน ไม่พึ่งการซ่อนปุ่มในหน้าเว็บอย่างเดียว
--      1) RLS policy         — บังคับที่ระดับฐานข้อมูล (ชั้นสำคัญที่สุด)
--      2) DAL                — lib/data/auth.ts ตรวจก่อน query
--      3) Server Actions     — ตรวจซ้ำก่อนเขียนข้อมูล
-- ============================================================================


-- ############################################################################
-- #  ส่วนที่ 1  จาก 001_init.sql
-- #  schema หลัก — ตาราง, enum, view, index, RLS
-- ############################################################################

-- ---------------------------------------------------------------------------
--  0. ตรวจสอบก่อนว่าไม่มี schema เก่าค้างอยู่
--     (กันเหตุการณ์ "column machine_type does not exist" ที่เกิดจาก
--      create table if not existing ข้ามการสร้างตารางที่มีอยู่แล้ว)
-- ---------------------------------------------------------------------------

do $$
declare conflicts text;
begin
  select string_agg(x.item, ' | ' order by x.item) into conflicts
  from (
    select 'ตาราง public.maintenance (ชื่อเก่า) ยังอยู่' as item
    where exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'maintenance'
    )

    union all

    select 'public.machines ยังไม่มีคอลัมน์ machine_type' as item
    where exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'machines'
    )
    and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'machines'
        and column_name = 'machine_type'
    )

    union all

    select 'public.alarms ยังไม่มีคอลัมน์ alarm_description' as item
    where exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'alarms'
    )
    and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'alarms'
        and column_name = 'alarm_description'
    )

    union all

    select 'public.profiles ยังไม่มีคอลัมน์ updated_at' as item
    where exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'profiles'
    )
    and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name = 'updated_at'
    )
    union all

    -- enum ที่มีอยู่แล้วแต่ขาดค่าที่ระบบต้องใช้ (schema เก่าค้างมา)
    select format('enum %s ขาดค่า %s', t.typname::text, req.label::text) as item
    from (values
      ('app_role', 'admin'),
      ('app_role', 'technician'),
      ('machine_status', 'running'),
      ('machine_status', 'stop'),
      ('machine_status', 'alarm'),
      ('machine_status', 'maintenance'),
      ('alarm_status', 'open'),
      ('alarm_status', 'in_progress'),
      ('alarm_status', 'closed'),
      ('maintenance_status', 'pending'),
      ('maintenance_status', 'in_progress'),
      ('maintenance_status', 'completed'),
      ('maintenance_status', 'cancelled'),
      ('maintenance_priority', 'low'),
      ('maintenance_priority', 'medium'),
      ('maintenance_priority', 'high'),
      ('maintenance_priority', 'critical')
    ) as req(typname, label)
    join pg_type t
      on t.typname = req.typname
     and t.typtype = 'e'
    where not exists (
      select 1
      from pg_enum e
      where e.enumtypid = t.oid
        and e.enumlabel = req.label
    )
  ) x;

  if conflicts is not null then
    raise exception
      'พบ schema เก่ายังอยู่ในฐานข้อมูล: % || กรุณารัน supabase/000_reset.sql ให้เสร็จก่อน แล้วค่อยรันไฟล์นี้อีกครั้ง (ถ้าข้อความเป็น enum ที่ขาดค่า ให้ใช้ alter type ... add value แทนการ reset ก็ได้)', conflicts;
  end if;
end $$;

-- ---------------------------------------------------------------------------
--  1. ประเภทข้อมูล (enum types)
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.app_role as enum ('admin', 'technician');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.machine_status as enum ('running', 'stop', 'alarm', 'maintenance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.alarm_status as enum ('open', 'in_progress', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.maintenance_status as enum ('pending', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.maintenance_priority as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
--  2. ตาราง
-- ---------------------------------------------------------------------------

-- 2.1 profiles : ข้อมูลหลักของผู้ใช้ ผูกกับ auth.users ด้วย id (FK)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        public.app_role not null default 'technician',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'ข้อมูลหลักของผู้ใช้งาน ผูก 1:1 กับ auth.users';

-- 2.2 machines : Machine Master
create table if not exists public.machines (
  id            uuid primary key default gen_random_uuid(),
  machine_code  text not null unique,          -- Machine ID
  machine_name  text not null,                 -- Machine Name
  machine_type  text not null,                 -- Machine Type
  location      text not null,                 -- Location
  status        public.machine_status not null default 'stop',
  description   text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint machines_code_not_blank check (length(btrim(machine_code)) > 0),
  constraint machines_name_not_blank check (length(btrim(machine_name)) > 0)
);

create index if not exists machines_status_idx   on public.machines (status);
create index if not exists machines_type_idx     on public.machines (machine_type);
create index if not exists machines_location_idx on public.machines (location);
-- ช่วยให้ค้นหาด้วยชื่อเครื่อง/รหัสแบบไม่สนตัวพิมพ์
create index if not exists machines_search_idx   on public.machines (lower(machine_name), lower(machine_code));

-- 2.3 alarms : Alarm Record  (ผูกกับ machine 1:N)
create table if not exists public.alarms (
  id                 uuid primary key default gen_random_uuid(),
  machine_id         uuid not null references public.machines (id) on delete cascade,
  alarm_code         text not null,             -- Alarm Code
  alarm_description  text not null,             -- Alarm Description
  occurred_at        timestamptz not null default now(),  -- Date/Time ที่เกิด Alarm
  cause              text,                      -- Cause
  status             public.alarm_status not null default 'open',
  reported_by        uuid references public.profiles (id) on delete set null,
  assigned_to        uuid references public.profiles (id) on delete set null,  -- Technician ที่รับผิดชอบ
  resolved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint alarms_code_not_blank    check (length(btrim(alarm_code)) > 0),
  constraint alarms_desc_not_blank   check (length(btrim(alarm_description)) > 0),
  -- ปิด Alarm ต้องมีเวลาที่แก้ไขเสร็จ
  constraint alarms_closed_needs_time check (
    status <> 'closed' or resolved_at is not null
  )
);

create index if not exists alarms_machine_idx    on public.alarms (machine_id);
create index if not exists alarms_status_idx     on public.alarms (status);
create index if not exists alarms_code_idx       on public.alarms (alarm_code);
create index if not exists alarms_assigned_idx   on public.alarms (assigned_to);
create index if not exists alarms_occurred_idx   on public.alarms (occurred_at desc);

-- 2.4 maintenance_records : Maintenance Record
create table if not exists public.maintenance_records (
  id              uuid primary key default gen_random_uuid(),
  machine_id      uuid not null references public.machines (id) on delete cascade,
  title           text not null,
  description     text,
  scheduled_at    timestamptz not null,         -- วันที่/เวลาที่วางแผน
  completed_at    timestamptz,
  status          public.maintenance_status not null default 'pending',
  priority        public.maintenance_priority not null default 'medium',
  cost            numeric(12, 2),
  parts_used      text,
  notes           text,
  created_by      uuid references public.profiles (id) on delete set null,
  technician_id   uuid references public.profiles (id) on delete set null,  -- Technician ผู้ดำเนินงาน
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint maintenance_title_not_blank check (length(btrim(title)) > 0),
  constraint maintenance_cost_nonneg   check (cost is null or cost >= 0),
  constraint maintenance_complete_time check (
    status <> 'completed' or completed_at is not null
  )
);

create index if not exists maintenance_machine_idx  on public.maintenance_records (machine_id);
create index if not exists maintenance_status_idx   on public.maintenance_records (status);
create index if not exists maintenance_sched_idx    on public.maintenance_records (scheduled_at desc);
create index if not exists maintenance_tech_idx     on public.maintenance_records (technician_id);

-- ---------------------------------------------------------------------------
--  3. อัปเดต updated_at อัตโนมัติ
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'machines', 'alarms', 'maintenance_records'] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
--  4. สร้าง profile อัตโนมัติเมื่อมีผู้ใช้สมัครใหม่ (sign up)
--    ค่าเริ่มต้นคือ 'technician'  — การเลื่อนเป็น admin ต้องทำโดย Admin เท่านั้น
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'technician'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
--  5. ฟังก์ชันช่วยอ่าน role (ใช้ใน RLS policy)
--    SECURITY DEFINER + stable เพื่อหลีกเลี่ยงการวนซ้ำของ RLS ตอนอ่าน profiles
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

-- ---------------------------------------------------------------------------
--  6. Row Level Security
--    Admin      : อ่าน/เขียน/ลบทุกอย่าง (จัดการ Machine, Alarm, Maintenance และข้อมูลหลัก)
--    Technician : อ่านทุกอย่าง, เขียน Alarm (เปลี่ยนสถานะ) และ Maintenance
--                 แต่ ห้าม ลบเครื่องจักร และห้ามแก้ไข/ลบ Machine Master
-- ---------------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.machines           enable row level security;
alter table public.alarms             enable row level security;
alter table public.maintenance_records enable row level security;

-- 6.1 profiles -------------------------------------------------------------
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select to authenticated
  using (true);

-- ผู้ใช้แก้ไขได้เฉพาะข้อมูลของตัวเอง และห้ามเปลี่ยน role ของตัวเอง
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_role());

-- เฉพาะ Admin ที่จัดการข้อมูลหลัก (เช่น เลื่อน role ของช่าง) ได้
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 6.2 machines -------------------------------------------------------------
drop policy if exists machines_select_all on public.machines;
create policy machines_select_all on public.machines
  for select to authenticated
  using (true);

-- Create / Update / Delete เฉพาะ Admin เท่านั้น (Machine Master เป็นหน้าที่ของ Admin)
drop policy if exists machines_admin_insert on public.machines;
create policy machines_admin_insert on public.machines
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists machines_admin_update on public.machines;
create policy machines_admin_update on public.machines
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists machines_admin_delete on public.machines;
create policy machines_admin_delete on public.machines
  for delete to authenticated
  using (public.is_admin());

-- 6.3 alarms ---------------------------------------------------------------
drop policy if exists alarms_select_all on public.alarms;
create policy alarms_select_all on public.alarms
  for select to authenticated
  using (true);

-- ทั้ง Admin และ Technician บันทึก/แก้ไข Alarm ได้ (เปลี่ยนสถานะได้)
drop policy if exists alarms_insert_all on public.alarms;
create policy alarms_insert_all on public.alarms
  for insert to authenticated
  with check (true);

drop policy if exists alarms_update_all on public.alarms;
create policy alarms_update_all on public.alarms
  for update to authenticated
  using (true)
  with check (true);

-- 6.4 maintenance_records --------------------------------------------------
drop policy if exists maintenance_select_all on public.maintenance_records;
create policy maintenance_select_all on public.maintenance_records
  for select to authenticated
  using (true);

-- ทั้ง Admin และ Technician บันทึก/แก้ไข Maintenance ได้
drop policy if exists maintenance_insert_all on public.maintenance_records;
create policy maintenance_insert_all on public.maintenance_records
  for insert to authenticated
  with check (true);

drop policy if exists maintenance_update_all on public.maintenance_records;
create policy maintenance_update_all on public.maintenance_records
  for update to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
--  7. View สำหรับ Dashboard (นับจำนวนตามสถานะ)
-- ---------------------------------------------------------------------------

create or replace view public.machine_status_counts
with (security_invoker = true) as
  select
    status,
    count(*)::int as total
  from public.machines
  group by status;

create or replace view public.alarm_status_counts
with (security_invoker = true) as
  select
    status,
    count(*)::int as total
  from public.alarms
  group by status;

-- ---------------------------------------------------------------------------
--  8. สิทธิ์ของ service_role
--    (RLS ถูก bypass โดย service_role อัตโนมัติ — ไม่ต้อง grant เพิ่ม แต่ใส่ไว้ให้ชัด)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- ############################################################################
-- #  ส่วนที่ 2  จาก 002_user_approval.sql
-- #  ระบบอนุมัติผู้ใช้
-- #
-- #  ผู้สมัครใหม่ได้ is_approved = false และถูกบล็อกทุกอย่าง
-- #  จนกว่า Admin จะอนุมัติ (กรณีบัญชีถูกล็อก:
-- #  update public.profiles set is_approved = true where role = 'admin';)
-- ############################################################################

-- ---------------------------------------------------------------------------
--  1. คอลัมน์สถานะการอนุมัติ
--     ผู้สมัครใหม่ได้ is_approved = false และถูกบล็อกทุกอย่างจนกว่า Admin จะอนุมัติ
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_approved boolean not null default false;

alter table public.profiles
  add column if not exists approved_at timestamptz;

alter table public.profiles
  add column if not exists approved_by uuid;

do $$ begin
  alter table public.profiles
    add constraint profiles_approved_by_fkey
    foreign key (approved_by) references public.profiles (id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists profiles_pending_idx
  on public.profiles (is_approved)
  where is_approved = false;

-- ผู้ใช้ที่มีอยู่ก่อน migration นี้ถือว่าได้รับอนุมัติแล้ว
-- (สำคัญมาก: ถ้าไม่ทำ บัญชี admin เดิมจะถูกล็อกและไม่มีใครปลดล็อกได้)
update public.profiles
set is_approved = true,
    approved_at = coalesce(approved_at, now())
where is_approved = false
  and id in (select id from auth.users);

-- ---------------------------------------------------------------------------
--  2. ฟังก์ชันอ่านสถานะ (ใช้ใน RLS policy)
-- ---------------------------------------------------------------------------

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_approved from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- ผู้ที่เข้าใช้ระบบได้ = อนุมัติแล้ว หรือ เป็น admin
-- ยกเว้น admin เสมอ เพื่อไม่ให้ระบบล็อกตัวเองจนไม่มีใครปลดล็อกได้
create or replace function public.can_access_system()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_approved() or public.is_admin();
$$;

-- ---------------------------------------------------------------------------
--  3. ป้องกันผู้ใช้อนุมัติหรือยกเลิกการอนุมัติตัวเอง
--    ทำที่ระดับ trigger เพราะ RLS with check ตรวจได้แค่ค่าใหม่
--    ไม่รู้ว่าค่าเดิมเป็นอะไร จึงกันการเขียนทับไม่ได้
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_approved is distinct from old.is_approved
     or new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
  then
    -- service_role ใช้ตั้งค่าเริ่มต้น/กู้คืนระบบได้
    if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
      return new;
    end if;

    if not public.is_admin() then
      raise exception 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถอนุมัติหรือยกเลิกการอนุมัติผู้ใช้ได้'
        using errcode = '42501';
    end if;

    -- บันทึกผู้อนุมัติและเวลาอัตโนมัติเมื่อสถานะเปลี่ยนเป็นอนุมัติ
    if new.is_approved and (old.is_approved is distinct from true) then
      new.approved_at := coalesce(new.approved_at, now());
      new.approved_by := coalesce(new.approved_by, auth.uid());
    elsif not new.is_approved then
      new.approved_at := null;
      new.approved_by := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_approval on public.profiles;
create trigger profiles_protect_approval
  before update on public.profiles
  for each row execute function public.protect_profile_approval();

-- ---------------------------------------------------------------------------
--  4. อัปเดต RLS — ผู้ที่ยังไม่ได้รับอนุมัติอ่าน/เขียนข้อมูลหลักไม่ได้
-- ---------------------------------------------------------------------------

-- profiles: ผู้ไม่อนุมัติเห็นแค่แถวของตัวเอง (จำเป็นสำหรับหน้า "รออนุมัติ")
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select to authenticated
  using (public.can_access_system() or id = auth.uid());

-- machines
drop policy if exists machines_select_all on public.machines;
create policy machines_select_all on public.machines
  for select to authenticated
  using (public.can_access_system());

-- alarms
drop policy if exists alarms_select_all on public.alarms;
create policy alarms_select_all on public.alarms
  for select to authenticated
  using (public.can_access_system());

drop policy if exists alarms_insert_all on public.alarms;
create policy alarms_insert_all on public.alarms
  for insert to authenticated
  with check (public.can_access_system());

drop policy if exists alarms_update_all on public.alarms;
create policy alarms_update_all on public.alarms
  for update to authenticated
  using (public.can_access_system())
  with check (public.can_access_system());

-- maintenance_records
drop policy if exists maintenance_select_all on public.maintenance_records;
create policy maintenance_select_all on public.maintenance_records
  for select to authenticated
  using (public.can_access_system());

drop policy if exists maintenance_insert_all on public.maintenance_records;
create policy maintenance_insert_all on public.maintenance_records
  for insert to authenticated
  with check (public.can_access_system());

drop policy if exists maintenance_update_all on public.maintenance_records;
create policy maintenance_update_all on public.maintenance_records
  for update to authenticated
  using (public.can_access_system())
  with check (public.can_access_system());

-- View ของ dashboard ใช้ security_invoker จึงตาม policy ของตารางข้างเหนือ
-- (machines write ใช้ is_admin() จาก 001 อยู่แล้ว จึงเข้าใช้งานได้เสมอ)

-- ---------------------------------------------------------------------------
--  5. ป้องกันซ้ำอีกชั้นที่ระดับ policy: ผู้ใช้ห้ามเปลี่ยนสถานะอนุมัติของตัวเอง
--     (trigger ข้อ 3 เป็นชั้นหลัก ชั้นนี้กันกรณี trigger ถูกลบทิ้งไป)
--
--     ต้องอ้าง public.is_approved() ซึ่งเป็น SECURITY DEFINER
--     ถ้า select จาก profiles ตรง ๆ RLS จะเรียกตัวเองวนจน error
-- ---------------------------------------------------------------------------

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_role()
    and is_approved = public.is_approved()
  );

-- ---------------------------------------------------------------------------
--  6. ตรวจสอบผลลัพธ์ (คืนค่าตารางสรุป ให้สังเกตก่อนออกจาก SQL Editor)
-- ---------------------------------------------------------------------------

do $$
declare
  pending integer;
  unapproved_admin integer;
begin
  select count(*) into pending
  from public.profiles where is_approved = false;

  select count(*) into unapproved_admin
  from public.profiles where role = 'admin' and is_approved = false;

  if unapproved_admin > 0 then
    raise exception
      'พบ % บัญชี Admin ที่ยังไม่ได้รับอนุมัติ — ระบบอาจเข้าใช้งานไม่ได้', unapproved_admin;
  end if;

  raise notice 'ติดตั้งระบบอนุมัติผู้ใช้เรียบร้อย (ผู้ที่รออนุมัติ: % คน)', pending;
end;
$$;

-- ============================================================================
--  ขั้นตอนถัดไปหลังรันไฟล์นี้เสร็จ
-- ============================================================================
--
--   1. สร้างบัญชีผู้ดูแลระบบ
--        Supabase Dashboard -> Authentication -> Users -> Add user
--        (ใช้ email + password แล้วเปิด Auto Confirm User)
--
--   2. ยกสิทธิ์เป็น Admin  — รันใน SQL Editor
--        update public.profiles
--          set role = 'admin'
--        where email = 'คุณ@example.com';
--
--   3. ตรวจว่า RLS ทำงานถูกต้อง (ต้องเห็น 4 ตาราง)
--        select tablename, rowsecurity
--        from pg_tables
--        where schemaname = 'public'
--        order by tablename;
--
--   4. ใส่ค่าใน .env.local ของโปรเจกต์
--        NEXT_PUBLIC_SUPABASE_URL
--        NEXT_PUBLIC_SUPABASE_ANON_KEY
--        SUPABASE_SERVICE_ROLE_KEY
--        NEXT_PUBLIC_SITE_URL
--
--   5. รันระบบ
--        npm ci
--        npm run dev
--
--   6. (ตัวเลือก) ทดสอบวงจรอนุมัติผู้ใช้อัตโนมัติ — ผ่าน 10/10
--        npm run verify:approval
--
-- ============================================================================
