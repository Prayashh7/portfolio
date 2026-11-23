import { Link, Navigate, useParams } from "react-router-dom";
import { adminList } from "../../services/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import { collections } from "./fields.js";
import PageHead from "./PageHead.jsx";

/*
  One list screen for all nine collections. The columns shown come from the same
  definition the form is built from, so a collection is described in one place.
*/

function cell(row, key) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export default function CollectionPage() {
  const { resource } = useParams();
  const config = collections[resource];

  const { status, data, error } = useAsync(
    (signal) => (config ? adminList(resource, signal) : Promise.resolve([])),
    [resource]
  );

  useDocumentMeta({
    title: config ? `${config.label} — Dashboard` : "Dashboard",
    robots: "noindex, nofollow",
  });

  if (!config) return <Navigate to="/admin" replace />;

  return (
    <>
      <PageHead
        title={config.label}
        subtitle={config.subtitle}
        action={
          <Link className="solid-button" to={`/admin/${resource}/new`}>
            Add {config.singular}
          </Link>
        }
      />

      {status === "loading" && <p className="muted-line">Loading…</p>}

      {status === "error" && (
        <p className="notice notice--error" role="alert">
          {error.message}
        </p>
      )}

      {status === "ready" && data.length === 0 && (
        <p className="muted-line">
          Nothing here yet. Add the first {config.singular} and it appears on the site.
        </p>
      )}

      {status === "ready" && data.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {config.columns.map((column) => (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ))}
                <th scope="col">On site</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  {config.columns.map((column, index) => (
                    <td key={column.key}>
                      {index === 0 ? (
                        <Link className="table__link" to={`/admin/${resource}/${row.id}`}>
                          {cell(row, column.key)}
                        </Link>
                      ) : (
                        cell(row, column.key)
                      )}
                    </td>
                  ))}
                  <td>
                    {/* Not every collection has the column; where it is missing the
                        row is always published. */}
                    {row.is_visible === false ? (
                      <span className="pill pill--off">Hidden</span>
                    ) : (
                      <span className="pill">Live</span>
                    )}
                  </td>
                  <td className="table__actions">
                    {resource === "projects" && (
                      <Link className="table__link" to={`/admin/projects/${row.id}/images`}>
                        Images
                      </Link>
                    )}
                    <Link className="table__link" to={`/admin/${resource}/${row.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
