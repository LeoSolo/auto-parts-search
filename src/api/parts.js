export const normalizeArticle = (value) => value.trim().toUpperCase();
export const isTestApi = import.meta.env?.VITE_TEST_API === 'true';

export function validateBrands(data) {
  if (
    !Array.isArray(data) ||
    data.some(
      (brand) => !brand || typeof brand.name !== "string" || !brand.name.trim(),
    )
  ) {
    throw new Error("API вернул некорректный список производителей.");
  }
  return [
    ...new Map(
      data.map(({ name }) => [name.trim(), { name: name.trim() }]),
    ).values(),
  ];
}

export function validateOffers(data) {
  if (
    !Array.isArray(data) ||
    data.some(
      (item) =>
        !item ||
        !["name", "brand", "article"].every(
          (key) => typeof item[key] === "string" && item[key].trim(),
        ) ||
        (!(item.price === null && item.stock === 0) &&
          (typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 0)) ||
        !Number.isInteger(item.stock) ||
        item.stock < 0,
    )
  ) {
    throw new Error(
      "API вернул некорректные предложения. Проверьте формат цены и остатка.",
    );
  }
  return data.map((item, index) => ({
    ...item,
    id: `${index}-${item.article}-${item.brand}`,
  }));
}

export function providerError(message) {
  const errors = {
    'Empty key!': 'Не указан ключ покупателя.',
    'Invalid key client!': 'Неверный ключ покупателя. Проверьте FAVORIT_API_KEY на сервере.',
    'Empty number goods!': 'Не указан артикул детали.',
    'Request quota exceeded!': 'Превышен лимит запросов поставщика. Повторите позже.',
  };
  return Object.entries(errors).reduce((text, [source, translation]) => text.replaceAll(source, translation), message);
}

function goodsFromResponse(data) {
  if (typeof data?.error === 'string') throw new Error(providerError(data.error));
  if (!Array.isArray(data?.goods) || data.goods.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('API вернул некорректный список деталей.');
  }
  return data.goods.filter((item) => item.brand || item.number || item.name);
}

export function brandsFromResponse(data) {
  return validateBrands(goodsFromResponse(data).map((item) => ({ name: item.brand })));
}

export function offersFromResponse(data) {
  const result = [];
  const seen = new Set();
  const pending = [...goodsFromResponse(data)];
  while (pending.length) {
    const item = pending.shift();
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('API вернул некорректный аналог.');
    if (typeof item.brand !== 'string' || !item.brand.trim() || typeof item.number !== 'string' || !item.number.trim()) {
      throw new Error('API вернул деталь без артикула или производителя.');
    }
    const identity = `${item.goodsID || ''}|${item.brand}|${item.number}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    if (item.analogues !== undefined) {
      if (!Array.isArray(item.analogues)) throw new Error('API вернул некорректный список аналогов.');
      pending.push(...item.analogues);
    }
    if (!Array.isArray(item.warehouses)) throw new Error('API вернул некорректный список складов.');
    const product = { name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : item.number, brand: item.brand, article: item.number };
    if (!item.warehouses.length) {
      if (item.count > 0) throw new Error('API не предоставил складские предложения для доступной детали.');
      result.push({ ...product, price: null, stock: 0 });
    }
    item.warehouses.forEach((warehouse, index) => {
      if (!warehouse || typeof warehouse !== 'object') throw new Error('API вернул некорректный склад.');
      result.push({
        ...product,
        price: warehouse.price,
        stock: warehouse.stock,
        warehouse: (typeof warehouse.code === 'string' && warehouse.code) || (typeof warehouse.id === 'string' && warehouse.id) || `Склад ${index + 1}`,
      });
    });
  }
  return validateOffers(result);
}

async function request(params, signal) {
  const url = new URL('/api/parts', window.location.origin);
  url.search = new URLSearchParams(params).toString();
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (response.status === 204) return { goods: [] };
    const data = await response.json();
    if (typeof data?.error === 'string') throw new Error(providerError(data.error));
    if (!response.ok)
      throw new Error(
        `Сервис вернул ошибку ${response.status}. Попробуйте ещё раз.`,
      );
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error.name === "AbortError")
      throw new Error("Сервис не ответил за 15 секунд. Повторите запрос.");
    if (error instanceof TypeError)
      throw new Error(
        "Не удалось связаться с сервером. Проверьте подключение и настройки API.",
      );
    if (error instanceof SyntaxError)
      throw new Error("Сервис вернул ответ в неверном формате.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export async function getBrands(article, signal) {
  return brandsFromResponse(await request({ number: article }, signal));
}

export async function getOffers({ article, brand }, signal) {
  return offersFromResponse(await request({ number: article, brand, analogues: 'on' }, signal));
}
