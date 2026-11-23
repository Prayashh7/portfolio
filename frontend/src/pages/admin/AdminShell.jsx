import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.jsx";
import { collections } from "./fields.js";

/*
  The frame around every dashboard screen. Navigation is grouped the way the
  portfolio itself is organised, so a section on the site is easy to find here.
*/

const NAV = [
  {
    label: "Site",
    links: [
      { to: "/admin", label: "Overview", end: true },
      { to: "/admin/profile", label: "Profile" },
      { to: "/admin/settings", label: "Words and settings" },
    ],
  },
  {
    label: "Portfolio",
    links: [
      { to: "/admin/projects", label: collections.projects.label },
      { to: "/admin/services", label: collections.services.label },
      { to: "/admin/skill-categories", label: collections["skill-categories"].label },
      { to: "/admin/skills", label: collections.skills.label },
    ],
  },
  {
    label: "Record",
    links: [
      { to: "/admin/experience", label: collections.experience.label },
      { to: "/admin/education", label: collections.education.label },
      { to: "/admin/certifications", label: collections.certifications.label },
      { to: "/admin/achievements", label: collections.achievements.label },
    ],
  },
  {
    label: "Reach",
    links: [
      { to: "/admin/social-links", label: collections["social-links"].label },
      { to: "/admin/messages", label: "Messages" },
      { to: "/admin/media", label: "Images" },
    ],
  },
];

export default function AdminShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const leave = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="admin">
      <a className="skip-link" href="#admin-main">
        Skip to content
      </a>

      <aside className="admin__side">
        <div className="admin__brand">
          <span className="admin__brand-mark" aria-hidden="true" />
          <span>
            Dashboard
            <span className="admin__brand-note">{user?.name || user?.email}</span>
          </span>
        </div>

        <nav className="admin__nav" aria-label="Dashboard">
          {NAV.map((group) => (
            <div className="admin__nav-group" key={group.label}>
              <p className="admin__nav-label">{group.label}</p>
              <ul>
                {group.links.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        isActive ? "admin__link admin__link--on" : "admin__link"
                      }
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="admin__side-foot">
          <a className="admin__link" href="/" target="_blank" rel="noreferrer">
            View the site ↗
          </a>
          <button type="button" className="admin__link" onClick={leave}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin__main" id="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
