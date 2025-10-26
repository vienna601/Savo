import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import "../styles/Dashboard.css";
import { Link, useLocation } from "react-router-dom";

const Dashboard = () => {
  const { user, logout } = useAuth0();
  const location = useLocation();

  const handleLogout = () => {
    logout({ returnTo: window.location.origin });
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span>Savo</span>
        </div>

        <nav className="nav-menu">
          <Link to="/dashboard" className={`nav-item ${location.pathname === "/" || location.pathname === "/dashboard" ? "active" : ""}`}>
            <span>Home</span>
          </Link>
          <Link to="/chat" className={`nav-item ${location.pathname === "/chat" ? "active" : ""}`}>
            <span>Chat</span>
          </Link>
          <Link to="/resources" className={`nav-item ${location.pathname === "/resources" ? "active" : ""}`}>
            <span>Resources</span>
          </Link>
        </nav>

        <button onClick={handleLogout} className="logout-btn">
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <h1>Welcome back, {user?.name || "User"}!</h1>
          <div className="user-profile">
            <img
              src={user?.picture || "https://via.placeholder.com/32"}
              alt="Profile"
              className="avatar"
            />
          </div>
        </header>

        <div className="dashboard-grid">
          <div className="card">
            <h3>Quick Chat</h3>
            <p>Start a conversation with our AI therapist</p>
            <a href="/chat" className="card-link">
              Open Chat
            </a>
          </div>

          <div className="card">
            <h3>Resources</h3>
            <p>Access mental health resources</p>
            <a href="/resources" className="card-link">
              Browse Resources
            </a>
          </div>
        </div>

        {/* Removed Pie Charts Section */}
      </main>
    </div>
  );
};

export default Dashboard;
