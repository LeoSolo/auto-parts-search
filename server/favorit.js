export const TEST_KEY = '00000000-0000-0000-0000-000000000001';
export const API_URL = 'https://api.favorit-parts.ru/hs/hsprice/';

export function createPartsHandler({ key = TEST_KEY, fetchApi = fetch } = {}) {
  return async (req, res) => {
    const send = (status, data) => {
      if (res.destroyed) return;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return send(405, { error: 'Метод не поддерживается.' });
    }
    const query = new URL(req.url, 'http://localhost').searchParams;
    const number = query.get('number')?.trim();
    const brand = query.get('brand')?.trim();
    if (!number || number.length > 80 || (brand && brand.length > 120)) {
      return send(400, { error: 'Проверьте артикул и производителя.' });
    }
    const url = new URL(API_URL);
    url.searchParams.set('key', key);
    url.searchParams.set('number', number);
    if (brand) {
      url.searchParams.set('brand', brand);
      url.searchParams.set('analogues', 'on');
    }
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timeout = setTimeout(abort, 12000);
    res.on('close', abort);
    try {
      const response = await fetchApi(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (!response.ok) return send(502, { error: `Сервис поставщика вернул ошибку ${response.status}.` });
      if (response.status === 204) return send(200, { goods: [] });
      const data = await response.json();
      if (!data || typeof data !== 'object' || (!Array.isArray(data.goods) && typeof data.error !== 'string')) {
        return send(502, { error: 'Некорректный ответ сервиса поставщика.' });
      }
      send(200, data);
    } catch (error) {
      send(error.name === 'AbortError' ? 504 : 502, {
        error: error.name === 'AbortError' ? 'Сервис поставщика не ответил вовремя.' : 'Не удалось получить ответ от поставщика.',
      });
    } finally {
      clearTimeout(timeout);
      res.off('close', abort);
    }
  };
}
