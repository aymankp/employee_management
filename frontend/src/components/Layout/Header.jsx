import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, User, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import socket from "../../socket";
import "./Header.css";

// Custom hook for notification management
const useNotifications = () => {
  const [notifications, setNotifications] = useState(0);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const handleLeaveStatusUpdate = () => {
      setNotifications((prev) => prev + 1);
    };

    socket.on("leave-status-update", handleLeaveStatusUpdate);

    return () => {
      socket.off("leave-status-update", handleLeaveStatusUpdate);
    };
  }, []);

  const toggleNotifications = useCallback(() => {
    setShowNotif((prev) => !prev);
  }, []);

  const markAsRead = useCallback(() => {
    setNotifications(0);
    setShowNotif(false);
  }, []);

  return {
    notifications,
    showNotif,
    toggleNotifications,
    markAsRead,
  };
};

// Dropdown component for better reusability
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

// Notification Bell Component
const NotificationBell = ({ count, onClick }) => (
  <button className="icon-btn" onClick={onClick} aria-label="Notifications">
    <Bell size={18} />
    {count > 0 && (
      <span
        className="notif-badge"
        aria-label={`${count} unread notifications`}
      >
        {count}
      </span>
    )}
  </button>
);

// Notification Dropdown Content
const NotificationList = ({ notifications, onItemClick }) => {
  const notificationItems = [
    { id: 1, text: "Leave approved" },
    { id: 2, text: "New leave request" },
    { id: 3, text: "Policy updated" },
  ];

  return (
    <>
      <h4>Notifications</h4>
      {notificationItems.map((item) => (
        <div
          key={item.id}
          className="dropdown-item"
          onClick={() => onItemClick?.(item)}
        >
          {item.text}
        </div>
      ))}
    </>
  );
};

// Profile Dropdown Content
const ProfileMenu = ({ onProfileClick, onLogout }) => (
  <>
    <div className="dropdown-item" onClick={onProfileClick}>
      <User size={16} /> Profile
    </div>
    <div className="dropdown-item" onClick={onLogout}>
      <LogOut size={16} /> Logout
    </div>
  </>
);

// Avatar Component
const UserAvatar = ({ name, avatar }) => {
  const initial = name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="avatar">
      <img
        src={avatar ? `http://localhost:5000${avatar}` : "/default-avatar.png"}
        alt="profile"
        className="avatar-img"
      />
      {!avatar && <span className="avatar-initial">{initial}</span>}
    </div>
  );
};

// Welcome Message Component
const WelcomeMessage = ({ name }) => {
  const firstName = name?.split(" ")[0] || "User";
  return <h2>Welcome back, {firstName}!</h2>;
};

// Main Header Component
const Header = ({ toggleSidebar, onRefresh }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, showNotif, toggleNotifications, markAsRead } =
    useNotifications();
  const [showProfile, setShowProfile] = useState(false);

  const handleProfileClick = useCallback(() => {
    setShowProfile(false);
    navigate("/employee/profile");
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleNotificationItemClick = useCallback(() => {
    markAsRead();
  }, [markAsRead]);


  return (
    <header className="header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <WelcomeMessage name={user?.name} />
      </div>

      <div className="header-right">

        {/* Notifications Dropdown */}
        <div className="dropdown-wrapper">
          <NotificationBell
            count={notifications}
            onClick={toggleNotifications}
          />

          <Dropdown isOpen={showNotif} onClose={markAsRead}>
            <NotificationList onItemClick={handleNotificationItemClick} />
          </Dropdown>
        </div>

        {/* Profile Dropdown */}
        <div className="dropdown-wrapper profile-dropdown">
          <div onClick={() => setShowProfile(!showProfile)}>
            <UserAvatar name={user?.name} avatar={user?.avatar} />
          </div>

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
