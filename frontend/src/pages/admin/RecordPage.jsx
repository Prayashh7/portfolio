import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { adminCreate, adminGet, adminRemove, adminUpdate } from "../../services/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { collections } from "./fields.js";
import { useReferences } from "./useReferences.js";
import RecordForm from "./RecordForm.jsx";
import ConfirmDelete from "./ConfirmDelete.jsx";
import PageHead from "./PageHead.jsx";

/*
  Add or edit one row. Both cases use the same form; only the request differs, and
  whether there is anything to delete.
*/

export default function RecordPage() {
  const { resource, id } = useParams();
  const navigate = useNavigate();
  const config = collections[resource];
  const isNew = !id;

  const { status, data, error } = useAsync(
    (signal) => (config && id ? adminGet(resource, id, signal) : Promise.resolve(null)),
    [resource, id]
  );

  const references = useReferences(config ? config.groups : []);

  useDocumentMeta({
    title: config ? `${config.label} — Dashboard` : "Dashboard",
    robots: "noindex, nofollow",
  });

  if (!config) return <Navigate to="/admin" replace />;

  const submit = async (payload) => {
    if (isNew) {
      const created = await adminCreate(resource, payload);
      navigate(`/admin/${resource}`);
      return created;
    }
    return adminUpdate(resource, id, payload);
  };

  const title = isNew
    ? `Add ${config.singular}`
    : data
      ? data.name || data.title || data.label || data.degree || data.position || `Edit ${config.singular}`
      : `Edit ${config.singular}`;

  return (
    <>
      <PageHead
        title={title}
        subtitle={isNew ? config.subtitle : undefined}
        back={{ to: `/admin/${resource}`, label: config.label }}
        action={
          resource === "projects" && !isNew ? (
            <Link className="ghost-button" to={`/admin/projects/${id}/images`}>
              Gallery images
            </Link>
          ) : undefined
        }
      />

      {!isNew && status === "loading" && <p className="muted-line">Loading…</p>}

      {!isNew && status === "error" && (
        <p className="notice notice--error" role="alert">
          {error.message}
        </p>
      )}

      {(isNew || status === "ready") && (
        <RecordForm
          groups={config.groups}
          row={data}
          references={references}
          submitLabel={isNew ? `Add ${config.singular}` : "Save changes"}
          onSubmit={submit}
          actions={
            isNew ? undefined : (
              <ConfirmDelete
                label={`this ${config.singular}`}
                onConfirm={async () => {
                  await adminRemove(resource, id);
                  navigate(`/admin/${resource}`);
                }}
              />
            )
          }
        />
      )}
    </>
  );
}
