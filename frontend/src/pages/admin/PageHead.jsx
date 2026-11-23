import { Link } from "react-router-dom";

/*
  The heading every dashboard screen opens with: where you are, what the screen is
  for, an optional way back and an optional action.
*/
export default function PageHead({ title, subtitle, back, action }) {
  return (
    <header className="page-head">
      <div>
        {back && (
          <Link className="page-head__back" to={back.to}>
            ← {back.label}
          </Link>
        )}
        <h1 className="page-head__title">{title}</h1>
        {subtitle && <p className="page-head__subtitle">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
