# ระบบจัดการการบำรุงเครื่องจักร (Machine Maintenance Management)

ระบบจัดการข้อมูลเครื่องจักร, Alarm และงานบำรุง พร้อมระบบล็อกอินและสิทธิ์ผู้ใช้
ผู้สมัครใหม่ต้องรอผู้ดูแลระบบอนุมัติก่อนจึงจะเข้าใช้งานได้
สร้างด้วย **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Supabase**

---

## 1. ติดตั้ง Dependencies

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

## 2. ตั้งค่า Environment Variables

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

## 3. สร้างตารางในฐานข้อมูล

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

## 3.1 เพิ่มระบบอนุมัติผู้ใช้

รันไฟล์ [`supabase/migrations/002_user_approval.sql`](supabase/migrations/002_user_approval.sql)
ต่อจากข้อ 3 (แยก query อีกครั้ง)

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

## 4. สร้างบัญชีผู้ดูแลระบบ (Admin) คนแรก

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

## 5. เริ่มระบบ

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
  globals.css                 # สีและสไตล์ทั้งระบบ (Tailwind v4)
components/
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
supabase/migrations/001_init.sql
supabase/migrations/002_user_approval.sql
```

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
