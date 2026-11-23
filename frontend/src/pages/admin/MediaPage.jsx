import { useState } from "react";
import { listMedia, removeUpload, resolveMediaUrl, uploadFile } from "../../services/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import ConfirmDelete from "./ConfirmDelete.jsx";
import PageHead from "./PageHead.jsx";

/*
  Every image the site can point at. Uploads can be removed; the artwork that
  shipped with the site cannot, which the API enforces rather than this screen.
*/

function readableSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const { status, data, error, reload } = useAsync((signal) => listMedia(signal));
  const [upload, setUpload] = useState({ status: "idle", message: null });
  const [copied, setCopied] = useState(null);

  useDocumentMeta({ title: "Images — Dashboard", robots: "noindex, nofollow" });

  const send = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUpload({ status: "working", message: null });
    try {
      await uploadFile(file);
      setUpload({ status: "idle", message: null });
      reload();
    } catch (cause) {
      setUpload({ status: "failed", message: cause.message });
    }
  };

  /* The clipboard is unavailable on an insecure origin, so the path stays visible
     under every image as the fallback. */
  const copy = async (path) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(path);
    } catch {
      setCopied(null);
    }
  };

  return (
    <>
      <PageHead
        title="Images"
        subtitle="Uploaded here, then chosen in any image field."
        action={
          <label className="solid-button">
            {upload.status === "working" ? "Uploading…" : "Upload an image"}
            <input
              type="file"
              accept="image/*"
              onChange={send}
              disabled={upload.status === "working"}
              hidden
            />
          </label>
        }
      />

      {upload.message && (
        <p className="notice notice--error" role="alert">
          {upload.message}
        </p>
      )}

      {status === "loading" && <p className="muted-line">Loading…</p>}

      {status === "error" && (
        <p className="notice notice--error" role="alert">
          {error.message}
        </p>
      )}

      {status === "ready" && data.length === 0 && (
        <p className="muted-line">Nothing here yet.</p>
      )}

      {status === "ready" && data.length > 0 && (
        <ul className="shelf">
          {data.map((file) => (
            <li className="shelf__item" key={file.url}>
              <span className="shelf__frame">
                <img src={resolveMediaUrl(file.url)} alt="" loading="lazy" />
              </span>

              <div className="shelf__meta">
                <p className="shelf__path">{file.url}</p>
                <p className="shelf__size">{readableSize(file.size)}</p>
              </div>

              <div className="shelf__actions">
                <button type="button" className="ghost-button" onClick={() => copy(file.url)}>
                  {copied === file.url ? "Copied" : "Copy path"}
                </button>
                {file.removable && (
                  <ConfirmDelete
                    label="this image"
                    onConfirm={async () => {
                      await removeUpload(file.filename);
                      reload();
                    }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
