/** Admin lát 1 chỉ quản trị Đà Lạt (thanh bên ghi "Quản trị · Đà Lạt"). Mở thành phố mới thì thêm chọn thành phố. */
export const CITY_SLUG = 'da-lat';
export const MEDIA_BASE = (import.meta.env.VITE_MEDIA_BASE ?? 'http://localhost:9000/ranhduong-media').replace(/\/+$/, '');

/** Style MapLibre; mặc định positron của OpenFreeMap (ADR 0008). */
export const MAP_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/positron';
/** Web khách, cho link "Xem trên web" của địa điểm đang hiển thị. */
export const WEB_BASE = (import.meta.env.VITE_WEB_BASE ?? 'http://localhost:3100').replace(/\/+$/, '');
