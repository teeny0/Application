"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: "▦", adminOnly: false },
  { href: "/machines", label: "เครื่องจักร", icon: "⚙", adminOnly: false },
  { href: "/alarms", label: "Alarm", icon: "⚠", adminOnly: false },
  { href: "/maintenance", label: "งานบำรุง", icon: "🛠", adminOnly: false },
  { href: "/users", label: "ผู้ใช้", icon: "👥", adminOnly: true },
] as const;

export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  // ซ่อนเมนูจัดการผู้ใช้จากช่าง แต่ยังตรวจสิทธิ์ซ้ำที่ฝั่ง server
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
