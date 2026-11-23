import { useState } from "react";

/*
  Deleting asks twice. The second press is the one that acts, and any error the
  server returns is shown next to the button that caused it.
*/
export default function ConfirmDelete({ label, onConfirm }) {
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState({ status: "idle", message: null });

  if (!armed) {
    return (
      <button
        type="button"
        className="ghost-button ghost-button--risk"
        onClick={() => setArmed(true)}
      >
        Delete
      </button>
    );
  }

  const remove = async () => {
    setState({ status: "working", message: null });
    try {
      await onConfirm();
    } catch (error) {
      setState({ status: "failed", message: error.message });
    }
  };

  return (
    <span className="confirm">
      <span className="confirm__text">Delete {label}?</span>
      <button
        type="button"
        className="ghost-button ghost-button--risk"
        onClick={remove}
        disabled={state.status === "working"}
      >
        {state.status === "working" ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" className="ghost-button" onClick={() => setArmed(false)}>
        Keep it
      </button>
      {state.message && <span className="confirm__error">{state.message}</span>}
    </span>
  );
}
