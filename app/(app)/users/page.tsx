import { Badge, Card, CardHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/data/auth";
import { countPendingUsers, getUsers } from "@/lib/data/users";
import { formatDateTime } from "@/lib/format";

import { ApprovalToggle, RoleToggle } from "./user-actions";

export const metadata = {
  title: "ผู้ใช้",
};

export default async function UsersPage() {
  // ตรวจสิทธิ์ซ้ำที่ฝั่ง server — เมนูถูกซ่อนไว้แล้วแต่ไม่ควรพึ่งเพียง UI
  const admin = await requireAdmin();

  const [users, pendingCount] = await Promise.all([
    getUsers(),
    countPendingUsers(),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="จัดการผู้ใช้"
          description="อนุมัติผู้สมัครใหม่ก่อนเข้าใช้งานระบบ และกำหนดระดับสิทธิ์"
        />

        {pendingCount > 0 ? (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
            มีผู้ที่ยังรอการอนุมัติ{" "}
            <strong className="font-semibold">{pendingCount}</strong> คน
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-5 py-3 font-medium">อีเมล</th>
                <th className="px-5 py-3 font-medium">ระดับสิทธิ์</th>
                <th className="px-5 py-3 font-medium">สถานะ</th>
                <th className="px-5 py-3 font-medium">วันที่สมัคร</th>
                <th className="px-5 py-3 font-medium">จัดการสิทธิ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const isSelf = user.id === admin.id;

                return (
                  <tr key={user.id} className="align-middle">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {user.fullName ?? "-"}
                      {isSelf ? (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (คุณ)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{user.email}</td>
                    <td className="px-5 py-3">
                      <RoleToggle user={user} isSelf={isSelf} />
                    </td>
                    <td className="px-5 py-3">
                      {user.role === "admin" ? (
                        <Badge className="bg-slate-900 text-white ring-slate-900/20">
                          ผู้ดูแลระบบ
                        </Badge>
                      ) : user.isApproved ? (
                        <Badge className="bg-emerald-50 text-emerald-800 ring-emerald-600/20">
                          อนุมัติแล้ว
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 ring-amber-600/20">
                          รออนุมัติ
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {formatDateTime(user.createdAt)}
                      {user.approvedAt ? (
                        <span className="mt-0.5 block text-slate-400">
                          อนุมัติเมื่อ {formatDateTime(user.approvedAt)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <ApprovalToggle user={user} isSelf={isSelf} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="วิธีใช้งาน" />
        <ul className="space-y-2 px-5 py-4 text-sm leading-relaxed text-slate-600">
          <li>
            <strong className="text-slate-900">รออนุมัติ</strong> — ผู้สมัครใหม่
            เข้าสู่ระบบได้แต่จะถูกส่งไปหน้า &ldquo;รอการอนุมัติ&rdquo;
            และอ่าน/เขียนข้อมูลไม่ได้
          </li>
          <li>
            <strong className="text-slate-900">อนุมัติแล้ว</strong> — ใช้งานได้
            ตามระดับสิทธิ์ และจะปรากฏใน dropdown เลือกช่างผู้รับผิดชอบ
          </li>
          <li>
            <strong className="text-slate-900">ผู้ดูแลระบบ</strong> — เข้าใช้งานได้ทันที
            ไม่ต้องรออนุมัติ
          </li>
          <li>
            <strong className="text-slate-900">ยกเลิกสิทธิ์</strong> — ผู้นั้นจะถูกบล็อก
            ทันทีจนกว่าจะได้รับอนุมัติอีกครั้ง (ต้องกดยืนยัน)
          </li>
          <li>ไม่สามารถแก้ไขสิทธิ์ของบัญชีที่กำลังใช้งานอยู่ได้</li>
        </ul>
      </Card>
    </div>
  );
}
