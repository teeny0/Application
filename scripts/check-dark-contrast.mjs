/**
 * ตรวจคอนทราสต์ของ dark palette โดยอ่านค่าจริงจาก app/globals.css
 *
 * ทำไมต้องมีสคริปต์นี้: ค่าสีใน .dark เขียนเป็น oklch() ซึ่งสายตามองไม่ออก
 * ว่าคู่ไหนอ่านไม่ออก การเดาสีด้วยตาจึงพลาดไปหลายรอบแล้ว
 * (เคยพลาดเพราะลืม override ชั้น 800 ของ red/emerald/blue ทำให้ตัวอักษร
 *  เข้มอยู่บนพื้นเข้มจนมองไม่เห็น) สคริปต์นี้แปลง oklch กลับเป็น sRGB
 *  แล้วคำนวณสัดส่วนคอนทราสต์ตามมาตรฐาน WCAG ให้แน่นอน
 *
 * วิธีใช้:  node scripts/check-dark-contrast.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------- แปลง oklch -> sRGB (0-255) ---------- */

function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // แปลง linear -> sRGB พร้อมจำกัดช่วง (gamut clamp)
  const encode = (v) => {
    const c = Math.min(1, Math.max(0, v));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  };

  return [encode(lr), encode(lg), encode(lb)].map((v) => Math.round(v * 255));
}

