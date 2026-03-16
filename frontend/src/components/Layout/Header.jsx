import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Menu, User, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import socketService from "../../services/socket"; // Changed from 'socket' to 'socketService'
import "./Header.css";

// Custom hook for notification management
const useNotifications = () => {
  const [notifications, setNotifications] = useState(0);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const handleLeaveStatusUpdate = () => {
      setNotifications((prev) => prev + 1);
    };

    socketService.on("leave-status-update", handleLeaveStatusUpdate); // Fixed

    return () => {
      socketService.off("leave-status-update", handleLeaveStatusUpdate); // Fixed
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

// Welcome Message Component - FIXED with role
const WelcomeMessage = ({ name, role }) => {
  const firstName = name?.split(" ")[0] || "User";

  const getRoleGreeting = () => {
    switch (role) {
      case "admin":
        return "Admin";
      case "manager":
        return "Manager";
      default:
        return "Employee";
    }
  };

  return (
    <div className="welcome-message">
      <h2>Welcome back, {firstName}! 👋</h2>
    </div>
  );
};

// Main Header Component
const Header = ({ toggleSidebar, onRefresh }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, showNotif, toggleNotifications, markAsRead } =
    useNotifications();
  const [showProfile, setShowProfile] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Force header refresh

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log("Profile updated, refreshing header");
      setRefreshKey((prev) => prev + 1);
    };

    // Custom event for profile updates
    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, []);

  const handleProfileClick = useCallback(() => {
    setShowProfile(false);
    // Navigate based on user role
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

  const handleNotificationItemClick = useCallback(() => {
    markAsRead();
  }, [markAsRead]);

  // Debug: Log user changes
  useEffect(() => {
    console.log("Header user updated:", user);
  }, [user]);

  return (
    <header className="header" key={refreshKey}>
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <WelcomeMessage name={user?.name} role={user?.role} />
      </div>

      <div className="header-right">
        {/* Refresh Button (optional) */}
        {onRefresh && (
          <button className="icon-btn" onClick={onRefresh} aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
        )}

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
          <UserAvatar
            name={user?.name}
            avatar={user?.avatar}
            onAvatarClick={() => setShowProfile(!showProfile)}
          />

          <Dropdown isOpen={showProfile} onClose={() => setShowProfile(false)}>
            <ProfileMenu
              onProfileClick={handleProfileClick}
              onLogout={handleLogout}
              userRole={user?.role}
            />
          </Dropdown>
        </div>
      </div>
    </header>
  );
};

export default Header;
