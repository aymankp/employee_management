import { useEffect, useState } from "react";
import api from "../../services/api";
import socket from "../../socket";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import Widget from "../../components/Dashboard/Widget";
import SkeletonCard from "../../components/Dashboard/SkeletonCard";

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
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [managerOnline, setManagerOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  const managerId = user?.manager;

  // ------------------------
  // Fetch Data
  // ------------------------

  const fetchLeaves = async () => {
    const res = await api.get("/leave/my");
    setLeaves(res.data);
  };

  const fetchBalance = async () => {
    const res = await api.get("/auth/me");
    setBalance(res.data.leaveBalance);
  };

  const fetchManagerStatus = async () => {
    if (!managerId) return;
    const res = await api.get(`/status/${managerId}`);
    setManagerOnline(res.data.online);
    setLastSeen(res.data.lastSeen);
  };
  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchLeaves(), fetchBalance(), fetchManagerStatus()]);
      setLoading(false);
    };
    load();
  }, []);

  // ------------------------
  // Socket realtime manager status
  // ------------------------

  useEffect(() => {
    if (!managerId) return;

    socket.connect();

    socket.on("status-update", (data) => {
      if (String(data.userId) === String(managerId)) {
        setManagerOnline(data.online);
        setLastSeen(data.lastSeen);
      }
    });

    return () => {
      socket.off("status-update");
      socket.disconnect();
    };
  }, [managerId]);

  // ------------------------
  // Chart
  // ------------------------

  const casualUsed = balance ? balance.casual?.used || 0 : 0;

  const sickUsed = balance ? balance.sick?.used || 0 : 0;

  const chartData = {
    labels: ["Casual", "Sick"],
    datasets: [
      {
        label: "Leave Used",
        data: [casualUsed, sickUsed],
        backgroundColor: ["#3b82f6", "#ef4444"],
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
  };

  // ------------------------
  // Helpers
  // ------------------------

  const formatDate = (d) => new Date(d).toLocaleDateString();

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

  const words = ["Innovative", "Productive", "Focused", "Consistent", "Building"];

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
      {/* Header */}
      <div className="dashboard-header motivation-header">
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
            {balance && (
              <Widget
                icon={<Calendar size={22} />}
                title="Leave Balance"
                value={
                  (balance.casual?.total || 0) + (balance.sick?.total || 0)
                }
                subtitle="Days remaining"
              />
            )}

            <Widget
              icon={<FileText size={22} />}
              title="Total Leaves"
              value={leaves.length}
              subtitle="This year"
            />

            <Widget
              icon={<Users size={22} />}
              title="Manager Status"
              value={
                managerOnline ? (
                  <span className="status-online">● Online</span>
                ) : (
                  <span className="status-offline">● Offline</span>
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
          <Bar data={chartData} options={chartOptions} />
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
