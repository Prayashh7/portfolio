import { Link, useParams } from "react-router-dom";
import {
  addProjectImage,
  adminGet,
  getProjectImages,
  removeProjectImage,
  resolveMediaUrl,
  updateProjectImage,
} from "../../services/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";
import RecordForm from "./RecordForm.jsx";
import ConfirmDelete from "./ConfirmDelete.jsx";
import PageHead from "./PageHead.jsx";

/*
  The gallery shown on a project's page. These rows live in their own table
  because a project can carry any number of them, and they are edited here rather
  than on the project form.
*/

const imageGroups = [
  {
    fields: [
      { name: "url", label: "Image", type: "image", required: true },
      {
        name: "alt",
        label: "Description",
        type: "text",
        help: "What the image shows, for anyone using a screen reader.",
      },
      { name: "sort_order", label: "Order", type: "number", help: "Lower numbers come first." },
    ],
  },
];

export default function ProjectImagesPage() {
  const { id } = useParams();

  const project = useAsync((signal) => adminGet("projects", id, signal), [id]);
  const images = useAsync((signal) => getProjectImages(id, signal), [id]);

  useDocumentMeta({ title: "Gallery — Dashboard", robots: "noindex, nofollow" });

  const add = async (payload) => {
    const created = await addProjectImage(id, payload);
    images.reload();
    return created;
  };

  return (
    <>
      <PageHead
        title="Gallery"
        subtitle={
          project.data
            ? `Images shown below the case notes on ${project.data.name}.`
            : "Images shown below the case notes."
        }
        back={{ to: `/admin/projects/${id}`, label: "Project" }}
      />

      {images.status === "loading" && <p className="muted-line">Loading…</p>}

      {images.status === "error" && (
        <p className="notice notice--error" role="alert">
          {images.error.message}
        </p>
      )}

      {images.status === "ready" && (
        <>
          {images.data.length === 0 ? (
            <p className="muted-line">
              No gallery images yet. The project page shows its cover image on its own until one is
              added.
            </p>
          ) : (
            <ul className="stack">
              {images.data.map((image) => (
                <li className="stack__item" key={image.id}>
                  <span className="stack__thumb">
                    <img src={resolveMediaUrl(image.url)} alt="" loading="lazy" />
                  </span>

                  <RecordForm
                    groups={imageGroups}
                    row={image}
                    onSubmit={(payload) => updateProjectImage(image.id, payload)}
                    actions={
                      <ConfirmDelete
                        label="this image"
                        onConfirm={async () => {
                          await removeProjectImage(image.id);
                          images.reload();
                        }}
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <section className="panel">
            <header className="panel__head">
              <h2 className="panel__title">Add an image</h2>
            </header>
            {/* The key changes once the list grows, which hands back an empty form
                instead of leaving the image just added sitting in the fields. */}
            <RecordForm
              key={images.data.length}
              groups={imageGroups}
              submitLabel="Add image"
              onSubmit={add}
            />
          </section>

          <Link className="ghost-button" to={`/admin/projects/${id}`}>
            Back to the project
          </Link>
        </>
      )}
    </>
  );
}
