import { useEffect, useRef, useState } from "react";
import { listMedia, resolveMediaUrl, uploadFile } from "../../services/api.js";

/*
  Image fields hold a path such as /media/uploads/ab12….webp. The path can be
  typed or pasted directly — an image hosted elsewhere is a valid answer — and the
  library below covers the ordinary case of picking or uploading one.
*/

function useEscape(onClose) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
}

function Library({ onPick, onClose }) {
  const [files, setFiles] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const closeButton = useRef(null);

  useEscape(onClose);

  useEffect(() => {
    closeButton.current?.focus();
    const controller = new AbortController();
    listMedia(controller.signal)
      .then(setFiles)
      .catch((cause) => {
        if (cause.name !== "AbortError") setError(cause.message);
      });
    return () => controller.abort();
  }, []);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const created = await uploadFile(file);
      onPick(created.url);
      onClose();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Image library">
      <div className="sheet__panel">
        <header className="sheet__head">
          <h2 className="sheet__title">Images</h2>
          <button type="button" className="ghost-button" onClick={onClose} ref={closeButton}>
            Close
          </button>
        </header>

        <div className="sheet__body">
          {error && <p className="notice notice--error">{error}</p>}

          {!files && !error && <p className="muted-line">Loading images…</p>}

          {files?.length === 0 && (
            <p className="muted-line">Nothing here yet. Upload an image to get started.</p>
          )}

          {files?.length > 0 && (
            <ul className="media-grid">
              {files.map((file) => (
                <li key={file.url}>
                  <button
                    type="button"
                    className="media-tile"
                    onClick={() => {
                      onPick(file.url);
                      onClose();
                    }}
                  >
                    <img src={resolveMediaUrl(file.url)} alt="" loading="lazy" />
                    <span className="media-tile__name">{file.filename}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="sheet__foot">
          <label className="ghost-button">
            {busy ? "Uploading…" : "Upload an image"}
            <input type="file" accept="image/*" onChange={upload} disabled={busy} hidden />
          </label>
          <p className="muted-line">JPEG, PNG, WebP, AVIF or GIF.</p>
        </footer>
      </div>
    </div>
  );
}

export default function ImageField({ id, value, onChange, describedBy, invalid }) {
  const [open, setOpen] = useState(false);
  const preview = resolveMediaUrl(value);

  return (
    <div className="image-field">
      {preview && (
        <span className="image-field__preview">
          <img src={preview} alt="" />
        </span>
      )}

      <div className="image-field__controls">
        <input
          className="control"
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/media/…"
          spellCheck="false"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        />
        <div className="image-field__buttons">
          <button type="button" className="ghost-button" onClick={() => setOpen(true)}>
            Library
          </button>
          {value && (
            <button type="button" className="ghost-button" onClick={() => onChange("")}>
              Clear
            </button>
          )}
        </div>
      </div>

      {open && <Library onPick={onChange} onClose={() => setOpen(false)} />}
    </div>
  );
}
