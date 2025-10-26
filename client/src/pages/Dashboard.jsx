import React, { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/Dashboard.css";

// Example emotions list
const EMOTIONS = ["Frustrated", "Anxious", "Irritated", "Angry", "Grief"];
const COLORS = ["#4CAF50", "#2196F3", "#FFC107", "#F44336", "#9E9E9E"];

const Dashboard = () => {
  const { user, logout } = useAuth0();

  const handleLogout = () => {
    logout({ returnTo: window.location.origin });
  };

  // State for dynamic chart data
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  // Example: simulate fetching emotional averages
  const fetchEmotionData = () => {
    // Here, replace this with real API or localStorage data
    const randomData = () =>
      EMOTIONS.map((name) => ({
        name,
        value: Math.floor(Math.random() * 50) + 5,
      }));

    setDailyData(randomData());
    setWeeklyData(randomData());
    setMonthlyData(randomData());
  };

  // Update charts every 10 seconds
  useEffect(() => {
    fetchEmotionData(); // Initial fetch
    const intervalId = setInterval(fetchEmotionData, 10000); // every 10s
    return () => clearInterval(intervalId); // cleanup
  }, []);

  const renderPieChart = (title, data) => (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span>Savo</span>
        </div>

        <nav className="nav-menu">
          <a href="/dashboard" className="nav-item active">
            <span>Home</span>
          </a>
          <a href="/chat" className="nav-item">
            <span>Chat</span>
          </a>
          <a href="/profile" className="nav-item">
            <span>Profile</span>
          </a>
          <a href="/settings" className="nav-item">
            <span>Settings</span>
          </a>
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
            <h3>Your Progress</h3>
            <p>Track your emotional well-being</p>
            <a href="/progress" className="card-link">
              View Progress
            </a>
          </div>

          <div className="card">
            <h3>Resources</h3>
            <p>Access mental health resources</p>
            <a href="/resources" className="card-link">
              Browse Resources
            </a>
          </div>

          <div className="card">
            <h3>Community</h3>
            <p>Connect with others</p>
            <a href="/community" className="card-link">
              Join Community
            </a>
          </div>
        </div>

        {/* Pie Charts Section */}
        <section className="charts-section">
          <h2>Emotional Insights</h2>
          <div className="charts-grid">
            {renderPieChart("Daily Emotions", dailyData)}
            {renderPieChart("Weekly Emotions", weeklyData)}
            {renderPieChart("Monthly Emotions", monthlyData)}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
