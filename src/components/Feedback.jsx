export function Loader({ children }) {
  return (
    <div className="feedback" role="status">
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      {children}
    </div>
  );
}

export function ErrorMessage({ message, onRetry }) {
  return (
    <div className="alert alert-danger mb-0" role="alert">
      <p className="mb-3">{message}</p>
      <button className="btn btn-outline-danger btn-sm" onClick={onRetry}>
        Повторить запрос
      </button>
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="empty-state">
      <span className="empty-symbol" aria-hidden="true">
        ⌕
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
