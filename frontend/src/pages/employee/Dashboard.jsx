import { useEffect, useState } from "react";
import api from "../../services/api";
import socket from "../../socket";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";
import Widget from "../../components/Dashboard/Widget";
import SkeletonCard from "../../components/Dashboard/SkeletonCard";
import { getProfile } from "../../services/api";
import { useMemo } from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

import { Bar } from "react-chartjs-2";

import {
  Calendar,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [managerOnline, setManagerOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);
  const [error, setError] = useState(null);
  const managerId = user?.manager;

  // ------------------------
  // Fetch Data
  // ------------------------

  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leave/my");
      setLeaves(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to load leaves");
    }
  };
 const fetchBalance = async () => {
  try {
    const res = await getProfile();
    setBalance(res.data.leaveBalance);
  } catch (err) {
    setError("Failed to load leave balance");
  }
};

  const fetchManagerStatus = async () => {
  if (!managerId) return;

  try {
    const res = await api.get(`/status/${managerId}`);
    setManagerOnline(res.data.online);
    setLastSeen(res.data.lastSeen);
  } catch (err) {
    console.error("Manager status fetch failed");
  }
};


  useEffect(() => {
    if (!user) return;

    const load = async () => {
      await Promise.allSettled([
        fetchLeaves(),
        fetchBalance(),
        fetchManagerStatus(),
      ]);
      setLoading(false);
    };

    load();
  }, [user]);

  // ------------------------
  // Socket realtime manager status
  // ------------------------
useEffect(() => {
  if (!managerId) return;

  const handler = (data) => {
    if (String(data.userId) === String(managerId)) {
      setManagerOnline(data.online);
      setLastSeen(data.lastSeen);
    }
  };

  socket.on("status-update", handler);

  return () => {
    socket.off("status-update", handler);
  };
}, [managerId]);

  // ------------------------
  // Chart
  // ------------------------

  const casualUsed = balance ? balance.casual?.used || 0 : 0;
  const casualTotal = balance ? balance.casual?.total || 0 : 0;

  const sickUsed = balance ? balance.sick?.used || 0 : 0;
  const sickTotal = balance ? balance.sick?.total || 0 : 0;

  const emergencyUsed = balance ? balance.emergency?.used || 0 : 0;
  const emergencyTotal = balance ? balance.emergency?.total || 0 : 0;

  const otherUsed = balance ? balance.other?.used || 0 : 0;
  const otherTotal = balance ? balance.other?.total || 0 : 0;

  const casualRemaining = casualTotal - casualUsed;
  const sickRemaining = sickTotal - sickUsed;
  const emergencyRemaining = emergencyTotal - emergencyUsed;
  const otherRemaining = otherTotal - otherUsed;

 const totalRemaining = Math.max(
  casualRemaining + sickRemaining + emergencyRemaining + otherRemaining,
  0
);

  const chartData = useMemo(
    () => ({
      labels: ["Casual", "Sick", "Emergency", "Other"],
      datasets: [
        {
          label: "Used",
          data: [casualUsed, sickUsed, emergencyUsed, otherUsed],
          backgroundColor: "#ef4444",
          borderRadius: 6,
          stack: "leave",
        },
        {
          label: "Remaining",
          data: [
            casualRemaining,
            sickRemaining,
            emergencyRemaining,
            otherRemaining,
          ],
          backgroundColor: "#10b981",
          borderRadius: 6,
          stack: "leave",
        },
      ],
    }),
    [
      casualUsed,
      sickUsed,
      emergencyUsed,
      otherUsed,
      casualRemaining,
      sickRemaining,
      emergencyRemaining,
      otherRemaining,
    ],
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        position: "top",
      },
    },

    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };
  // ------------------------
  // Helpers
  // ------------------------

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN");

  const formatLastSeen = (t) => {
    if (!t) return "Unknown";
    const date = new Date(t);
    return date.toLocaleString();
  };

  const getStatus = (status) => {
    if (status === "approved")
      return (
        <span className="badge badge-success">
          <CheckCircle size={12} /> Approved
        </span>
      );

    if (status === "rejected")
      return (
        <span className="badge badge-danger">
          <XCircle size={12} /> Rejected
        </span>
      );

    return (
      <span className="badge badge-warning">
        <AlertCircle size={12} /> Pending
      </span>
    );
  };

  const words = [
    "Innovative",
    "Productive",
    "Focused",
    "Consistent",
    "Building",
  ];

  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const word = words[wordIndex];

  // ------------------------
  // Dashboard UI
  // ------------------------

  return (
    <div className="employee-dashboard">
      {error && <div className="error-banner">{error}</div>}
      {/* Header */}
      <div className="dashboard-header">
        <div className="motivation-wrapper">
          <span className="motivation-label">Today you are</span>
          <span className="motivation-text">{word}</span>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="stats-grid">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {balance && ( // ← Leave Balance Card
              <Widget
                icon={<Calendar size={22} />}
                title="Leave Balance"
                value={totalRemaining}
                subtitle="Total days remaining"
              />
            )}

            <Widget
              icon={<FileText size={22} />}
              title="Total Leaves"
              value={leaves.length}
              subtitle="Applied this year"
            />

            <Widget
              icon={<Users size={22} />}
              title="Manager Status"
              value={
                managerOnline ? (
                  <span className="status-online">
                    <span className="dot1"></span> Online
                  </span>
                ) : (
                  <span className="status-offline">
                    <span className="dot2"></span> Offline
                  </span>
                )
              }
              subtitle={lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : ""}
            />
          </>
        )}
      </div>
      {/* Analytics */}
      <div className="card">
        <div className="card-header">
          <h3>Leave Usage</h3>
        </div>

        <div className="card-body chart-container">
          {loading ? (
            <div className="skeleton-chart">
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
            </div>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </div>
      {/* Recent Leaves */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Leaves</h3>
        </div>

        <div className="card-body">
          {leaves.length === 0 ? (
            <p>No leaves applied yet.</p>
          ) : (
            <table className="recent-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {leaves.slice(0, 5).map((leave) => (
                  <tr key={leave._id}>
                    <td>{formatDate(leave.fromDate)}</td>
                    <td>{formatDate(leave.toDate)}</td>
                    <td className="leave-type">{leave.leaveType}</td>
                    <td>{getStatus(leave.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
