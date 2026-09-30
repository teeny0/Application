import type { ReactNode } from "react";

/**
 * แถบสถานะแบบเรียงซ้อน (stacked bar) พร้อมคำอธิบายกำกับ
 * ใช้แสดงสัดส่วนเครื่องจักรแต่ละสถานะ และสถานะ Alarm
 */
export function StackedStatusBar({
  segments,
  total,
}: {
  segments: { key: string; label: string; value: number; color: string }[];
  total: number;
}) {
  const safeTotal = total > 0 ? total : 0;

  return (
    <div>
      {/* แถบ */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={
          safeTotal > 0
            ? segments.map((s) => `${s.label} ${s.value} รายการ`).join(", ")
            : "ยังไม่มีข้อมูล"
        }
      >
        {safeTotal === 0 ? null : (
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.key}
                style={{
                  width: `${(s.value / safeTotal) * 100}%`,
                  backgroundColor: s.color,
                }}
              />
            ))
        )}
      </div>

      {/* คำอธิบาย */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {segments.map((s) => (
          <div key={s.key} className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-1 size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <div className="min-w-0">
              <dt className="truncate text-xs text-slate-500">{s.label}</dt>
              <dd className="text-sm font-semibold text-slate-900">
                {s.value}
                {safeTotal > 0 ? (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    {Math.round((s.value / safeTotal) * 100)}%
                  </span>
                ) : null}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** แถบข้อมูลแนวนอน ใช้เปรียบเทียบจำนวน Alarm รายเครื่องจักร */
export function HorizontalBarChart({
  items,
  emptyMessage = "ยังไม่มีข้อมูล",
}: {
  items: { label: string; sublabel?: string; value: number; color: string }[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{emptyMessage}</p>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium text-slate-700">
              {item.label}
              {item.sublabel ? (
                <span className="ml-1.5 font-normal text-slate-400">
                  {item.sublabel}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 font-semibold text-slate-900">
              {item.value}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** กราฟแท่งแนวตั้ง ใช้แสดงจำนวน Alarm รายวัน */
export function TrendChart({
  points,
  color = "var(--color-red-600)",
}: {
  points: { date: string; value: number }[];
  color?: string;
}) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีข้อมูล</p>;
  }

  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {points.map((p) => {
          const heightPercent = (p.value / max) * 100;
          return (
            <div
              key={p.date}
              className="group flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[10px] font-semibold text-slate-600">
                {p.value}
              </span>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max(heightPercent, p.value > 0 ? 4 : 1)}%`,
                  backgroundColor: color,
                  opacity: p.value === 0 ? 0.18 : 1,
                }}
                title={`${p.date}: ${p.value} รายการ`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {points.map((p) => (
          <div
            key={p.date}
            className="flex-1 truncate text-center text-[10px] text-slate-400"
          >
            {formatShortDate(p.date)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** แปลง "2026-01-31" เป็น "31 ม.ค." */
function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;

  const day = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const thaiMonths = [
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
  ];

  return `${day} ${thaiMonths[month - 1]}`;
}

/** กล่องตัวเลขสรุปบน Dashboard */
export function StatCard({
  label,
  value,
  hint,
  accent,
  action,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {accent ? (
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
        ) : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
