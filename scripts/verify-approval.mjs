/**
 * ตรวจระบบอนุมัติผู้ใช้ (Approval Workflow) ผ่าน Supabase REST API
 *
 * ใช้สคริปต์นี้หลังรัน supabase/migrations/002_user_approval.sql แล้วเท่านั้น
 *
 *   node scripts/verify-approval.mjs
 *
 * ต้องมี .env.local ที่มี NEXT_PUBLIC_SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY
 * (service_role ใช้เฉพาะตอนทดสอบ ไม่ถูกส่งไปยังแอป)
 *
 * ผลลัพธ์สุดท้ายจะตอบ 6/6 = ผ่าน และลบข้อมูลทดสอบออกให้เรียบร้อย
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
//  โหลด .env.local
// ---------------------------------------------------------------------------

function loadEnv() {
  // ห้ามตั้งชื่อตัวแปรว่า URL เพราะจะบัง global URL constructor
  let envPath;

  try {
    envPath = new URL("../.env.local", import.meta.url);
  } catch {
    return; // ไม่มีไฟล์ .env.local — ใช้ค่าจาก environment ปัจจุบันแทน
  }

  const raw = readFileSync(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!match) continue;
    const value = match[2].replace(/^["'](.*)["']$/, "$1");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("ไม่พบค่า NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const stamp = Date.now();
const EMAIL = `approval-test-${stamp}@example.com`;
const PASSWORD = `Test-${stamp}-Aa1!`;
const MACHINE_CODE = `T${String(stamp).slice(-6)}`;

// ---------------------------------------------------------------------------
//  ตัวช่วย
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function check(name, ok, detail = "") {
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** สร้าง client ในมุมของผู้ใช้ที่ล็อกอินแล้ว (ใช้ anon key) */
function clientAs(accessToken) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const createdUserIds = [];

async function cleanup() {
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id);
  }
}

console.log("\n=== ตรวจระบบอนุมัติผู้ใช้ ===\n");

// ---------------------------------------------------------------------------
//  0. เตรียมข้อมูล: เครื่องจักร 1 เครื่อง (ทำเป็น Admin)
// ---------------------------------------------------------------------------

const { data: machine, error: machineError } = await admin
  .from("machines")
  .insert({
    machine_code: MACHINE_CODE,
    machine_name: "ทดสอบระบบอนุมัติ",
    machine_type: "ทดสอบ",
    location: "ทดสอบ",
  })
  .select("id")
  .single();

if (machineError) {
  console.error("เตรียมข้อมูลไม่สำเร็จ:", machineError.message);
  process.exit(1);
}
console.log(`  ..  เตรียมเครื่องจักร ${MACHINE_CODE} เรียบร้อย`);

// ---------------------------------------------------------------------------
//  1. สมัครบัญชีใหม่ (email_confirm = true เพื่อข้ามขั้นตอนยืนยันอีเมล)
// ---------------------------------------------------------------------------

const { data: created, error: createError } =
  await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "ผู้ทดสอบ รออนุมัติ" },
  });

if (createError) {
  console.error("สร้างผู้ใช้ทดสอบไม่สำเร็จ:", createError.message);
  await admin.from("machines").delete().eq("id", machine.id);
  process.exit(1);
}
createdUserIds.push(created.user.id);
console.log(`  ..  สร้างผู้สมัคร ${EMAIL}`);

// ---------------------------------------------------------------------------
//  2. trigger ต้องสร้าง profile เป็น technician + is_approved = false
// ---------------------------------------------------------------------------

const {
  data: freshProfile,
  error: profileError,
} = await admin
  .from("profiles")
  .select("role, is_approved")
  .eq("id", created.user.id)
  .single();

// คอลัมน์ยังไม่มี = ยังไม่ได้รัน migration
if (profileError) {
  console.error(
    "\nอ่าน profiles ไม่สำเร็จ:", profileError.message,
    "\n\nถ้าขึ้นว่าไม่มีคอลัมน์ is_approved แสดงว่ายังไม่ได้รัน migration",
    "\nให้รัน supabase/migrations/002_user_approval.sql ใน Supabase SQL Editor ก่อน\n",
  );
  await cleanup();
  await admin.from("machines").delete().eq("id", machine.id);
  process.exit(1);
}

check(
  "ผู้สมัครใหม่ได้ role=technician และ is_approved=false",
  freshProfile?.role === "technician" && freshProfile?.is_approved === false,
  `ได้ role=${freshProfile?.role} is_approved=${freshProfile?.is_approved}`,
);

// ---------------------------------------------------------------------------
//  3. ล็อกอินเป็นผู้สมัคร
// ---------------------------------------------------------------------------

