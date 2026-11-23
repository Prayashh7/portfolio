import { useAsync } from "../../hooks/useAsync.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { useReferences } from "./useReferences.js";
import RecordForm from "./RecordForm.jsx";
import PageHead from "./PageHead.jsx";

/*
  Profile and site settings are single rows, so there is no list to browse — the
  screen is the form. Both are handed in as props because the two differ only in
  which fields they carry and which endpoint they save to.
*/
export default function SingletonPage({ title, subtitle, groups, load, save }) {
  const { status, data, error } = useAsync((signal) => load(signal), [load]);
  const references = useReferences(groups);

  useDocumentMeta({ title: `${title} — Dashboard`, robots: "noindex, nofollow" });

  return (
    <>
      <PageHead title={title} subtitle={subtitle} />

      {status === "loading" && <p className="muted-line">Loading…</p>}

      {status === "error" && (
        <p className="notice notice--error" role="alert">
          {error.message}
        </p>
      )}

      {status === "ready" && (
        <RecordForm groups={groups} row={data} references={references} onSubmit={save} />
      )}
    </>
  );
}
