import { useState } from "react";
import { 
  Save,
  RefreshCw,
  Bell,
  Shield,
  Building2,
  Calendar,
  Clock,
  XCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import "./Settings.css";

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // Company Settings
    company: {
      name: 'HRMS Pro',
      email: 'admin@hrms.com',
      phone: '+91 1234567890',
      address: 'Bangalore, India',
      website: 'https://hrms.com',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h'
    },
    
    // Leave Settings
    leave: {
      casualLeave: {
        enabled: true,
        total: 12,
        carryForward: true,
        maxCarryForward: 5,
        minDays: 1,
        maxDays: 30
      },
      sickLeave: {
        enabled: true,
        total: 10,
        carryForward: false,
        minDays: 1,
        maxDays: 15,
        requiresDocument: true
      },
      general: {
        maxTeamLeave: 2,
        allowHalfDay: true,
        allowFutureDates: 90,
        requireReason: true
      }
    },

    // Attendance Settings
    attendance: {
      workHours: {
        startTime: '09:00',
        endTime: '18:00',
        gracePeriod: 15,
        breakDuration: 60,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      },
      
      overtime: {
        enabled: true,
        rate: 1.5,
        minOvertime: 30,
        requiresApproval: true
      },
      
      holidays: [
        { name: 'Republic Day', date: '2024-01-26', type: 'national' },
        { name: 'Independence Day', date: '2024-08-15', type: 'national' }
      ]
    },

    // Notification Settings
    notifications: {
      email: {
        enabled: true,
        leaveApplied: true,
        leaveApproved: true,
        leaveRejected: true,
        documentVerified: true
      }
    },

    // Security Settings
    security: {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expiryDays: 90,
        preventReuse: 5,
        lockoutAttempts: 5
      },
      
      session: {
        timeout: 30,
        maxConcurrent: 3,
        rememberMe: true,
        rememberMeDays: 30
      },
      
      twoFactor: {
        enabled: false,
        method: 'email',
        requiredForAdmins: true
      }
    }
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      showMessage("success", "Settings saved successfully!");
    } catch (error) {
      showMessage("error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all settings?")) {
      showMessage("success", "Settings reset to defaults");
    }
  };

  const renderGeneralSettings = () => (
    <div className="settings-section">
      <h3>Company Information</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label>Company Name</label>
          <input
            type="text"
            value={settings.company.name}
            onChange={(e) => setSettings({
              ...settings,
              company: { ...settings.company, name: e.target.value }
            })}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Company Email</label>
          <input
            type="email"
            value={settings.company.email}
            onChange={(e) => setSettings({
              ...settings,
              company: { ...settings.company, email: e.target.value }
            })}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Company Phone</label>
          <input
            type="tel"
            value={settings.company.phone}
            onChange={(e) => setSettings({
              ...settings,
              company: { ...settings.company, phone: e.target.value }
            })}
            className="form-control"
          />
        </div>

        <div className="form-group full-width">
          <label>Address</label>
          <textarea
            value={settings.company.address}
            onChange={(e) => setSettings({
              ...settings,
              company: { ...settings.company, address: e.target.value }
            })}
            className="form-control"
            rows="2"
          />
        </div>

        <div className="form-group">
          <label>Website</label>
          <input
            type="url"
            value={settings.company.website}
            onChange={(e) => setSettings({
              ...settings,
              company: { ...settings.company, website: e.target.value }
            })}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Timezone</label>
          <select
            value={settings.company.timezone}
            onChange={(e) => setSettings({
              ...settings,
              company: { ...settings.company, timezone: e.target.value }
            })}
            className="form-control"
          >
            <option value="Asia/Kolkata">India (IST)</option>
            <option value="Asia/Dubai">UAE (GST)</option>
            <option value="Asia/Singapore">Singapore (SGT)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Date Format</label>
          <select
            value={settings.company.dateFormat}
            onChange={(e) => setSettings({
              ...settings,
              company: { ...settings.company, dateFormat: e.target.value }
            })}
            className="form-control"
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div className="form-group">
          <label>Time Format</label>
          <select
            value={settings.company.timeFormat}
            onChange={(e) => setSettings({
              ...settings,
              company: { ...settings.company, timeFormat: e.target.value }
            })}
            className="form-control"
          >
            <option value="12h">12 Hour</option>
            <option value="24h">24 Hour</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderLeaveSettings = () => (
    <div className="settings-section">
      <h3>Leave Configuration</h3>
      
      {/* Casual Leave */}
      <div className="setting-card">
        <div className="setting-header">
          <h4>Casual Leave</h4>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.leave.casualLeave.enabled}
              onChange={(e) => setSettings({
                ...settings,
                leave: {
                  ...settings.leave,
                  casualLeave: { ...settings.leave.casualLeave, enabled: e.target.checked }
                }
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        {settings.leave.casualLeave.enabled && (
          <div className="setting-grid">
            <div className="form-group">
              <label>Total Days</label>
              <input
                type="number"
                value={settings.leave.casualLeave.total}
                onChange={(e) => setSettings({
                  ...settings,
                  leave: {
                    ...settings.leave,
                    casualLeave: { ...settings.leave.casualLeave, total: parseInt(e.target.value) }
                  }
                })}
                className="form-control"
                min="0"
                max="365"
              />
            </div>

            <div className="form-group">
              <label>Carry Forward</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.leave.casualLeave.carryForward}
                    onChange={(e) => setSettings({
                      ...settings,
                      leave: {
                        ...settings.leave,
                        casualLeave: { ...settings.leave.casualLeave, carryForward: e.target.checked }
                      }
                    })}
                  />
                  Allow carry forward
                </label>
              </div>
            </div>

            {settings.leave.casualLeave.carryForward && (
              <div className="form-group">
                <label>Max Carry Forward</label>
                <input
                  type="number"
                  value={settings.leave.casualLeave.maxCarryForward}
                  onChange={(e) => setSettings({
                    ...settings,
                    leave: {
                      ...settings.leave,
                      casualLeave: { ...settings.leave.casualLeave, maxCarryForward: parseInt(e.target.value) }
                    }
                  })}
                  className="form-control"
                  min="0"
                  max="365"
                />
              </div>
            )}

            <div className="form-group">
              <label>Min Days</label>
              <input
                type="number"
                value={settings.leave.casualLeave.minDays}
                onChange={(e) => setSettings({
                  ...settings,
                  leave: {
                    ...settings.leave,
                    casualLeave: { ...settings.leave.casualLeave, minDays: parseInt(e.target.value) }
                  }
                })}
                className="form-control"
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Max Days</label>
              <input
                type="number"
                value={settings.leave.casualLeave.maxDays}
                onChange={(e) => setSettings({
                  ...settings,
                  leave: {
                    ...settings.leave,
                    casualLeave: { ...settings.leave.casualLeave, maxDays: parseInt(e.target.value) }
                  }
                })}
                className="form-control"
                min="1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Sick Leave */}
      <div className="setting-card">
        <div className="setting-header">
          <h4>Sick Leave</h4>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.leave.sickLeave.enabled}
              onChange={(e) => setSettings({
                ...settings,
                leave: {
                  ...settings.leave,
                  sickLeave: { ...settings.leave.sickLeave, enabled: e.target.checked }
                }
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        {settings.leave.sickLeave.enabled && (
          <div className="setting-grid">
            <div className="form-group">
              <label>Total Days</label>
              <input
                type="number"
                value={settings.leave.sickLeave.total}
                onChange={(e) => setSettings({
                  ...settings,
                  leave: {
                    ...settings.leave,
                    sickLeave: { ...settings.leave.sickLeave, total: parseInt(e.target.value) }
                  }
                })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.leave.sickLeave.requiresDocument}
                  onChange={(e) => setSettings({
                    ...settings,
                    leave: {
                      ...settings.leave,
                      sickLeave: { ...settings.leave.sickLeave, requiresDocument: e.target.checked }
                    }
                  })}
                />
                Medical certificate required
              </label>
            </div>

            <div className="form-group">
              <label>Min Days</label>
              <input
                type="number"
                value={settings.leave.sickLeave.minDays}
                onChange={(e) => setSettings({
                  ...settings,
                  leave: {
                    ...settings.leave,
                    sickLeave: { ...settings.leave.sickLeave, minDays: parseInt(e.target.value) }
                  }
                })}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label>Max Days</label>
              <input
                type="number"
                value={settings.leave.sickLeave.maxDays}
                onChange={(e) => setSettings({
                  ...settings,
                  leave: {
                    ...settings.leave,
                    sickLeave: { ...settings.leave.sickLeave, maxDays: parseInt(e.target.value) }
                  }
                })}
                className="form-control"
              />
            </div>
          </div>
        )}
      </div>

      {/* General Leave Settings */}
      <div className="setting-card">
        <h4>General Leave Settings</h4>
        <div className="setting-grid">
          <div className="form-group">
            <label>Max Team Leave</label>
            <input
              type="number"
              value={settings.leave.general.maxTeamLeave}
              onChange={(e) => setSettings({
                ...settings,
                leave: {
                  ...settings.leave,
                  general: { ...settings.leave.general, maxTeamLeave: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="1"
              max="10"
            />
            <small>Maximum team members on leave simultaneously</small>
          </div>

          <div className="form-group">
            <label>Future Days Allowed</label>
            <input
              type="number"
              value={settings.leave.general.allowFutureDates}
              onChange={(e) => setSettings({
                ...settings,
                leave: {
                  ...settings.leave,
                  general: { ...settings.leave.general, allowFutureDates: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="0"
              max="365"
            />
            <small>Days in advance leaves can be applied</small>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.leave.general.allowHalfDay}
                onChange={(e) => setSettings({
                  ...settings,
                  leave: {
                    ...settings.leave,
                    general: { ...settings.leave.general, allowHalfDay: e.target.checked }
                  }
                })}
              />
              Allow Half Day Leave
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.leave.general.requireReason}
                onChange={(e) => setSettings({
                  ...settings,
                  leave: {
                    ...settings.leave,
                    general: { ...settings.leave.general, requireReason: e.target.checked }
                  }
                })}
              />
              Require Reason
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttendanceSettings = () => (
    <div className="settings-section">
      <h3>Attendance Configuration</h3>
      
      <div className="setting-card">
        <h4>Work Hours</h4>
        <div className="setting-grid">
          <div className="form-group">
            <label>Start Time</label>
            <input
              type="time"
              value={settings.attendance.workHours.startTime}
              onChange={(e) => setSettings({
                ...settings,
                attendance: {
                  ...settings.attendance,
                  workHours: { ...settings.attendance.workHours, startTime: e.target.value }
                }
              })}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>End Time</label>
            <input
              type="time"
              value={settings.attendance.workHours.endTime}
              onChange={(e) => setSettings({
                ...settings,
                attendance: {
                  ...settings.attendance,
                  workHours: { ...settings.attendance.workHours, endTime: e.target.value }
                }
              })}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Grace Period (minutes)</label>
            <input
              type="number"
              value={settings.attendance.workHours.gracePeriod}
              onChange={(e) => setSettings({
                ...settings,
                attendance: {
                  ...settings.attendance,
                  workHours: { ...settings.attendance.workHours, gracePeriod: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="0"
              max="60"
            />
          </div>

          <div className="form-group">
            <label>Break Duration (minutes)</label>
            <input
              type="number"
              value={settings.attendance.workHours.breakDuration}
              onChange={(e) => setSettings({
                ...settings,
                attendance: {
                  ...settings.attendance,
                  workHours: { ...settings.attendance.workHours, breakDuration: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="0"
              max="120"
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label>Working Days</label>
          <div className="days-grid">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <label key={day} className="day-checkbox">
                <input
                  type="checkbox"
                  checked={settings.attendance.workHours.workingDays.includes(day)}
                  onChange={(e) => {
                    const days = e.target.checked
                      ? [...settings.attendance.workHours.workingDays, day]
                      : settings.attendance.workHours.workingDays.filter(d => d !== day);
                    setSettings({
                      ...settings,
                      attendance: {
                        ...settings.attendance,
                        workHours: { ...settings.attendance.workHours, workingDays: days }
                      }
                    });
                  }}
                />
                {day.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="setting-card">
        <h4>Overtime Settings</h4>
        <div className="setting-grid">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.attendance.overtime.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  attendance: {
                    ...settings.attendance,
                    overtime: { ...settings.attendance.overtime, enabled: e.target.checked }
                  }
                })}
              />
              Enable Overtime
            </label>
          </div>

          {settings.attendance.overtime.enabled && (
            <>
              <div className="form-group">
                <label>Overtime Rate (x)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.attendance.overtime.rate}
                  onChange={(e) => setSettings({
                    ...settings,
                    attendance: {
                      ...settings.attendance,
                      overtime: { ...settings.attendance.overtime, rate: parseFloat(e.target.value) }
                    }
                  })}
                  className="form-control"
                  min="1"
                  max="3"
                />
              </div>

              <div className="form-group">
                <label>Min Overtime (minutes)</label>
                <input
                  type="number"
                  value={settings.attendance.overtime.minOvertime}
                  onChange={(e) => setSettings({
                    ...settings,
                    attendance: {
                      ...settings.attendance,
                      overtime: { ...settings.attendance.overtime, minOvertime: parseInt(e.target.value) }
                    }
                  })}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.attendance.overtime.requiresApproval}
                    onChange={(e) => setSettings({
                      ...settings,
                      attendance: {
                        ...settings.attendance,
                        overtime: { ...settings.attendance.overtime, requiresApproval: e.target.checked }
                      }
                    })}
                  />
                  Require Approval
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="setting-card">
        <h4>Holidays</h4>
        <div className="holidays-list">
          {settings.attendance.holidays.map((holiday, index) => (
            <div key={index} className="holiday-item">
              <div className="holiday-info">
                <strong>{holiday.name}</strong>
                <span>{new Date(holiday.date).toLocaleDateString()}</span>
                <span className="holiday-type">{holiday.type}</span>
              </div>
              <button className="btn-icon btn-icon-danger">
                <XCircle size={16} />
              </button>
            </div>
          ))}
          <button className="btn btn-outline btn-block">
            <Calendar size={16} />
            Add Holiday
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="settings-section">
      <h3>Notification Preferences</h3>
      
      <div className="setting-card">
        <div className="setting-header">
          <h4>Email Notifications</h4>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.notifications.email.enabled}
              onChange={(e) => setSettings({
                ...settings,
                notifications: {
                  ...settings.notifications,
                  email: { ...settings.notifications.email, enabled: e.target.checked }
                }
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.notifications.email.enabled && (
          <div className="notifications-grid">
            {Object.entries(settings.notifications.email)
              .filter(([key]) => key !== 'enabled')
              .map(([key, value]) => (
                <label key={key} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        email: { ...settings.notifications.email, [key]: e.target.checked }
                      }
                    })}
                  />
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="settings-section">
      <h3>Security Settings</h3>
      
      <div className="setting-card">
        <h4>Password Policy</h4>
        <div className="setting-grid">
          <div className="form-group">
            <label>Minimum Length</label>
            <input
              type="number"
              value={settings.security.passwordPolicy.minLength}
              onChange={(e) => setSettings({
                ...settings,
                security: {
                  ...settings.security,
                  passwordPolicy: { ...settings.security.passwordPolicy, minLength: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="6"
              max="20"
            />
          </div>

          <div className="form-group">
            <label>Expiry Days</label>
            <input
              type="number"
              value={settings.security.passwordPolicy.expiryDays}
              onChange={(e) => setSettings({
                ...settings,
                security: {
                  ...settings.security,
                  passwordPolicy: { ...settings.security.passwordPolicy, expiryDays: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="0"
              max="365"
            />
            <small>0 = never expires</small>
          </div>

          <div className="form-group">
            <label>Prevent Reuse</label>
            <input
              type="number"
              value={settings.security.passwordPolicy.preventReuse}
              onChange={(e) => setSettings({
                ...settings,
                security: {
                  ...settings.security,
                  passwordPolicy: { ...settings.security.passwordPolicy, preventReuse: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="0"
              max="10"
            />
          </div>

          <div className="form-group">
            <label>Lockout Attempts</label>
            <input
              type="number"
              value={settings.security.passwordPolicy.lockoutAttempts}
              onChange={(e) => setSettings({
                ...settings,
                security: {
                  ...settings.security,
                  passwordPolicy: { ...settings.security.passwordPolicy, lockoutAttempts: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="3"
              max="10"
            />
          </div>

          <div className="form-group full-width">
            <div className="checkbox-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.security.passwordPolicy.requireUppercase}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      passwordPolicy: { ...settings.security.passwordPolicy, requireUppercase: e.target.checked }
                    }
                  })}
                />
                Require Uppercase
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.security.passwordPolicy.requireLowercase}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      passwordPolicy: { ...settings.security.passwordPolicy, requireLowercase: e.target.checked }
                    }
                  })}
                />
                Require Lowercase
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.security.passwordPolicy.requireNumbers}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      passwordPolicy: { ...settings.security.passwordPolicy, requireNumbers: e.target.checked }
                    }
                  })}
                />
                Require Numbers
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.security.passwordPolicy.requireSpecialChars}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      passwordPolicy: { ...settings.security.passwordPolicy, requireSpecialChars: e.target.checked }
                    }
                  })}
                />
                Require Special Characters
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="setting-card">
        <h4>Session Settings</h4>
        <div className="setting-grid">
          <div className="form-group">
            <label>Session Timeout (minutes)</label>
            <input
              type="number"
              value={settings.security.session.timeout}
              onChange={(e) => setSettings({
                ...settings,
                security: {
                  ...settings.security,
                  session: { ...settings.security.session, timeout: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="5"
              max="120"
            />
          </div>

          <div className="form-group">
            <label>Max Concurrent Sessions</label>
            <input
              type="number"
              value={settings.security.session.maxConcurrent}
              onChange={(e) => setSettings({
                ...settings,
                security: {
                  ...settings.security,
                  session: { ...settings.security.session, maxConcurrent: parseInt(e.target.value) }
                }
              })}
              className="form-control"
              min="1"
              max="10"
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.security.session.rememberMe}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    session: { ...settings.security.session, rememberMe: e.target.checked }
                  }
                })}
              />
              Allow Remember Me
            </label>
          </div>

          {settings.security.session.rememberMe && (
            <div className="form-group">
              <label>Remember Me Days</label>
              <input
                type="number"
                value={settings.security.session.rememberMeDays}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    session: { ...settings.security.session, rememberMeDays: parseInt(e.target.value) }
                  }
                })}
                className="form-control"
                min="1"
                max="30"
              />
            </div>
          )}
        </div>
      </div>

      <div className="setting-card">
        <div className="setting-header">
          <h4>Two-Factor Authentication</h4>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.security.twoFactor.enabled}
              onChange={(e) => setSettings({
                ...settings,
                security: {
                  ...settings.security,
                  twoFactor: { ...settings.security.twoFactor, enabled: e.target.checked }
                }
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.security.twoFactor.enabled && (
          <div className="setting-grid">
            <div className="form-group">
              <label>Method</label>
              <select
                value={settings.security.twoFactor.method}
                onChange={(e) => setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    twoFactor: { ...settings.security.twoFactor, method: e.target.value }
                  }
                })}
                className="form-control"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="authenticator">Authenticator App</option>
              </select>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={settings.security.twoFactor.requiredForAdmins}
                  onChange={(e) => setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      twoFactor: { ...settings.security.twoFactor, requiredForAdmins: e.target.checked }
                    }
                  })}
                />
                Required for Admins
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure your HRMS preferences</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={handleReset}
          >
            <RefreshCw size={16} />
            Reset
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`message message-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Settings Tabs */}
      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <Building2 size={18} />
          General
        </button>
        <button
          className={`tab-btn ${activeTab === 'leave' ? 'active' : ''}`}
          onClick={() => setActiveTab('leave')}
        >
          <Calendar size={18} />
          Leave
        </button>
        <button
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Clock size={18} />
          Attendance
        </button>
        <button
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={18} />
          Notifications
        </button>
        <button
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Shield size={18} />
          Security
        </button>
      </div>

      {/* Settings Content */}
      <div className="settings-content">
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'leave' && renderLeaveSettings()}
        {activeTab === 'attendance' && renderAttendanceSettings()}
        {activeTab === 'notifications' && renderNotificationSettings()}
        {activeTab === 'security' && renderSecuritySettings()}
      </div>
    </div>
  );
}