const { data: session, error: signInError } =
  await clientAs(ANON_KEY).auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

if (signInError) {
  console.error("ล็อกอินผู้สมัครไม่สำเร็จ:", signInError.message);
  await cleanup();
  await admin.from("machines").delete().eq("id", machine.id);
  process.exit(1);
}

const tech = await clientAs(session.session.access_token);

// ---------------------------------------------------------------------------
//  4. ก่อนอนุมัติ: อ่านเครื่องจักรไม่ได้ และเพิ่ม Alarm ไม่ได้
// ---------------------------------------------------------------------------

const { data: visibleMachines, error: readError } = await tech
  .from("machines")
  .select("id");

check(
  "ผู้ยังไม่อนุมัติ อ่านข้อมูลเครื่องจักรไม่ได้",
  (readError !== null || (visibleMachines ?? []).length === 0),
  readError ? `error: ${readError.message}` : `เห็น ${visibleMachines.length} แถว`,
);

const { error: blockedAlarm } = await tech.from("alarms").insert({
  machine_id: machine.id,
  alarm_code: "T-ALM-1",
  alarm_description: "ทดสอบก่อนอนุมัติ",
  status: "open",
});

check(
  "ผู้ยังไม่อนุมัติ เพิ่ม Alarm ไม่ได้",
  blockedAlarm !== null,
  blockedAlarm ? "ควรถูกบล็อกแต่กลับสำเร็จ" : "RLS ไม่ได้บล็อก",
);

// ---------------------------------------------------------------------------
//  5. ป้องกัน self-approval
// ---------------------------------------------------------------------------

const { error: selfApproveError } = await tech
  .from("profiles")
  .update({ is_approved: true })
  .eq("id", created.user.id);

check(
  "ผู้ใช้อนุมัติตัวเองไม่ได้",
  selfApproveError !== null,
  selfApproveError ? "" : "อัปเดตสำเร็จ — ไม่ควรเกิด",
);

const { data: afterSelfAttempt } = await admin
  .from("profiles")
  .select("is_approved")
  .eq("id", created.user.id)
  .single();

check(
  "สถานะยังเป็นรออนุมัติหลังพยายามอนุมัติเอง",
  afterSelfAttempt?.is_approved === false,
);

// ---------------------------------------------------------------------------
//  6. Admin อนุมัติ -> เข้าใช้งานได้
// ---------------------------------------------------------------------------

const { error: approveError } = await admin
  .from("profiles")
  .update({ is_approved: true, approved_at: new Date().toISOString() })
  .eq("id", created.user.id);

check("Admin อนุมัติได้", approveError === null, approveError?.message);

const { data: afterApprove, error: afterApproveError } = await tech
  .from("machines")
  .select("id");

check(
  "หลังอนุมัติ อ่านข้อมูลเครื่องจักรได้",
  afterApproveError === null && (afterApprove ?? []).length > 0,
);

const { data: newAlarm, error: allowedAlarm } = await tech
  .from("alarms")
  .insert({
    machine_id: machine.id,
    alarm_code: "T-ALM-2",
    alarm_description: "ทดสอบหลังอนุมัติ",
    status: "open",
  })
  .select("id")
  .single();

check(
  "หลังอนุมัติ เพิ่ม Alarm ได้",
  allowedAlarm === null && Boolean(newAlarm?.id),
  allowedAlarm?.message,
);

if (newAlarm?.id) {
  await admin.from("alarms").delete().eq("id", newAlarm.id);
}

// ---------------------------------------------------------------------------
//  7. ยกเลิกสิทธิ์ -> บล็อกอีกครั้ง
// ---------------------------------------------------------------------------

const { error: revokeError } = await admin
  .from("profiles")
  .update({ is_approved: false })
  .eq("id", created.user.id);

check("Admin ยกเลิกสิทธิ์ได้", revokeError === null, revokeError?.message);

const { data: afterRevoke, error: afterRevokeError } = await tech
  .from("machines")
  .select("id");

check(
  "หลังยกเลิกสิทธิ์ อ่านข้อมูลเครื่องจักรไม่ได้อีก",
  afterRevokeError !== null || (afterRevoke ?? []).length === 0,
);

// ---------------------------------------------------------------------------
//  สรุป
// ---------------------------------------------------------------------------

await cleanup();
await admin.from("machines").delete().eq("id", machine.id);

console.log(`\n=== ผลลัพธ์: ${passed} ผ่าน / ${failed} ไม่ผ่าน ===`);
console.log("ลบข้อมูลทดสอบเรียบร้อย\n");

process.exit(failed === 0 ? 0 : 1);
