-- ===========================================================================
--  002_user_approval.sql
--  ระบบอนุมัติผู้ใช้: สมัครได้ แต่ยังเข้าใช้งานไม่ได้จนกว่า Admin จะอนุมัติ
--
--  รันหลังจาก 001_init.sql  (ใน query แยกอีกครั้ง)
-- ===========================================================================

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

-- ---------------------------------------------------------------------------
--  เสร็จแล้ว — ขั้นตอนถัดไป:
--    1. เปิดหน้า /users ด้วยบัญชี Admin เพื่ออนุมัติผู้สมัครใหม่
--    2. ถ้าบัญชี admin ถูกล็อกผิด ปลดล็อกด้วย:
--         update public.profiles set is_approved = true where role = 'admin';
-- ---------------------------------------------------------------------------
