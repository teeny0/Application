/**
 * ใส่คลาส `dark` บน <html> ก่อนที่เบราว์เซอร์วาดหน้าจอครั้งแรก
 *
 * ถ้าไม่มีสคริปต์นี้ ผู้ใช้ที่เลือกโหมดมืดจะเห็นหน้าขาวแวบก่อน
 * แล้วค่อยกระพริบเป็นสีเข้ม
 *
 * ต้องเป็น inline script ที่บล็อกการ render — ห้ามย้ายไปโหลดแบบ async
 */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var stored = localStorage.getItem("app-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var dark = stored === "dark" || (stored !== "light" && prefersDark);
    var root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  } catch (error) {
    /* โหมดมืดเป็นแค่ความสวยงาม — ถ้า localStorage ใช้ไม่ได้ก็ปล่อยเป็นโหมดสว่าง */
  }
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
