import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../../hooks/useAuth.jsx";
import AdminShell from "./AdminShell.jsx";
import LoginPage from "./LoginPage.jsx";
import OverviewPage from "./OverviewPage.jsx";
import SingletonPage from "./SingletonPage.jsx";
import CollectionPage from "./CollectionPage.jsx";
import RecordPage from "./RecordPage.jsx";
import ProjectImagesPage from "./ProjectImagesPage.jsx";
import MessagesPage from "./MessagesPage.jsx";
import MediaPage from "./MediaPage.jsx";
import { profileGroups, settingsGroups } from "./fields.js";
import {
  getAdminProfile,
  getAdminSettings,
  updateProfile,
  updateSettings,
} from "../../services/api.js";
import "../../styles/admin.css";

/*
  The dashboard is one lazy chunk, so a visitor to the portfolio never downloads
  it. Everything below lives under /admin.
*/

function RequireAuth() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="admin-boot">
        <p className="muted-line">Checking your session…</p>
      </div>
    );
  }

  if (status === "anonymous") return <Navigate to="/admin/login" replace />;

  return <AdminShell />;
}

function LoginRoute() {
  const { status } = useAuth();
  if (status === "authenticated") return <Navigate to="/admin" replace />;
  return <LoginPage />;
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginRoute />} />

        <Route element={<RequireAuth />}>
          <Route index element={<OverviewPage />} />

          <Route
            path="profile"
            element={
              <SingletonPage
                title="Profile"
                subtitle="Your name, the words in the hero, the portrait and how you can be reached."
                groups={profileGroups}
                load={getAdminProfile}
                save={updateProfile}
              />
            }
          />

          <Route
            path="settings"
            element={
              <SingletonPage
                title="Words and settings"
                subtitle="Section headings, the hero lines and the addresses the site publishes."
                groups={settingsGroups}
                load={getAdminSettings}
                save={updateSettings}
              />
            }
          />

          <Route path="messages" element={<MessagesPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="projects/:id/images" element={<ProjectImagesPage />} />

          {/* Static segments above rank ahead of these in React Router. */}
          <Route path=":resource" element={<CollectionPage />} />
          <Route path=":resource/new" element={<RecordPage />} />
          <Route path=":resource/:id" element={<RecordPage />} />

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
