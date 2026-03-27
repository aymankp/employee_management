import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Header.css";

const formatLastSeen = (date) => {
  if (!date) return "Never";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Dropdown component
const Dropdown = ({ isOpen, onClose, children, className = "" }) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className={`dropdown ${className}`}>
      {children}
    </div>
  );
};

// Profile Dropdown Content
const ProfileMenu = ({ onProfileClick, onLogout, userRole }) => (
  <>
    <div className="dropdown-item" onClick={onProfileClick}>
      <User size={16} /> My Profile
    </div>
    <div className="dropdown-item" onClick={onLogout}>
      <LogOut size={16} /> Logout
    </div>
  </>
);

const UserAvatar = ({ name, avatar, onAvatarClick }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatar]);

  const initial = name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="avatar" onClick={onAvatarClick}>
      {avatar && !imgError ? (
        <img
          src={avatar}
          alt={name || "User"}
          className="avatar-img"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="avatar-initial">{initial}</span>
      )}
    </div>
  );
};

// Welcome Message Component
const WelcomeMessage = ({ name, lastLogin }) => {
  const firstName = name?.split(" ")[0] || "User";

  return (
    <div className="welcome-message">
      <h2>Welcome back, {firstName}!</h2>
      <div className="user-status">
        Last login: {lastLogin ? formatLastSeen(lastLogin) : "Never"}
      </div>
    </div>
  );
};

// Main Header Component
const Header = ({ toggleSidebar, onRefresh }) => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);

  

  const handleProfileClick = useCallback(() => {
    setShowProfile(false);
    if (user?.role === "manager") {
      navigate("/manager/profile");
    } else if (user?.role === "admin") {
      navigate("/admin/profile");
    } else {
      navigate("/employee/profile");
    }
  }, [navigate, user?.role]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);


  if (loading) {
    return (
      <header className="header">
        <div className="header-left">
          <div
            style={{
              width: 200,
              height: 20,
              background: "#ccc",
              borderRadius: 4,
            }}
          />
        </div>
        <div className="header-right">
          <div
            style={{
              width: 40,
              height: 40,
              background: "#ccc",
              borderRadius: "50%",
            }}
          />
        </div>
      </header>
    );
  }
  return (
    <header className="header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>

        <WelcomeMessage name={user?.name} lastLogin={user?.lastLogin} />
      </div>

      <div className="header-right">
        <div className="dropdown-wrapper profile-dropdown">
          <UserAvatar
            name={user?.name}
            avatar={user?.avatar}
            onAvatarClick={() => setShowProfile(!showProfile)}
          />

          <Dropdown isOpen={showProfile} onClose={() => setShowProfile(false)}>
            <ProfileMenu
              onProfileClick={handleProfileClick}
              onLogout={handleLogout}
            />
          </Dropdown>
        </div>
      </div>
    </header>
  );
};

export default Header;
