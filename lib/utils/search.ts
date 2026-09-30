/**
 * escape อักขระพิเศษของ LIKE/ILIKE (`%` และ `_`) เพื่อให้ผู้ใช้ค้นหา
 * คำตรง ๆ ได้โดยไม่ถูกตีความเป็น wildcard
 *
 * ต้อง escape แบบนี้ก่อนเสมอ แม้ผู้ใช้จะพิมพ์เพียงข้อความธรรมดา
 * เพราะอักขระเหล่านี้อาจมาจากการ paste ข้อมูลจริงเข้ามา
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[%_]/g, (m) => `\\${m}`);
}
