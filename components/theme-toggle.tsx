"use client";

/**
 * ปุ่มสลับโหมดสว่าง/มืด
 *
 * จงใจไม่ใช้ React state เพื่อเลี่ยงปัญหาไฮเดรชันและกะพริบของไอคอน
 * — การเลือกไอคอนทำด้วย CSS (`dark:`) ซึ่งอ่านคลาส `dark` บน <html> ตรง ๆ
 *
 * คลาส `dark` ถูกตั้งค่าตั้งแต่ก่อน paint โดย components/theme-script.tsx
 * และถูกจำไว้ใน localStorage ให้เปิดครั้งถัดไปได้ธีมเดิม
 */
const STORAGE_KEY = "app-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const nextIsDark = !root.classList.contains("dark");

    root.classList.toggle("dark", nextIsDark);
    root.style.colorScheme = nextIsDark ? "dark" : "light";

    try {
      localStorage.setItem(STORAGE_KEY, nextIsDark ? "dark" : "light");
    } catch {
      /* โหมดมืดเป็นแค่ความสวยงาม — บันทึกไม่ได้ก็ไม่เป็นไร */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="สลับโหมดสว่าง/มืด"
      title="สลับโหมดสว่าง/มืด"
      className={`inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 ${className}`}
    >
      <SunIcon />
      <MoonIcon />
    </button>
  );
}

const ICON_PROPS = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "size-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** ตอนอยู่โหมดสว่าง แสดงดวงอาทิตย์ (กดเพื่อไปโหมดมืด) */
function SunIcon() {
  return (
    <svg {...ICON_PROPS} className="size-5 dark:hidden">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </svg>
  );
}

/** ตอนอยู่โหมดมืด แสดงพระจันทร์ (กดเพื่อไปโหมดสว่าง) */
function MoonIcon() {
  return (
    <svg {...ICON_PROPS} className="hidden size-5 dark:block">
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
    </svg>
  );
}
