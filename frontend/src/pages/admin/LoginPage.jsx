import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.jsx";
import { useDocumentMeta } from "../../hooks/useDocumentMeta.js";

/*
  The only public page in the dashboard. The server answers a wrong email and a
  wrong password identically, so there is nothing more specific to show than the
  message it returns.
*/

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState({ status: "idle", message: null });

  useDocumentMeta({ title: "Sign in", robots: "noindex, nofollow" });

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: "working", message: null });

    try {
      await signIn(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (error) {
      setState({ status: "failed", message: error.message });
    }
  };

  const working = state.status === "working";

  return (
    <div className="gate">
      <form className="gate__panel" onSubmit={submit} noValidate>
        <div className="gate__head">
          <p className="gate__eyebrow">Portfolio</p>
          <h1 className="gate__title">Sign in</h1>
          <p className="gate__note">This area manages the content on the public site.</p>
        </div>

        <fieldset className="gate__fields" disabled={working}>
          <div className="row row--stack">
            <label className="row__label" htmlFor="login-email">
              Email
            </label>
            <div className="row__control">
              <input
                className="control"
                id="login-email"
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                spellCheck="false"
                required
              />
            </div>
          </div>

          <div className="row row--stack">
            <label className="row__label" htmlFor="login-password">
              Password
            </label>
            <div className="row__control">
              <input
                className="control"
                id="login-password"
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>
        </fieldset>

        {state.message && (
          <p className="notice notice--error" role="alert">
            {state.message}
          </p>
        )}

        <button type="submit" className="solid-button solid-button--full" disabled={working}>
          {working ? "Signing in…" : "Sign in"}
        </button>

        <a className="gate__exit" href="/">
          Back to the site
        </a>
      </form>
    </div>
  );
}
