import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBrands,
  fetchOffers,
  selectBrand,
  setArticle,
} from "./store/searchSlice.js";
import { isTestApi, normalizeArticle } from "./api/parts.js";
import { EmptyState, ErrorMessage, Loader } from "./components/Feedback.jsx";

const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 2,
});

export default function App() {
  const dispatch = useDispatch();
  const { article, brand, brands, offers } = useSelector(
    (state) => state.search,
  );
  const brandRequest = useRef(null);
  const offerRequest = useRef(null);
  const query = normalizeArticle(article);

  function loadBrands() {
    brandRequest.current?.abort();
    brandRequest.current = dispatch(fetchBrands(query));
  }

  useEffect(() => {
    if (query.length < 2) return;
    const timer = setTimeout(() => {
      brandRequest.current = dispatch(fetchBrands(query));
    }, 400);
    return () => {
      clearTimeout(timer);
      brandRequest.current?.abort();
    };
  }, [article, query, dispatch]);

  useEffect(
    () => () => {
      offerRequest.current?.abort();
    },
    [],
  );

  function changeArticle(value) {
    if (value === article) return;
    brandRequest.current?.abort();
    offerRequest.current?.abort();
    dispatch(setArticle(value));
  }

  function loadOffers(name) {
    offerRequest.current?.abort();
    dispatch(selectBrand(name));
    offerRequest.current = dispatch(
      fetchOffers({ article: query, brand: name }),
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="container page-container d-flex justify-content-between align-items-center">
          <a className="wordmark" href="/" aria-label="Деталь — главная">
            <span className="brand-mark" aria-hidden="true">
              д.
            </span>
            деталь<span className="brand-dot">.</span>
          </a>
          <span className="topbar-caption">ПОИСК АВТОЗАПЧАСТЕЙ</span>
          <span className="mode-badge">
            <span />
            {isTestApi ? "Тестовый API" : "Favorit Parts"}
          </span>
        </div>
      </header>
      <main className="container page-container">
        <section className="intro">
          <div className="eyebrow">КАТАЛОГ / ПОИСК ПО АРТИКУЛУ</div>
          <h1>
            Нужная деталь.
            <br />
            <span>Без лишнего поиска.</span>
          </h1>
          <p>
            Введите артикул, выберите производителя
            <br className="d-none d-md-block" /> и сравните доступные
            предложения и аналоги.
          </p>
        </section>
        {isTestApi && (
          <aside className="api-note">
            <strong>Тестовый доступ Favorit Parts</strong>
            <span>Данные получены из API. Для персональных условий задайте ключ покупателя на сервере.</span>
          </aside>
        )}
        <div className="workspace">
          <section
            className="panel search-panel"
            aria-labelledby="search-title"
          >
            <div className="section-heading">
              <span className="step">01</span>
              <div>
                <h2 id="search-title">Найдите производителя</h2>
                <p>Начните с номера детали</p>
              </div>
            </div>
            <label htmlFor="article" className="form-label">
              Артикул запчасти
            </label>
            <div className="input-wrap">
              <span aria-hidden="true">⌕</span>
              <input
                id="article"
                className="form-control"
                placeholder="Например, 0189"
                value={article}
                onChange={(event) => changeArticle(event.target.value)}
                maxLength={80}
                autoComplete="off"
                spellCheck="false"
                aria-describedby="article-help"
              />
              {article && (
                <button
                  type="button"
                  className="clear-input"
                  onClick={() => changeArticle("")}
                  aria-label="Очистить артикул"
                >
                  ×
                </button>
              )}
            </div>
            <p id="article-help" className="input-help">
              Поиск автоматически, от 2 символов
            </p>
            <div className="example-row">
              <span>Попробуйте:</span>
              <button onClick={() => changeArticle("0189")}>
                0189 ↗
              </button>
            </div>
            <div
              className="brands-area"
              aria-live="polite"
              aria-busy={brands.status === "loading"}
            >
              {brands.status === "idle" && (
                <p className="muted-hint">
                  Здесь появятся производители, у которых есть введённый
                  артикул.
                </p>
              )}
              {brands.status === "loading" && (
                <Loader>Ищем производителей…</Loader>
              )}
              {brands.status === "failed" && (
                <ErrorMessage message={brands.error} onRetry={loadBrands} />
              )}
              {brands.status === "succeeded" &&
                (brands.items.length ? (
                  <>
                    <div className="list-label">
                      ВЫБЕРИТЕ БРЕНД <span>{brands.items.length}</span>
                    </div>
                    <div className="brand-list">
                      {brands.items.map(({ name }) => (
                        <button
                          key={name}
                          className={`brand-option ${brand === name ? "selected" : ""}`}
                          onClick={() => loadOffers(name)}
                          aria-pressed={brand === name}
                        >
                          <span className="brand-monogram" aria-hidden="true">
                            {name.slice(0, 1)}
                          </span>
                          <strong>{name}</strong>
                          <span className="brand-arrow" aria-hidden="true">
                            {brand === name ? "✓" : "↗"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState title="Производители не найдены">
                    Проверьте артикул или попробуйте другой номер.
                  </EmptyState>
                ))}
            </div>
          </section>
          <section
            className="panel offers-panel"
            aria-labelledby="offers-title"
          >
            <div className="section-heading">
              <span className={`step ${brand ? "" : "inactive"}`}>02</span>
              <div>
                <h2 id="offers-title">Предложения и аналоги</h2>
                <p>
                  {brand
                    ? `${query} / ${brand}`
                    : "Выберите бренд, чтобы увидеть наличие и цены"}
                </p>
              </div>
            </div>
            <div aria-live="polite" aria-busy={offers.status === "loading"}>
              {offers.status === "idle" && (
                <EmptyState title="Всё начинается с артикула">
                  После выбора производителя здесь появятся оригинальная деталь
                  и доступные аналоги.
                </EmptyState>
              )}
              {offers.status === "loading" && (
                <Loader>Проверяем предложения и остатки…</Loader>
              )}
              {offers.status === "failed" && (
                <ErrorMessage
                  message={offers.error}
                  onRetry={() => loadOffers(brand)}
                />
              )}
              {offers.status === "succeeded" &&
                (offers.items.length ? (
                  <>
                    <div className="results-summary">
                      <span>
                        Найдено предложений:{" "}
                        <strong>{offers.items.length}</strong>
                      </span>
                      <span>Цены в рублях</span>
                    </div>
                    <div className="table-responsive">
                      <table className="table offers-table">
                        <caption className="visually-hidden">
                          Предложения и аналоги для {query}, {brand}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Деталь / Производитель</th>
                            <th scope="col" className="text-end">
                              Цена
                            </th>
                            <th scope="col" className="text-end">
                              На складе
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {offers.items.map((offer) => (
                            <tr key={offer.id}>
                              <td>
                                <div className="offer-brand">{offer.brand}</div>
                                <div className="offer-name">{offer.name}</div>
                                <span className="offer-article">
                                  {offer.article}
                                </span>
                                {offer.warehouse && <div className="offer-article">Склад: {offer.warehouse}</div>}
                              </td>
                              <td className="text-end offer-price">
                                {offer.price === null ? '—' : money.format(offer.price)}
                              </td>
                              <td className="text-end">
                                <span
                                  className={`stock ${offer.stock === 0 ? "stock-zero" : ""}`}
                                >
                                  {offer.stock > 0
                                    ? `${offer.stock} шт.`
                                    : "Нет в наличии"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="results-footnote">
                      Остатки указаны на момент ответа сервиса.
                    </p>
                  </>
                ) : (
                  <EmptyState title="Пока нет предложений">
                    Для этого производителя ничего не найдено. Выберите другой
                    бренд или измените артикул.
                  </EmptyState>
                ))}
            </div>
          </section>
        </div>
        <footer>
          <span>
            деталь.{" "}
            <span className="footer-sub">Каждая деталь на своём месте.</span>
          </span>
          <span>АРТИКУЛ → БРЕНД → ПРЕДЛОЖЕНИЯ</span>
        </footer>
      </main>
    </>
  );
}
