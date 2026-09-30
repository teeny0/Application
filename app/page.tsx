import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/data/auth";

/** หน้าแรกส่งต่อไปยัง Dashboard (ถ้าล็อกอินแล้ว) หรือหน้า Login */
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
