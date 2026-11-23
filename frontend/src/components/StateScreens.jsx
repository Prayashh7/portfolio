/*
  The two screens shown when there is no content to show yet. The wording here is
  interface copy rather than portfolio copy, so it lives in the frontend.
*/

export function Loader({ label = "Loading" }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="state__pulse" aria-hidden="true" />
      <p className="mono">{label}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <p className="mono">Something went wrong</p>
      <p className="state__message">
        {error?.message || "The content could not be loaded."}
      </p>
      {onRetry && (
        <button type="button" className="button button--ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
