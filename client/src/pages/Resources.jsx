import React, { useState, useMemo } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Resources.css";
import resourcesData from "../../resources.json";

const Resources = () => {
  const { logout } = useAuth0();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");

  const handleLogout = () => {
    logout({ returnTo: window.location.origin });
  };

  // Get unique regions from data
  const regions = useMemo(() => {
    const uniqueCountries = [...new Set(resourcesData.map(r => r.country))].sort();
    return uniqueCountries;
  }, []);

  // Filter resources based on search and region
  const filteredResources = useMemo(() => {
    return resourcesData.filter(resource => {
      const matchesSearch = 
        resource.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (resource.phone && resource.phone.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesRegion = selectedRegion === "all" || resource.country === selectedRegion;
      
      return matchesSearch && matchesRegion;
    });
  }, [searchTerm, selectedRegion]);

  return (
    <div className="resources">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <span>Savo</span>
        </div>
        <nav className="nav-menu">
          <Link
            to="/dashboard"
            className={`nav-item ${
              location.pathname === "/" || location.pathname === "/dashboard"
                ? "active"
                : ""
            }`}
          >
            <span>Home</span>
          </Link>
          <Link
            to="/chat"
            className={`nav-item ${location.pathname === "/chat" ? "active" : ""}`}
          >
            <span>Chat</span>
          </Link>
          <Link
            to="/resources"
            className={`nav-item ${location.pathname === "/resources" ? "active" : ""}`}
          >
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
          <h1>Mental Health Resources</h1>
        </header>

        {/* Search and Filter */}
        <div className="search-filter-container">
          <input
            type="text"
            className="search-box"
            placeholder="Search by country, organization, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            <option value="all">All Countries</option>
            {regions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <p className="results-count">
          Showing {filteredResources.length} of {resourcesData.length} resources
        </p>

        {/* Resources Grid */}
        {filteredResources.length > 0 ? (
          <div className="resources-grid">
            {filteredResources.map((resource) => (
              <div key={resource.id} className="resource-card">
                <h3>{resource.name}</h3>
                <p className="country">{resource.country}</p>

                <div className="resource-info">
                  {resource.phone && (
                    <div className="info-row">
                      <span className="info-label">Phone:</span>
                      <span className="info-value">
                        <a href={`tel:${resource.phone}`}>{resource.phone}</a>
                      </span>
                    </div>
                  )}

                  {resource.website && (
                    <div className="info-row">
                      <span className="info-label">Website:</span>
                      <span className="info-value">
                        <a href={resource.website} target="_blank" rel="noopener noreferrer">
                          Visit Website
                        </a>
                      </span>
                    </div>
                  )}

                  {resource.hours && (
                    <div className="info-row">
                      <span className="info-label">Hours:</span>
                      <span className="info-value">{resource.hours}</span>
                    </div>
                  )}

                  {resource.chat_available && resource.chat_link && (
                    <div className="info-row">
                      <span className="info-label">Chat:</span>
                      <span className="info-value">
                        <a href={resource.chat_link} target="_blank" rel="noopener noreferrer">
                          <span className="chat-badge">Chat Available</span>
                        </a>
                      </span>
                    </div>
                  )}
                </div>

                {resource.languages && resource.languages.length > 0 && (
                  <div className="languages-tags">
                    {resource.languages.map((lang, idx) => (
                      <span key={idx} className="tag">
                        {lang}
                      </span>
                    ))}
                  </div>
                )}

                {resource.services && resource.services.length > 0 && (
                  <div className="services-tags">
                    {resource.services.map((service, idx) => (
                      <span key={idx} className="tag">
                        {service}
                      </span>
                    ))}
                  </div>
                )}

                {resource.notes && (
                  <div className="resource-notes">{resource.notes}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-results">
            <p>No resources found matching your search criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Resources;