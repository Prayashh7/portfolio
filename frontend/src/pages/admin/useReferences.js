import { adminList } from "../../services/api.js";
import { useAsync } from "../../hooks/useAsync.js";
import { flatten } from "./fields.js";

/*
  Some fields point at another collection — a skill belongs to a skill group, the
  featured project points at a project. Those collections are fetched here so the
  select can show names instead of asking anyone to remember an id.
*/

/* The first of these a row has becomes its label. */
const LABEL_COLUMNS = ["name", "label", "title", "degree", "position"];

const describe = (row) =>
  LABEL_COLUMNS.map((column) => row[column]).find(Boolean) || `Record ${row.id}`;

export function useReferences(groups) {
  const sources = [
    ...new Set(
      flatten(groups)
        .filter((field) => field.type === "reference")
        .map((field) => field.source)
    ),
  ];

  const { data } = useAsync(
    async (signal) => {
      const lists = await Promise.all(sources.map((source) => adminList(source, signal)));
      return Object.fromEntries(
        sources.map((source, index) => [
          source,
          lists[index].map((row) => ({ value: String(row.id), label: describe(row) })),
        ])
      );
    },
    [sources.join(",")]
  );

  return data || {};
}
