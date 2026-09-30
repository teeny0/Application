const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

/** แปลง ISO string เป็น "31 ม.ค. 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${date.getFullYear() + 543}`;
}

/** แปลง ISO string เป็น "31 ม.ค. 2026 14:30" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${formatDate(iso)} ${hours}:${minutes}`;
}

/**
 * แปลง ISO string เป็นค่าที่ใช้กับ <input type="datetime-local">
 * ซึ่งต้องเป็นรูปแบบ YYYY-MM-DDTHH:mm ในเวลาท้องถิ่น
 */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** ค่าเริ่มต้นของฟิลด์ datetime-local เมื่อสร้างรายการใหม่ (เวลาปัจจุบัน) */
export function nowForDateTimeLocal(): string {
  return toDateTimeLocalValue(new Date().toISOString());
}

/** จัดรูปแบบจำนวนเงินบาท */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(value);
}

/** ชื่อที่แสดงผลของผู้ใช้ (ถ้ามีชื่อใช้ชื่อนั้น ไม่งั้นใช้อีเมล) */
export function displayName(
  person: { full_name: string | null; email: string } | null,
): string {
  if (!person) return "-";
  return person.full_name ?? person.email;
}
