import { freshCityWeather, type CityWeather } from '@ranhduong/contracts';

export function cityWeatherDisplay(weather: CityWeather | null | undefined, nowMs: number, failed = false) {
  if (failed || !weather || !freshCityWeather(weather, nowMs)) return null;
  const labels = { fog: 'Có sương', sun: weather.isDay ? 'Nắng đẹp' : 'Trời trong', cloud: 'Nhiều mây', rain: weather.rainSoon ? 'Sắp có mưa' : 'Mưa' };
  const hints = {
    fog: 'Sương giăng, ghé quán làm ly nóng cho ấm.',
    sun: weather.isDay ? 'Trời trong, hợp ngồi cà phê nhìn đồi.' : 'Trời trong, ghé quán làm ly nóng rồi thong thả về nhé.',
    cloud: 'Trời mát, đi dạo quanh hồ là vừa.',
    rain: weather.rainSoon ? 'Ba giờ tới có thể mưa, chọn chỗ có mái che nhé.' : 'Trời có mưa, ghé quán có mái che cho ấm.',
  };
  return { title: `${labels[weather.state]} · ${Math.round(weather.temperatureC)}°C`, hint: hints[weather.state], rainMode: weather.state === 'rain' };
}
