import { useEffect, useMemo, useState } from "react";
import ImageField from "./ImageField.jsx";
import { flatten } from "./fields.js";

/*
  One form for every record in the dashboard. It reads the field definitions in
  fields.js and renders the controls they describe, so a new column needs a line
  of configuration rather than another form component.

  Values are held as strings, which is what the controls produce. The API accepts
  them that way: it trims, coerces numbers and turns empty strings into nulls, and
  it is the same validation a request from anywhere else would meet.
*/

export function toFormValues(groups, row) {
  const values = {};
  for (const field of flatten(groups)) {
    const raw = row ? row[field.name] : undefined;

    if (field.type === "toggle") {
      values[field.name] = typeof raw === "boolean" ? raw : Boolean(field.default);
    } else if (field.type === "tags") {
      values[field.name] = Array.isArray(raw) ? raw.join(", ") : "";
    } else {
      values[field.name] = raw === null || raw === undefined ? "" : String(raw);
    }
  }
  return values;
}

const INPUT_TYPES = {
  text: "text",
  slug: "text",
  /* Not type="url": the browser would reject /media/… paths, which the API allows. */
  url: "text",
  email: "email",
  date: "date",
  number: "number",
  tags: "text",
};

function Control({ field, value, onChange, options, invalid, describedBy }) {
  const shared = {
    id: `field-${field.name}`,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
  };

  if (field.type === "textarea") {
    return (
      <textarea
        {...shared}
        className="control control--area"
        rows={field.rows || 4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === "toggle") {
    return (
      <label className="switch">
        <input
          {...shared}
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="switch__track" aria-hidden="true" />
        <span className="switch__state">{value ? "Yes" : "No"}</span>
      </label>
    );
  }

  if (field.type === "select" || field.type === "reference") {
    return (
      <select
        {...shared}
        className="control control--select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {field.allowEmpty !== false && <option value="">Not set</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "image") {
    return (
      <ImageField
        id={shared.id}
        value={value}
        onChange={onChange}
        invalid={invalid}
        describedBy={describedBy}
      />
    );
  }

  if (field.type === "color") {
    return (
      <span className="color-field">
        <input
          {...shared}
          className="control"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#22D3EE"
          spellCheck="false"
        />
        <span
          className="color-field__swatch"
          style={{ background: value || "transparent" }}
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <input
      {...shared}
      className="control"
      type={INPUT_TYPES[field.type] || "text"}
      step={field.step}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={field.type === "slug" || field.type === "url" ? "false" : undefined}
    />
  );
}

export default function RecordForm({
  groups,
  row,
  references = {},
  submitLabel = "Save changes",
  onSubmit,
  actions,
}) {
  const initial = useMemo(() => toFormValues(groups, row), [groups, row]);
  const [values, setValues] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [state, setState] = useState({ status: "idle", message: null, fields: {} });

  useEffect(() => {
    setValues(initial);
    setBaseline(initial);
    setState({ status: "idle", message: null, fields: {} });
  }, [initial]);

  /* Both objects come from toFormValues, so their keys are in the same order and
     comparing the serialised form is a fair test of "has anything changed". The
     baseline moves to whatever the API stored, so the parent never has to reload
     the row and wipe the confirmation off the screen. */
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);

  const update = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setState((current) =>
      current.status === "idle" ? current : { status: "idle", message: null, fields: current.fields }
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: "saving", message: null, fields: {} });

    const payload = {};
    for (const field of flatten(groups)) payload[field.name] = values[field.name];

    try {
      const saved = await onSubmit(payload);
      /* The API answers with the row it stored, so the form can settle on the
         values as they now exist — trimmed, coerced, blanks turned into nulls. */
      const next = saved ? toFormValues(groups, saved) : values;
      setValues(next);
      setBaseline(next);
      setState({ status: "saved", message: "Saved.", fields: {} });
    } catch (error) {
      setState({
        status: "failed",
        message: error.message,
        fields: error.fields || {},
      });
    }
  };

  const saving = state.status === "saving";

  return (
    <form className="record-form" onSubmit={submit} noValidate>
      {groups.map((group, index) => (
        <fieldset className="record-form__group" key={group.legend || index} disabled={saving}>
          {group.legend && <legend className="record-form__legend">{group.legend}</legend>}

          <div className="record-form__fields">
            {group.fields.map((field) => {
              const error = state.fields[field.name];
              const describedBy =
                [error && `error-${field.name}`, field.help && `help-${field.name}`]
                  .filter(Boolean)
                  .join(" ") || undefined;

              return (
                <div
                  className="row"
                  key={field.name}
                  data-wide={field.type === "textarea" || field.type === "image" || undefined}
                >
                  <label className="row__label" htmlFor={`field-${field.name}`}>
                    {field.label}
                    {field.required && <span className="row__required"> *</span>}
                  </label>

                  <div className="row__control">
                    <Control
                      field={field}
                      value={values[field.name]}
                      onChange={(value) => update(field.name, value)}
                      options={
                        field.type === "reference" ? references[field.source] || [] : field.options || []
                      }
                      invalid={Boolean(error)}
                      describedBy={describedBy}
                    />
                    {field.help && (
                      <p className="row__help" id={`help-${field.name}`}>
                        {field.help}
                      </p>
                    )}
                    {error && (
                      <p className="row__error" id={`error-${field.name}`}>
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      {state.message && (
        <p
          className={`notice notice--${state.status === "failed" ? "error" : "good"}`}
          role={state.status === "failed" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}

      <div className="record-form__foot">
        <button type="submit" className="solid-button" disabled={saving || !dirty}>
          {saving ? "Saving…" : submitLabel}
        </button>
        {dirty && !saving && <span className="muted-line">Unsaved changes</span>}
        {actions}
      </div>
    </form>
  );
}
