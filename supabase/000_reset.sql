-- ============================================================================
--  คำเตือน: ไฟล์นี้ลบข้อมูลถาวร
--  ใช้เฉพาะกรณีต้องการเริ่ม schema ใหม่ทั้งหมด
--  ลำดับที่ต้องรัน:
--     1) supabase/000_reset.sql        (ไฟล์นี้ — ลบของเดิมทิ้ง)
--     2) supabase/migrations/001_init.sql   (สร้าง schema ใหม่)
--
--  ⚠️  ข้อมูลในตาราง machines / alarms / maintenance / profiles
--     จะหายไปทั้งหมด ไม่มีการสำรอง
-- ============================================================================

-- 1) View ของระบบเดิม
drop view if exists public.machine_status_counts;
drop view if exists public.alarm_status_counts;

-- 2) ตารางทั้งหมด (cascade จะลบ policy, index, constraint และ FK ที่พึ่งพากัน)
drop table if exists public.maintenance cascade;
drop table if exists public.alarms     cascade;
drop table if exists public.machines   cascade;
drop table if exists public.profiles   cascade;

-- 3) Trigger ที่ผูกกับ auth.users
drop trigger if exists on_auth_user_created on auth.users;

-- 4) ฟังก์ชันของระบบ
drop function if exists public.current_role();
drop function if exists public.is_admin();
drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();

-- 5) ประเภทข้อมูล (enum)
drop type if exists public.app_role;
drop type if exists public.machine_status;
drop type if exists public.alarm_status;
drop type if exists public.maintenance_status;
drop type if exists public.maintenance_priority;

-- 6) ตรวจสอบว่าสะอาดแล้วจริง — ควรได้ผลลัพธ์ 0 ทุกบรรทัด
select count(*) as should_be_0_tables
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'machines', 'alarms', 'maintenance', 'maintenance_records');
