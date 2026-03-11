import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Bell, LogOut, Menu, Moon, Sun, User } from "lucide-react";
import "./Header.css";

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();

  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

 const toggleDark = () => {
  const role = user?.role;
  const key = `${role}-theme`;

  const isDark = document.body.classList.toggle("dark");

  setDarkMode(isDark);

  localStorage.setItem(key, isDark ? "dark" : "light");
};
  return (
    <header className="header">
      {/* LEFT */}
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>

        <h2>Welcome back, {user?.name?.split(" ")[0]}!</h2>
      </div>

      {/* RIGHT */}
      <div className="header-right">
        {/* DARK MODE */}
        <button className="icon-btn" onClick={toggleDark}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* NOTIFICATIONS */}
        <div className="dropdown-wrapper">
          <button className="icon-btn" onClick={() => setShowNotif(!showNotif)}>
            <Bell size={18} />
            <span className="notif-badge">3</span>
          </button>

          {showNotif && (
            <div className="dropdown">
              <h4>Notifications</h4>
              <div className="dropdown-item">Leave approved</div>
              <div className="dropdown-item">New leave request</div>
              <div className="dropdown-item">Policy updated</div>
            </div>
          )}
        </div>

        {/* USER PROFILE */}
        <div className="dropdown-wrapper">
          <div
            className="user-info"
            onClick={() => setShowProfile(!showProfile)}
          >
            <div className="avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          </div>

          {showProfile && (
            <div className="dropdown">
              <div className="dropdown-item">
                <User size={16} /> Profile
              </div>

              <div className="dropdown-item" onClick={logout}>
                <LogOut size={16} /> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
