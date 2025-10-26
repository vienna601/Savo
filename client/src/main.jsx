import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import SigninPage from "./pages/SignIn.jsx";
import SignupPage from "./pages/SignUp.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import TherapistRobot from "./pages/TherapistRobot.jsx";
import AdminEmotions from "./pages/AdminEmotions.jsx";
import ResourcesPage from "./pages/Resources.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <Auth0Provider
        domain={import.meta.env.VITE_AUTH0_DOMAIN}
        clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
        authorizationParams={{
          redirect_uri: `${window.location.origin}/dashboard`,
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          scope: "openid profile email",
          response_type: "code",
        }}
      >
        <Routes>
          <Route path="/signin" element={<SigninPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<TherapistRobot />} />
          <Route path="/admin" element={<AdminEmotions />} />
          <Route path="/resources" element={<ResourcesPage />} />
        </Routes>
      </Auth0Provider>
    </Router>
  </StrictMode>
);