function hex([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/* ---------- อ่านค่าสีจาก globals.css ---------- */

const css = readFileSync(join(ROOT, "app", "globals.css"), "utf8");

const darkStart = css.indexOf("\n.dark {");
if (darkStart === -1) throw new Error("ไม่พบบล็อก .dark ใน app/globals.css");
const darkBlock = css.slice(darkStart, css.indexOf("\n}", darkStart));

const dark = {};
for (const m of darkBlock.matchAll(/--([\w-]+):\s*oklch\(([^)]+)\);/g)) {
  const [, name, raw] = m;
  const [L, C, H] = raw.split(/[\s%]+/).filter(Boolean).map(Number);
  dark[name] = hex(oklchToRgb(L / 100, C, H));
}
dark["app-bg"] = darkBlock.match(/--app-bg:\s*(#[0-9a-f]{6})/i)?.[1];
dark["app-fg"] = darkBlock.match(/--app-fg:\s*(#[0-9a-f]{6})/i)?.[1];

if (!dark["color-white"]) throw new Error("ไม่พบ --color-white ในบล็อก .dark");

/* ---------- คำนวณ WCAG contrast ---------- */

function luminance(h) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- คู่สีที่ใช้งานจริงในแอป (ได้จากการ audit คลาสในโค้ด) ---------- */

const TEXT = 4.5; // เกณฑ์ข้อความปกติ (WCAG AA)
const LARGE = 3; // เกณฑ์ข้อความใหญ่/ตัวหนาตั้งแต่ 18.66px
const UI = 3; // เกณฑ์องค์ประกอบ UI เช่นขอบช่องกรอก (WCAG 1.4.11)
const DECORATIVE = 0; // ของตกแต่ง มาตรฐานไม่บังคับ — รายงานเพื่อเทียบกับโหมดสว่างเท่านั้น

const CARD = dark["color-white"]; // bg-white -> พื้นผิวการ์ด
const PAGE = dark["app-bg"];
const BAR = dark["color-slate-100"];
const TABLE_HEAD = dark["color-slate-50"];

const PAIRS = [
  // ข้อความบนการ์ด/แถบ/หน้า
  ["color-slate-900", CARD, TEXT, "หัวข้อบนการ์ด"],
  ["color-slate-700", CARD, TEXT, "label บนการ์ด"],
  ["color-slate-600", CARD, TEXT, "เนื้อหาบนการ์ด"],
  ["color-slate-500", CARD, TEXT, "ข้อความรองบนการ์ด"],
  ["color-slate-400", CARD, TEXT, "ข้อความบอกเบา/ตัวอย่างบนการ์ด"],
  ["color-slate-500", BAR, TEXT, "ข้อความรองบนแถบ"],
  ["color-slate-900", PAGE, TEXT, "หัวข้อบนพื้นหน้า"],
  ["color-slate-600", PAGE, TEXT, "เนื้อหาบนพื้นหน้า"],
  ["color-slate-500", TABLE_HEAD, TEXT, "หัวตาราง"],
  ["color-slate-700", TABLE_HEAD, TEXT, "ตัวอักษรในตาราง"],

  // ปุ่ม: text-white ถูกสลับเป็นสีเข้ม บนพื้นที่กลับเป็นสว่าง
  ["color-white", "color-slate-900", TEXT, "ปุ่มหลัก"],
  ["color-white", "color-slate-700", TEXT, "ปุ่มหลักเมื่อ hover"],
  ["color-white", "color-red-600", TEXT, "ปุ่มอันตราย"],
  ["color-white", "color-red-700", TEXT, "ปุ่มอันตรายเมื่อ hover"],
  ["color-white", "color-emerald-600", TEXT, "ปุ่มอนุมัติ"],
  ["color-white", "color-emerald-700", TEXT, "ปุ่มอนุมัติเมื่อ hover"],

  // ป้ายสถานะ: รูปแบบ bg-*-100 + text-*-800
  ["color-slate-700", "color-slate-100", TEXT, "ป้ายสถานะสีเทา"],
  ["color-red-800", "color-red-100", TEXT, "ป้ายสถานะแดง (alarm/open/critical)"],
  ["color-amber-800", "color-amber-100", TEXT, "ป้ายสถานะเหลือง"],
  ["color-emerald-800", "color-emerald-100", TEXT, "ป้ายสถานะเขียว"],
  ["color-blue-800", "color-blue-100", TEXT, "ป้ายสถานะน้ำเงิน"],
  ["color-zinc-600", "color-zinc-100", TEXT, "ป้ายสถานะซิงก์ (cancelled)"],

  // กล่องข้อความแจ้งเตือน
  ["color-amber-900", "color-amber-50", TEXT, "ข้อความในกล่องเตือนสีเหลือง"],
  ["color-amber-900", "color-amber-100", TEXT, "ข้อความในกล่องโค้ดสีเหลือง"],
  ["color-amber-600", "color-amber-100", LARGE, "ไอคอนในกล่องเตือน"],
  ["color-red-600", "color-red-50", TEXT, "ข้อความ error ในกล่องแดง"],
  ["color-red-700", "color-red-50", TEXT, "ปุ่ม danger บนพื้นแดงอ่อน (hover)"],

  // องค์ประกอบ UI
  ["color-slate-300", CARD, UI, "ขอบช่องกรอกอินพุต"],
  ["color-red-200", PAGE, UI, "ขอบปุ่ม danger"],
  ["color-amber-200", "color-amber-50", UI, "ขอบกล่องเตือน"],
  ["color-slate-200", CARD, DECORATIVE, "เส้นแบ่งการ์ด (ตกแต่ง โหมดสว่างได้ 1.24)"],

  // แท่งกราฟ — สีถูกส่งผ่าน var() ใน style จึงต้องอ่านออกบนพื้นการ์ด/หน้า
  ["color-emerald-600", CARD, UI, "แท่งกราฟเครื่องกำลังทำงาน"],
  ["color-slate-500", CARD, UI, "แท่งกราฟเครื่องหยุด"],
  ["color-red-600", CARD, UI, "แท่งกราฟ alarm"],
  ["color-amber-600", CARD, UI, "แท่งกราฟงานบำรุง"],
  ["color-blue-600", CARD, UI, "แท่งกราฟงานกำลังทำ"],
  ["color-zinc-400", CARD, UI, "แท่งกราฟงานยกเลิก"],
  ["color-slate-900", CARD, UI, "แถบสรุป/เส้นเน้น"],
];

/* ---------- รายงาน ---------- */

console.log("คอนทราสต์ dark palette (ค่าอ่านจาก app/globals.css แล้วแปลง oklch -> sRGB)\n");

let failed = 0;
for (const [fg, bg, min, label] of PAIRS) {
  // คู่สีอาจเป็นทั้งชื่อ key ใน .dark หรือ hex ที่ resolve มาแล้ว
  const resolve = (k) => (k.startsWith("#") ? k : dark[k]);
  const fgHex = resolve(fg);
  const bgHex = resolve(bg);
  if (!fgHex || !bgHex) {
    console.log(`  ??    ขาดค่า ${!fgHex ? fg : bg}`);
    failed += 1;
    continue;
  }
  const ratio = contrast(fgHex, bgHex);
  const need =
    min === TEXT ? "AA ข้อความ (4.5)"
    : min === LARGE ? "AA ใหญ่ (3)"
    : min === UI ? "AA UI (3)"
    : "ตกแต่ง ไม่บังคับ";
  if (min === DECORATIVE) {
    console.log(`  INFO  ${ratio.toFixed(2).padStart(6)}  ${need.padEnd(16)} ${label}`);
    continue;
  }
  const ok = ratio >= min;
  if (!ok) failed += 1;
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${ratio.toFixed(2).padStart(6)}  ${need.padEnd(16)} ${label}`,
  );
}

console.log(
  failed === 0
    ? "\nผ่านทุกคู่"
    : `\nมี ${failed} คู่ที่ยังไม่ผ่าน — ปรับค่าใน .dark แล้วรันซ้ำ`,
);

process.exitCode = failed === 0 ? 0 : 1;
