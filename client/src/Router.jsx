import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
//import pages
import SigninPage from "./pages/SignIn";
import SignupPage from "./pages/SignUp";

export default function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SigninPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </Router>
  );
}
