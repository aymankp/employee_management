import { useEffect, useState } from "react";
import api from "../../services/api";
import { useRef } from "react";
import { useAuth } from "../../context/AuthContext";

import {
  Calendar,
  Briefcase,
  Users,
  Edit,
  Save,
  X,
  Key,
  Shield,
  Camera,
  Users2,
  FileText,
  TrendingUp,
} from "lucide-react";
import "../employee/Profile.css";

export default function ManagerProfile() {
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [avatar, setAvatar] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch profile data
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // Use only employee endpoint, remove the try-catch for manager endpoint
      const response = await api.get("/employees/me");

      const userData = response.data.profile || response.data;
      setProfile(userData);

      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.personalInfo?.phone || "",
        address: userData.address?.current?.street || "",
        city: userData.address?.current?.city || "",
        state: userData.address?.current?.state || "",
        pincode: userData.address?.current?.pincode || "",
        emergencyContact: userData.emergencyContact?.name || "",
        emergencyPhone: userData.emergencyContact?.phone || "",
        bloodGroup: userData.personalInfo?.bloodGroup || "",
        dateOfBirth: userData.personalInfo?.dateOfBirth
          ? userData.personalInfo.dateOfBirth.split("T")[0]
          : "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      showMessage("error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Clean up any existing preview URL
    if (avatar) {
      URL.revokeObjectURL(avatar);
    }

    // Preview image
    const previewUrl = URL.createObjectURL(file);
    setAvatar(previewUrl);

    const avatarFormData = new FormData();
    avatarFormData.append("avatar", file);

    try {
      let response;
      // Try manager endpoint first
      try {
        response = await api.put("/managers/me/avatar", avatarFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch {
        // Fallback to employee endpoint
        response = await api.put("/employees/me/avatar", avatarFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      console.log("Avatar upload response:", response.data);

      // IMPORTANT: Update the user in AuthContext with new avatar FIRST
      if (response.data.avatar) {
        // Update context immediately - this will trigger header update
        updateUser({ avatar: response.data.avatar });

        // Trigger custom event for header
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: { avatar: response.data.avatar },
          }),
        );

        // Then fetch profile data in background
        fetchProfile().then(() => {
          // Clear preview after successful fetch
          setAvatar(null);
        });
      } else {
        showMessage("success", "Profile image updated!");
        fetchProfile();
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      showMessage("error", "Image upload failed");
      // Revert preview on error
      setAvatar(null);
      URL.revokeObjectURL(previewUrl);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Try manager endpoint first
      try {
        await api.put("/managers/me", {
          name: formData.name,
          personalInfo: {
            phone: formData.phone,
            bloodGroup: formData.bloodGroup,
            dateOfBirth: formData.dateOfBirth,
          },
          address: {
            current: {
              street: formData.address,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
            },
          },
          emergencyContact: {
            name: formData.emergencyContact,
            phone: formData.emergencyPhone,
          },
        });
      } catch {
        // Fallback to employee endpoint
        await api.put("/employees/me", {
          name: formData.name,
          personalInfo: {
            phone: formData.phone,
            bloodGroup: formData.bloodGroup,
            dateOfBirth: formData.dateOfBirth,
          },
          address: {
            current: {
              street: formData.address,
              city: formData.city,
              state: formData.state,
              pincode: formData.pincode,
            },
          },
          emergencyContact: {
            name: formData.emergencyContact,
            phone: formData.emergencyPhone,
          },
        });
      }

      showMessage("success", "Profile updated successfully!");
      setEditMode(false);
      fetchProfile();
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.message || "Failed to update profile",
      );
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("error", "New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters long");
      return;
    }

    try {
      await api.put("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      showMessage("success", "Password changed successfully!");
      setPasswordMode(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      showMessage(
        "error",
        error.response?.data?.message || "Failed to change password",
      );
    }
  };

  const getTeamSize = () => {
    return profile?.managedEmployees?.length || profile?.teamSize || 0;
  };

  const getPendingRequests = () => {
    return profile?.pendingRequests || 0;
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <div className="header-content">
          <h1>Manager Profile</h1>
          <p>Manage your personal information and team settings</p>
        </div>
        <div className="header-actions">
          {!editMode && !passwordMode && (
            <>
              <button
                className="btn btn-outline"
                onClick={() => setEditMode(true)}
              >
                <Edit size={16} />
                Edit Profile
              </button>
              <button
                className="btn btn-outline"
                onClick={() => setPasswordMode(true)}
              >
                <Key size={16} />
                Change Password
              </button>
            </>
          )}
          {(editMode || passwordMode) && (
            <button
              className="btn btn-outline"
              onClick={() => {
                setEditMode(false);
                setPasswordMode(false);
                fetchProfile();
              }}
            >
              <X size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`message message-${message.type}`}>{message.text}</div>
      )}

      {/* Profile Content */}
      <div className="profile-content">
        {/* Left Column - Avatar & Basic Info */}
        <div className="profile-left">
          <div className="avatar-section">
            <div className="profile-avatar">
              {avatar ? (
                // Show preview first (immediate feedback)
                <img src={avatar} alt="avatar" />
              ) : authUser?.avatar ? (
                // Then show authUser avatar (from context, updated immediately)
                <img
                  src={authUser.avatar}
                  alt="avatar"
                  key={authUser.avatar} // Force re-render when avatar changes
                  onError={(e) => {
                    console.log("Avatar failed to load, using fallback");
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML =
                      profile?.name?.charAt(0)?.toUpperCase() || "U";
                  }}
                />
              ) : profile?.avatar ? (
                // Fallback to profile data
                <img
                  src={`http://localhost:5000${profile.avatar}`}
                  alt="avatar"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML =
                      profile?.name?.charAt(0)?.toUpperCase() || "U";
                  }}
                />
              ) : (
                // Show initials as last resort
                profile?.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>
            <button
              type="button"
              className="avatar-upload"
              onClick={() => fileInputRef.current.click()}
            >
              <Camera size={16} />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarUpload}
            />
          </div>

          <div className="info-card">
            <h3>Manager Details</h3>
            <div className="info-item">
              <Briefcase size={16} />
              <div>
                <span className="info-label">Employee ID</span>
                <span className="info-value">
                  {profile?.employeeId || "N/A"}
                </span>
              </div>
            </div>
            <div className="info-item">
              <Shield size={16} />
              <div>
                <span className="info-label">Role</span>
                <span className="info-value role-badge manager">
                  {profile?.role || "Manager"}
                </span>
              </div>
            </div>
            <div className="info-item">
              <Users2 size={16} />
              <div>
                <span className="info-label">Department</span>
                <span className="info-value">
                  {profile?.managedDepartment?.name ||
                    profile?.department ||
                    "Not assigned"}
                </span>
              </div>
            </div>
            <div className="info-item">
              <Calendar size={16} />
              <div>
                <span className="info-label">Joined</span>
                <span className="info-value">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Manager Stats Cards */}
          <div className="info-card manager-stats">
            <h3>Team Overview</h3>
            <div className="stat-item">
              <Users size={20} className="stat-icon" />
              <div className="stat-details">
                <span className="stat-label">Team Size</span>
                <span className="stat-value">{getTeamSize()} members</span>
              </div>
            </div>
            <div className="stat-item">
              <FileText size={20} className="stat-icon" />
              <div className="stat-details">
                <span className="stat-label">Pending Requests</span>
                <span className="stat-value">{getPendingRequests()}</span>
              </div>
            </div>
            <div className="stat-item">
              <TrendingUp size={20} className="stat-icon" />
              <div className="stat-details">
                <span className="stat-label">Team Performance</span>
                <span className="stat-value">View Reports →</span>
              </div>
            </div>
          </div>

          <div className="info-card">
            <h3>Leave Balance</h3>
            <div className="balance-item">
              <span>Casual Leave</span>
              <span className="balance-value">
                {profile?.leaveBalance?.casual?.total || 0} days
              </span>
            </div>
            <div className="balance-item">
              <span>Sick Leave</span>
              <span className="balance-value">
                {profile?.leaveBalance?.sick?.total || 0} days
              </span>
            </div>
            <div className="balance-item">
              <span>Used</span>
              <span className="balance-value used">
                {(profile?.leaveBalance?.casual?.used || 0) +
                  (profile?.leaveBalance?.sick?.used || 0)}{" "}
                days
              </span>
            </div>
            <div className="balance-item total">
              <span>Remaining</span>
              <span className="balance-value remaining">
                {(profile?.leaveBalance?.casual?.total -
                  profile?.leaveBalance?.casual?.used || 0) +
                  (profile?.leaveBalance?.sick?.total -
                    profile?.leaveBalance?.sick?.used || 0)}{" "}
                days
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Edit Form or View Mode */}
        <div className="profile-right">
          {editMode ? (
            /* Edit Profile Form */
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-section">
                <h3>Personal Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="form-control"
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Blood Group</label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleInputChange}
                      className="form-control"
                    >
                      <option value="">Select</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Address</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Street Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter street address"
                    />
                  </div>
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Emergency Contact</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Contact Name</label>
                    <input
                      type="text"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input
                      type="tel"
                      name="emergencyPhone"
                      value={formData.emergencyPhone}
                      onChange={handleInputChange}
                      className="form-control"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Department Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      className="form-control"
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label>Designation</label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      className="form-control"
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </form>
          ) : passwordMode ? (
            /* Change Password Form */
            <form onSubmit={handlePasswordSubmit} className="profile-form">
              <div className="form-section">
                <h3>Change Password</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="form-control"
                      required
                      minLength="6"
                    />
                    <small className="form-text">Minimum 6 characters</small>
                  </div>
                  <div className="form-group full-width">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <Key size={16} />
                  Update Password
                </button>
              </div>
            </form>
          ) : (
            /* View Profile Mode */
            <div className="view-profile">
              <div className="info-card">
                <h3>Personal Information</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="label">Full Name</span>
                    <span className="value">{profile?.name}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Email</span>
                    <span className="value">{profile?.email}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Phone</span>
                    <span className="value">
                      {profile?.personalInfo?.phone || "Not provided"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Date of Birth</span>
                    <span className="value">
                      {profile?.personalInfo?.dateOfBirth
                        ? new Date(
                            profile.personalInfo.dateOfBirth,
                          ).toLocaleDateString()
                        : "Not provided"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Blood Group</span>
                    <span className="value">
                      {profile?.personalInfo?.bloodGroup || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h3>Address</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="label">Street</span>
                    <span className="value">
                      {profile?.address?.current?.street || "Not provided"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">City</span>
                    <span className="value">
                      {profile?.address?.current?.city || "Not provided"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">State</span>
                    <span className="value">
                      {profile?.address?.current?.state || "Not provided"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Pincode</span>
                    <span className="value">
                      {profile?.address?.current?.pincode || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h3>Emergency Contact</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="label">Name</span>
                    <span className="value">
                      {profile?.emergencyContact?.name || "Not provided"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Phone</span>
                    <span className="value">
                      {profile?.emergencyContact?.phone || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-card">
                <h3>Employment Details</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="label">Department</span>
                    <span className="value">
                      {profile?.managedDepartment?.name ||
                        profile?.employmentDetails?.department?.name ||
                        "Not assigned"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Designation</span>
                    <span className="value">
                      {profile?.employmentDetails?.designation ||
                        profile?.designation ||
                        "Not assigned"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Joining Date</span>
                    <span className="value">
                      {profile?.employmentDetails?.joiningDate
                        ? new Date(
                            profile.employmentDetails.joiningDate,
                          ).toLocaleDateString()
                        : "Not available"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Employment Type</span>
                    <span className="value employment-type">
                      {profile?.employmentDetails?.employmentType ||
                        "Not specified"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
