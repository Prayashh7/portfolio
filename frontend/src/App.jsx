import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProjectPage from "./pages/ProjectPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import { Loader } from "./components/StateScreens.jsx";

/* The dashboard is a separate bundle. A visitor reading the portfolio never
   downloads the editing interface. */
const AdminApp = lazy(() => import("./pages/admin/AdminApp.jsx"));

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/work/:slug" element={<ProjectPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<Loader label="Loading the dashboard" />}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  );
}
