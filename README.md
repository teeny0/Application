# ระบบจัดการการบำรุงเครื่องจักร (Machine Maintenance Management)

![CI](https://github.com/teeny0/Application/actions/workflows/ci.yml/badge.svg)
[![Vercel](https://img.shields.io/badge/vercel-live-black)](https://github.com/teeny0/Application)

ระบบจัดการข้อมูลเครื่องจักร, Alarm และงานบำรุง พร้อมระบบล็อกอินและสิทธิ์ผู้ใช้
ผู้สมัครใหม่ต้องรอผู้ดูแลระบบอนุมัติก่อนจึงจะเข้าใช้งานได้
สร้างด้วย **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Supabase**

## เว็บไซต์ที่ Deploy แล้ว (Vercel)

| รายการ | ค่า |
| --- | --- |
| URL | **[ยังไม่ได้ deploy](https://github.com/teeny0/Application)** — ใส่ลิงก์จริงตรงนี้ |
| Branch ที่ deploy | `main` |
| Build command | `npm run build` |

> ตอน deploy ต้องตั้ง Environment Variables ใน Vercel ครบทั้ง 4 ตัว
> และเปลี่ยน `NEXT_PUBLIC_SITE_URL` เป็นโดเมนจริง
> (ถ้าเป็นโดเมน preview ของ Vercel ให้ใส่ URL แบบ preview ด้วย เพราะลิงก์ยืนยันอีเมลจะพากลับมาที่ URL นั้น)

---

## 1. Technology Stack

| เทคโนโลยี | เวอร์ชัน | ใช้ทำอะไร |
| --- | --- | --- |
| **Next.js** | 16.3.7 (App Router) | เฟรมเวิร์กหลัก, Server Actions, Route Handlers |
| **React** | 19.2.8 | UI |
| **TypeScript** | 5.x | ตรวจชนิดข้อมูลทั้งโปรเจกต์ (strict) |
| **Tailwind CSS** | 4.3.3 | สไตล์ + ระบบ dark mode |
| **Supabase** | PostgreSQL | ฐานข้อมูล, Row Level Security, Auth, Storage |
| `@supabase/ssr` | 0.12.x | จัดการ session cookie ฝั่ง server (SSR) |
| `@supabase/supabase-js` | 2.117.x | client ของ Supabase |
| **Zod** | 4.x | ตรวจสอบข้อมูลฟอร์มทุกช่องก่อนเขียน DB |
| **GitHub Actions** | — | CI ตรวจ Install → Build → Lint → Test อัตโนมัติ |
| **Vercel** | — | Hosting (วางแผน deploy) |

### Function หลัก

| ฟีเจอร์ | รายละเอียด |
| --- | --- |
| **Dashboard** | สรุปจำนวนเครื่อง/Alarm/งานบำรุง + กราฟแท่ง 7 วัน + สถานะรายเครื่อง |
| **Machine Master** | CRUD เครื่องจักร (รหัส, ชื่อ, ประเภท, สถานที่, สถานะ) — Admin เท่านั้นที่แก้ได้ |
| **Alarm Record** | บันทึก/แก้ไข Alarm, ผูกกับเครื่อง, มอบหมายช่าง, เปลี่ยนสถานะ |
| **Maintenance Record** | งานบำรุงตามรอบ, กำหนดกำหนดเวลา, ต้นทุน, อะไหล่, ช่างผู้รับผิดชอบ |
| **ระบบอนุมัติผู้ใช้** | ผู้สมัครใหม่รออนุมัติจาก Admin ก่อนเข้าใช้งาน |
| **จัดการสิทธิ์** | 3 ระดับ: RLS → DAL → Server Action |
| **ค้นหา/กรอง** | ค้นหาแบบข้ามตาราง + กรองหลายเงื่อนไขผ่าน query string |
| **Dark mode** | สลับสว่าง/มืด จำค่าไว้ + ตามค่าระบบปฏิบัติการ |
| **CI** | ตรวจอัตโนมัติทุกครั้งที่ push |

---

## 2. Database Structure

ฐานข้อมูล PostgreSQL ของ Supabase (schema `public`) มี 4 ตาราง 2 view และ 7 ฟังก์ชัน

### ความสัมพันธ์ของข้อมูล

```
auth.users ──1:1──> profiles
machines  ──1:N──> alarms
machines  ──1:N──> maintenance_records
profiles  ──1:N──> alarms (reported_by / assigned_to)
profiles  ──1:N──> maintenance_records (created_by / technician_id)
```

- การลบเครื่องจักรจะ **ลบ Alarm และงานบำรุงของเครื่องนั้นทิ้งด้วย** (`ON DELETE CASCADE`)
- การลบผู้ใช้จะตั้ง `created_by` / `assigned_to` เป็น `NULL` (`ON DELETE SET NULL`)

### ตาราง

**`profiles`** — ข้อมูลผู้ใช้ 1 ต่อ 1 กับ `auth.users`
สร้างอัตโนมัติโดย trigger `handle_new_user()` เมื่อมีผู้สมัครใหม่

| คอลัมน์ | ชนิด | หมายเหตุ |
| --- | --- | --- |
| `id` | `uuid` PK | อ้างอิง `auth.users(id)` |
| `email` | `text` | |
| `full_name` | `text` | |
| `role` | `app_role` | `admin` \| `technician` (ค่าเริ่มต้น `technician`) |
| `is_approved` | `boolean` | เพิ่มจาก migration 002 — ต้องผ่านการอนุมัติก่อน |
| `approved_at` | `timestamptz` | เวลาที่อนุมัติ |
| `approved_by` | `uuid` | ผู้อนุมัติ |
| `created_at` / `updated_at` | `timestamptz` | |

**`machines`** — ข้อมูลเครื่องจักรหลัก

| คอลัมน์ | ชนิด | หมายเหตุ |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `machine_code` | `text` **unique** | Machine ID |
| `machine_name` | `text` | Machine Name |
| `machine_type` | `text` | Machine Type |
| `location` | `text` | Location |
| `status` | `machine_status` | `running` \| `stop` \| `alarm` \| `maintenance` |
| `description` | `text` | |
| `created_by` | `uuid` → `profiles` | |
| `created_at` / `updated_at` | `timestamptz` | |

**`alarms`** — บันทึก Alarm ของเครื่องจักร

| คอลัมน์ | ชนิด | หมายเหตุ |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `machine_id` | `uuid` → `machines` | CASCADE |
| `alarm_code` | `text` | Alarm Code |
| `alarm_description` | `text` | Alarm Description |
| `occurred_at` | `timestamptz` | เวลาที่เกิด Alarm |
| `cause` | `text` | สาเหตุ |
| `status` | `alarm_status` | `open` \| `in_progress` \| `closed` |
| `reported_by` | `uuid` → `profiles` | ผู้แจ้ง |
| `assigned_to` | `uuid` → `profiles` | ช่างที่ได้รับมอบหมาย |
| `resolved_at` | `timestamptz` | ต้องมีเมื่อ status = `closed` (บังคับด้วย CHECK) |
| `created_at` / `updated_at` | `timestamptz` | |

**`maintenance_records`** — งานบำรุง

| คอลัมน์ | ชนิด | หมายเหตุ |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `machine_id` | `uuid` → `machines` | CASCADE |
| `title` | `text` | |
| `description` | `text` | |
| `scheduled_at` | `timestamptz` | กำหนดเวลา/นัดหมาย |
| `completed_at` | `timestamptz` | ต้องมีเมื่อ status = `completed` (บังคับด้วย CHECK) |
| `status` | `maintenance_status` | `pending` \| `in_progress` \| `completed` \| `cancelled` |
| `priority` | `maintenance_priority` | `low` \| `medium` \| `high` \| `critical` |
| `cost` | `numeric(12,2)` | ≥ 0 (บังคับด้วย CHECK) |
| `parts_used` | `text` | อะไหล่ที่ใช้ |
| `notes` | `text` | |
| `created_by` / `technician_id` | `uuid` → `profiles` | |
| `created_at` / `updated_at` | `timestamptz` | |

### Enum

`app_role` · `machine_status` · `alarm_status` · `maintenance_status` · `maintenance_priority`

### View

| View | ใช้ทำอะไร |
| --- | --- |
| `machine_status_counts` | นับจำนวนเครื่องแยกตามสถานะ (Dashboard) |
| `alarm_status_counts` | นับจำนวน Alarm แยกตามสถานะ (Dashboard) |

### Function และ Trigger

| ชื่อ | หน้าที่ |
| --- | --- |
| `handle_new_user()` | สร้างแถวใน `profiles` อัตโนมัติเมื่อมีผู้สมัครใหม่ |
| `set_updated_at()` | อัปเดต `updated_at` ทุกครั้งที่แก้ไข |
| `current_role()` | คืน role ของผู้ใช้ปัจจุบัน |
| `is_admin()` | ตรวจว่าเป็น admin |
| `is_approved()` | ตรวจสถานะอนุมัติ (ใช้ใน RLS) |
| `can_access_system()` | ตรวจว่าเข้าใช้งานได้ (ใช้ใน RLS) |
| `protect_profile_approval()` | กันไม่ให้ผู้ใช้อนุมัติ/ยกเลิกสิทธิ์ตัวเอง |

### Index

14 ดัชนี ครอบคลุมการค้นหาที่ใช้จริง เช่น `machines_status_idx`, `alarms_occurred_idx`,
`maintenance_sched_idx` และ `profiles_pending_idx`

### Row Level Security

RLS เปิดใช้งานทุกตาราง โดย policy คิดจาก `current_role()` / `is_approved()`
ผู้ที่ยังไม่ได้รับอนุมัติจะอ่าน/เขียนข้อมูลหลักไม่ได้แม้จะล็อกอินผ่านแล้วก็ตาม

---

## 3. GitHub Actions (CI)

ไฟล์ workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

ทำงานอัตโนมัติทุกครั้งที่ push เข้า `main` และทุก Pull Request

| ขั้นตอน | คำสั่ง | หน้าที่ |
| --- | --- | --- |
| 1. Install Dependencies | `npm ci` | ติดตั้งแบบตรงกับ lock file |
| 2. Build Project | `npm run build` | compile + TypeScript + prerender |
| 3. Lint | `npm run lint` | ESLint |
| 4. TypeScript | `npx tsc --noEmit` | ตรวจชนิดข้อมูล |
| 5. Test | `npm run check:contrast` | ตรวจคอนทราสต์ dark palette ตาม WCAG AA |

ผลลัพธ์จะแสดงเป็นเครื่องหมาย ✓ หรือ ✗ ที่มุมบนซ้ายของหน้า repository
และดูรายละเอียดแต่ละขั้นตอนได้ที่แท็บ **Actions**

> CI ไม่ต้องใช้ secret ใด ๆ เพราะ `lib/env.ts` ตรวจว่ามีค่า environment หรือไม่
> และแสดงข้อความแนะนำบนหน้า Login แทนการ throw error

---

## 4. ติดตั้ง Dependencies

```bash
npm install
```

ใช้ Supabase และ Zod ที่ติดตั้งไว้แล้ว:

| แพ็กเกจ | เวอร์ชัน | ใช้ทำอะไร |
| --- | --- | --- |
| `@supabase/supabase-js` | 2.x | ตัว client ของ Supabase |
| `@supabase/ssr` | 0.12.x | session cookie + SSR helper |
| `zod` | 4.x | ตรวจสอบข้อมูลฟอร์ม |

> บน PowerShell ถ้ารัน `npm` แล้วขึ้น error เรื่อง execution policy ให้ใช้ `npm.cmd` แทน

---

## 5. ตั้งค่า Environment Variables

```bash
cp .env.example .env.local
# PowerShell:
# Copy-Item .env.example .env.local
```

แก้ค่าใน `.env.local` ให้เป็นค่าจริงจาก **Supabase Dashboard → Project Settings → API**

| ตัวแปร | ค่าที่ต้องใส่ | ความปลอดภัย |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | เปิดเผยได้ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key | เปิดเผยได้ |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key | **ห้ามเปิดเผย** |
| `NEXT_PUBLIC_SITE_URL` | URL ของเว็บไซต์ เช่น `https://your-app.vercel.app` | เปิดเผยได้ |

`NEXT_PUBLIC_SITE_URL` ใช้สร้างลิงก์ในอีเมลยืนยันบัญชี ให้ผู้สมัครกลับมาที่ `/pending`
ตอน dev ใช้ `http://localhost:3000` ได้ — **ตอน deploy ต้องเปลี่ยนเป็นโดเมนจริง**

ข้อควรระวังเรื่องความปลอดภัย:

- ไฟล์ `.env*` ถูก `.gitignore` ไว้ทั้งหมด (ยกเว้น `.env.example`) จึงไม่มีความเสี่ยงที่ secret จะถูก commit
- `SUPABASE_SERVICE_ROLE_KEY` **ห้าม** นำหน้าด้วย `NEXT_PUBLIC_`
- `SUPABASE_SERVICE_ROLE_KEY` อ่านได้จาก `lib/supabase/admin.ts` เท่านั้น ซึ่งมี `"server-only"`
- ห้าม import `lib/supabase/admin.ts` ลงใน Client Component เด็ดขาด

---

## 6. สร้างตารางในฐานข้อมูล

เปิด **Supabase Dashboard → SQL Editor** แล้ววางเนื้อหาไฟล์
[`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) แล้วกด **Run**

ไฟล์นี้จะสร้าง:

- Enum: `app_role`, `machine_status`, `alarm_status`, `maintenance_status`, `maintenance_priority`
- ตาราง: `profiles`, `machines`, `alarms`, `maintenance_records`
- Index สำหรับช่องที่ใช้ค้นหา/กรอง
- Trigger สร้าง `profiles` อัตโนมัติเมื่อมีผู้ใช้สมัครใหม่
- Row Level Security (RLS) พร้อม policy ตามสิทธิ์
- View สำหรับ Dashboard (`machine_status_summary`, `alarm_trend_7d`)
- Grant สิทธิ์ให้ role ต่าง ๆ

### ความสัมพันธ์ของข้อมูล

```
auth.users ──1:1──> profiles
machines  ──1:N──> alarms
machines  ──1:N──> maintenance_records
```

- `profiles` → `alarms.reported_by` / `alarms.assigned_to`
- `profiles` → `maintenance_records.created_by` / `maintenance_records.technician_id`

การลบเครื่องจักรจะ **ลบ Alarm และงานบำรุงของเครื่องนั้นทิ้งด้วย** (`ON DELETE CASCADE`)

---

## 6.1 เพิ่มระบบอนุมัติผู้ใช้

รันไฟล์ [`supabase/migrations/002_user_approval.sql`](supabase/migrations/002_user_approval.sql)
ต่อจากข้อ 6 (แยก query อีกครั้ง)

ไฟล์นี้จะเพิ่ม:

- คอลัมน์ `profiles.is_approved` / `approved_at` / `approved_by`
- ฟังก์ชัน `is_approved()` และ `can_access_system()` ใช้คิด RLS
- Trigger ป้องกันผู้ใช้อนุมัติหรือยกเลิกสิทธิ์ของตัวเอง
- RLS ใหม่ที่บล็อกผู้ยังไม่อนุมัติจากการอ่าน/เขียนข้อมูลหลัก

> ผู้ใช้ที่มีอยู่ก่อนรัน migration นี้จะถูกตั้งเป็น "อนุมัติแล้ว" อัตโนมัติ
> เพื่อไม่ให้บัญชี Admin เดิมถูกล็อกจนไม่มีใครปลดล็อกได้

หลังจากรัน ปลายทางของระบบจะเป็น:

```
ช่างสมัครที่ /signup
  → เข้าสู่ระบบ
  → ถูกส่งไป /pending และอ่าน/เขียนข้อมูลไม่ได้
  → Admin เปิด /users แล้วกด "อนุมัติ"
  → เข้าสู่ระบบใหม่จึงเข้าใช้งานได้
```

---

## 7. สร้างบัญชีผู้ดูแลระบบ (Admin) คนแรก

1. ไปที่ **Supabase Dashboard → Authentication → Users → Add user**
2. สร้างบัญชี Admin 1 บัญชี (ติ๊กยืนยันอีเมลถ้าต้องการให้ล็อกอินได้ทันที)
3. ผู้ใช้ใหม่จะได้รับ role `technician` โดยอัตโนมัติจาก trigger
4. ถ้าต้องการบัญชี Admin ให้รันคำสั่งนี้ใน SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'you@example.com';
```

> ทำขั้นตอนนี้หลังสร้างผู้ใช้เท่านั้น เพราะ trigger จะสร้างแถวใน `profiles` ให้อัตโนมัติ
>
> ต้องรันหลัง `002_user_approval.sql` แล้ว เพราะก่อนหน้านั้นผู้ใช้ทุกคนจะยังไม่ถูกอนุมัติ

### ช่างทุกคนที่เหลือมาสมัครเองได้

เปิดหน้า `/signup` ได้เลย ไม่ต้องสร้างผ่าน Supabase Dashboard
ผู้สมัครใหม่จะรออยู่ในสถานะ "รออนุมัติ" จนกว่า Admin จะกดอนุมัติในหน้า `/users`

---

## 8. เริ่มระบบ

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) แล้วเข้าสู่ระบบ

หากยังไม่ได้ใส่ค่าใน `.env.local` ระบบจะพาไปหน้า Login พร้อมข้อความแนะนำให้ตั้งค่า
แทนการแสดงหน้าขัดข้อง

---

## สิทธิ์ของแต่ละ Role

| ความสามารถ | Admin | Technician |
| --- | :---: | :---: |
| ดู Dashboard | ✅ | ✅ |
| ดูรายการเครื่องจักร | ✅ | ✅ |
| เพิ่ม / แก้ไข / ลบเครื่องจักร | ✅ | ❌ |
| ดู Alarm | ✅ | ✅ |
| บันทึก / แก้ไข Alarm (รวมเปลี่ยนสถานะ) | ✅ | ✅ |
| ดูงานบำรุง | ✅ | ✅ |
| บันทึก / แก้ไขงานบำรุง | ✅ | ✅ |
| อนุมัติ / ยกเลิกสิทธิ์ / เปลี่ยน role | ✅ | ❌ |

การบังคับสิทธิ์ทำ **3 ชั้น**:

1. `supabase/migrations/001_init.sql` + `002_user_approval.sql` — RLS policy
   บังคับที่ระดับฐานข้อมูล (ชั้นที่สำคัญที่สุด)
2. `lib/data/auth.ts` — `requireApprovedUser()` / `requireAdmin()` ตรวจสอบก่อน query
3. `app/actions/*.ts` — ตรวจสอบสิทธิ์ซ้ำในทุก Server Action ก่อนเขียนข้อมูล

### สถานะการอนุมัติ

| สถานะ | เข้าใช้งานได้ | หมายเหตุ |
| --- | :---: | --- |
| `is_approved = true` | ✅ | ใช้งานตาม role ได้ปกติ |
| `is_approved = false` | ❌ | ถูกส่งไป `/pending` และ RLS บล็อกข้อมูลหลัก |
| `role = 'admin'` | ✅ | **ไม่ต้องรออนุมัติ** เพื่อกันไม่ให้ระบบล็อกตัวเองจนไม่มีใครปลดล็อกได้ |

> Admin แก้ไขสิทธิ์ของบัญชีตัวเองไม่ได้ และผู้ใช้อนุมัติตัวเองไม่ได้
> (บังคับทั้งที่ระดับ RLS และ trigger)

> `proxy.ts` มีไว้เพื่อต่ออายุ session และ redirect ผู้ที่ยังไม่ล็อกอินเท่านั้น
> **ไม่ใช่**กลไกความปลอดภัย — เส้นทางป้องกันจริงอยู่ที่ RLS และ Server Actions

---

## โครงสร้างโค้ด

```
app/
  (app)/                      # เฉพาะพื้นที่ที่ต้องล็อกอิน + ต้องได้รับอนุมัติ
    layout.tsx                # shell + nav + ตรวจ session และสถานะอนุมัติ
    dashboard/                # สรุปภาพรวม + กราฟ
    machines/                 # Machine Master (CRUD, Admin เท่านั้นที่แก้ได้)
    alarms/                   # Alarm Record (CRU)
    maintenance/              # Maintenance Record (CRU)
    users/                    # จัดการผู้ใช้ + อนุมัติสิทธิ์ (Admin เท่านั้น)
  actions/                    # Server Actions (ตรวจสิทธิ์ทุกครั้ง)
    auth.ts                   # login / logout / signUp
    users.ts                  # approve / revoke / change role
  login/                      # หน้าเข้าสู่ระบบ
  signup/                     # หน้าสมัครบัญชีช่าง (เปิดให้สาธารณะ)
  pending/                    # หน้า "รอการอนุมัติ" สำหรับผู้สมัครใหม่
  globals.css                 # สี สไตล์ และ dark palette (Tailwind v4)
components/
  theme-script.tsx            # ตั้งธีมก่อน paint ไม่ให้กะพริบสี
  theme-toggle.tsx            # ปุ่มสลับโหมดสว่าง/มืด
  app-nav.tsx                 # เมนูหลัก (แสดงเมนู "ผู้ใช้" เฉพาะ Admin)
  logout-button.tsx
  ui/                         # component ร่วม: Card, Badge, Form, SubmitButton, charts
lib/
  constants.ts                # ป้ายและสีภาษาไทยของแต่ละสถานะ
  data/                       # Data Access Layer (query ทั้งหมด)
    auth.ts                   # requireUser / requireApprovedUser / requireAdmin
    machines.ts
    alarms.ts
    maintenance.ts
    dashboard.ts
    users.ts                  # รายชื่อผู้ใช้ + จำนวนผู้รออนุมัติ
  env.ts                     # ค่า env ที่ปลอดภัยต่อฝั่ง browser
  format.ts                  # จัดรูปแบบวันที่/เงิน/ชื่อ
  supabase/                  # client.ts (browser), server.ts (cookie), admin.ts (service role)
  types/database.ts          # TypeScript types ของ schema
  utils/search.ts            # escapeLikePattern สำหรับค้นหาแบบ ILIKE
  validation.ts              # Zod schema ของทุกฟอร์ม
proxy.ts                      # ต่ออายุ session + optimistic redirect
scripts/verify-approval.mjs   # สคริปต์ทดสอบระบบอนุมัติผู้ใช้ผ่าน REST API
scripts/check-dark-contrast.mjs  # ตรวจคอนทราสต์ dark palette ตาม WCAG AA
supabase/migrations/001_init.sql
supabase/migrations/002_user_approval.sql
.github/workflows/ci.yml      # GitHub Actions: Install → Build → Lint → Test
```

### ระบบ Dark Mode

ไม่ได้เขียน `dark:` ในทุก component (ซึ่งจะเป็นราว 190 จุด) แต่ใช้วิธี override
ตัวแปรสีของ Tailwind ทั้งชุดในคลาส `.dark` ใน `app/globals.css` ทำให้คลาสที่เขียนไว้แล้ว
อย่าง `bg-slate-50`, `text-slate-900`, `border-slate-200` หรือแม้แต่ `bg-white` / `text-white`
เปลี่ยนความหมายอัตโนมัติตามธีม

หลักการคือ "สลับโทนสีนิวทรัล" — เลขต่ำกว่า = อ่อนกว่า เมื่อเป็นโหมดมืดจึงกลับด้านกัน

- พื้นผิวอ่อน → พื้นผิวเข้ม (`bg-slate-50` → slate-950, `bg-white` → slate-100)
- ตัวอักษรเข้ม → ตัวอักษรอ่อน (`text-slate-900` → slate-50)
- ปุ่มหลักกลับเป็นสีสว่าง (`bg-slate-900` → slate-50) แล้ว `text-white`
  ถูกสลับเป็นสีเข้มโดยอัตโนมัติ

ธีมถูกอ่านจาก `localStorage` (คีย์ `app-theme`) และค่าของระบบปฏิบัติการ
โดยสคริปต์ inline ที่รันก่อน browser วาดหน้า จึงไม่เห็นหน้าขาวแวบก่อนเปลี่ยนเป็นสีเข้ม

สีกราฟที่เดิมเขียนเป็นค่า hex ตรง ๆ ถูกเปลี่ยนเป็น `var(--color-*)` เพื่อให้เปลี่ยนตามธีมด้วย

---

## ความสามารถในการค้นหาและกรอง

ทุกหน้ารายการรองรับการค้นหาและกรอง 2 เงื่อนไขขึ้นไปผ่าน query string
(จึงแชร์ลิงก์และกดย้อนกลับได้ โดยไม่หลุดเงื่อนไขการกรอง)

| หน้า | เงื่อนไข |
| --- | --- |
| เครื่องจักร | ค้นหาชื่อ/รหัส, สถานะ, ประเภท, สถานที่ตั้ง |
| Alarm | ค้นหาข้อความ, สถานะ, เครื่องจักร, Alarm Code, ช่าง, ช่วงวันที่ |
| งานบำรุง | ค้นหาข้อความ, สถานะ, ระดับความสำคัญ, เครื่องจักร, ช่าง, ช่วงวันที่ |

---

## คำสั่งที่ใช้บ่อย

```bash
npm run dev              # เริ่ม dev server
npm run build            # build สำหรับ production
npm run start            # รัน production server
npm run lint             # ตรวจ lint
npx tsc --noEmit         # ตรวจ TypeScript
npm run check:contrast   # ตรวจคอนทราสต์ dark palette (WCAG AA)
npm run verify:approval  # ทดสอบระบบอนุมัติผู้ใช้ (ต้องรัน 002 แล้ว)
```

`npm run verify:approval` จะสร้างผู้สมัครและเครื่องจักรชั่วคราว แล้วตรวจว่า

1. ผู้สมัครใหม่ได้ `role=technician` และ `is_approved=false`
2. ก่อนอนุมัติ อ่านเครื่องจักรและเพิ่ม Alarm ไม่ได้
3. ผู้ใช้อนุมัติตัวเองไม่ได้
4. หลัง Admin อนุมัติ ใช้งานได้
5. หลังยกเลิกสิทธิ์ ถูกบล็อกอีกครั้ง

แล้วลบข้อมูลทดสอบทิ้งทั้งหมด

---

## หมายเหตุ

- `proxy.ts` คือชื่อใหม่ของ `middleware.ts` ใน Next.js 16 (ยังรองรับแนวทางเดิม)
- ไม่มีการ import `chart.js` — กราฟวาดด้วย SVG เพื่อลดขนาด bundle
- ไม่มี seed data — ต้องสร้างข้อมูลเครื่องจักรผ่านหน้าเว็บหลังล็อกอินในสิทธิ์ Admin
- `scripts/verify-approval.mjs` ใช้ `service_role` key จึงต้องรันบนเครื่องนักพัฒนาเท่านั้น
  ห้าม deploy สคริปต์นี้ขึ้น production

---

## การใช้ AI ในการพัฒนา

โปรเจกต์นี้พัฒนาโดยใช้ **AI coding assistant (OpenCode / Claude)** เป็นผู้ช่วยหลัก
โดยมนุษย์เป็นผู้วางแผน ตัดสินใจ และตรวจสอบผลลัพธ์ทุกขั้นตอน

| หัวข้อ | สรุป |
| --- | --- |
| **ช่วยออกแบบฐานข้อมูล** | migration 2 ไฟล์, 5 enum, 4 ตาราง, 14 index, RLS 22 policy, 7 ฟังก์ชัน, 2 view |
| **ช่วยระบบอนุมัติผู้ใช้** | flow สมัคร → รออนุมัติ → เข้าใช้งาน พร้อมหน้า `/pending` และ `/users` |
| **ช่วยชั้นความปลอดภัย** | บังคับสิทธิ์ 3 ชั้น: RLS → DAL → Server Action |
| **ช่วย CRUD** | เครื่องจักร, Alarm, งานบำรุง รวมฟอร์มและ validation ด้วย Zod |
| **ช่วยระบบค้นหา** | `findMachineIdsBySearch()` + `escapeLikePattern()` กัน SQL injection |
| **ช่วย Dark mode** | เลือกวิธี override ตัวแปรสี Tailwind แทนการเขียน `dark:` 190 จุด |
| **ช่วยสคริปต์ทดสอบ** | `verify-approval.mjs` (10/10), `check-dark-contrast.mjs` (36/36) |
| **ช่วยเอกสารและ CI** | README และ `.github/workflows/ci.yml` |

### บั๊กที่ AI ทำผิดและต้องตรวจเอง

AI ไม่ได้ถูกต้องเสมอไป ระหว่างพัฒนาพบ 5 จุดที่ต้องแก้เอง

1. **คอนทราสต์สีใน dark mode** — เดาค่า oklch ผิด และลืม override ชั้น `-800` ของ 3 สี
   ทำให้ป้ายสถานะมองไม่ออก (แก้โดยเขียนสคริปต์คำนวณ WCAG จริง)
2. **React hooks** — ใช้ `setState` ใน `useEffect` ซึ่ง ESLint ไม่อนุญาต
3. **`package-lock.json` ไม่ sync** — ทำให้ `npm ci` ล้มใน CI
4. **ความปลอดภัยของ secret** — ต้องสแกน staged content ก่อน commit ทุกครั้ง
5. **การอ่านเอกสาร Next.js 16** — มี breaking changes ต้องอ่าน `node_modules/next/dist/docs/`

> รายละเอียดทั้งหมด รวมถึงสิ่งที่ไม่ได้ให้ AI ทำ อ่านที่ **[`docs/AI.md`](docs/AI.md)**
