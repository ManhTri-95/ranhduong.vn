/** Source/credit/license for every bundled destination photo; not place-card fallbacks. */
export const EDITORIAL_PHOTOS = {
  landscape: {
    file: 'city', alt: 'Mặt hồ và những đồi thông Đà Lạt trong làn sương sớm',
    credit: 'Tri Nguyen', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: 'Wikimedia Commons / Travel Coffee Book', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Da_Lat_aerial_view.png',
  },
  lake: {
    file: 'lake', alt: 'Rừng thông soi bóng trên mặt hồ Tuyền Lâm, Đà Lạt',
    credit: 'Diane Selwyn', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/Commons:Public_domain',
    source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tuyen_Lam_Lake_01.jpg',
  },
  coffee: {
    file: 'coffee', alt: 'Một phin cà phê Việt Nam bên tách trà ở Đà Lạt',
    credit: 'Frank Fox', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vietnamese_Coffee_in_Da_Lat.jpg',
  },
} as const;

export type EditorialPhoto = keyof typeof EDITORIAL_PHOTOS;
