import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  Users,
  UserCheck,
  UserX,
  Wallet,
  Search,
  Filter,
  Power,
  Building2,
  LogOut,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    deactivatedUsers: 0,
    totalSystemBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/admin/users");
      const fetchedUsers = res.data.data || res.data.users || [];

      const normalizedUsers = fetchedUsers.map((u) => {
        const isActiveState = u.isActive !== undefined ? u.isActive : (u.isFrozen !== true);
        return {
          ...u,
          id: u._id || u.id,
          fullName: u.fullName || (u.email ? u.email.split("@")[0] : "User"),
          email: u.email || "",
          accountNumber: u.account?.accountNumber || u.accountNumber || "N/A",
          accountType: u.account?.accountType || u.accountType || "Savings Account",
          balance: u.account?.balance !== undefined ? u.account.balance : (u.balance || 0),
          isActive: isActiveState,
          role: u.role || "user",
        };
      });

      const totalUsers = normalizedUsers.length;
      const activeUsers = normalizedUsers.filter((u) => u.isActive !== false).length;
      const deactivatedUsers = totalUsers - activeUsers;
      const totalSystemBalance = normalizedUsers.reduce(
        (sum, u) => sum + (Number(u.balance) || 0),
        0
      );

      setUsersList(normalizedUsers);
      setStats({
        totalUsers,
        activeUsers,
        deactivatedUsers,
        totalSystemBalance,
      });
    } catch (err) {
      console.error("Admin fetch error:", err);
      const errMsg = err.response?.data?.message || "Failed to load admin data";
      setError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleStatus = async (targetUser) => {
    const targetId = targetUser._id || targetUser.id;
    const currentActive = targetUser.isActive !== false;
    const newStatus = !currentActive;

    setActionLoadingId(targetId);

    try {
      let res;
      try {
        res = await API.patch(`/admin/users/${targetId}/status`, { isActive: newStatus });
      } catch (patchErr) {
        res = await API.put(`/admin/users/${targetId}/status`, { isActive: newStatus });
      }

      setUsersList((prev) =>
        prev.map((u) =>
          (u._id || u.id) === targetId ? { ...u, isActive: newStatus } : u
        )
      );

      setStats((prev) => {
        const newActiveCount = newStatus ? prev.activeUsers + 1 : prev.activeUsers - 1;
        const newDeactivatedCount = newStatus ? prev.deactivatedUsers - 1 : prev.deactivatedUsers + 1;
        return {
          ...prev,
          activeUsers: Math.max(0, newActiveCount),
          deactivatedUsers: Math.max(0, newDeactivatedCount),
        };
      });

      const successMsg = res.data?.message || `Account ${newStatus ? "reactivated" : "deactivated"} successfully!`;
      showToast(successMsg, newStatus ? "success" : "warning");
    } catch (err) {
      console.error("Status update error:", err);
      const errMsg = err.response?.data?.message || "Failed to update user status";
      showToast(errMsg, "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const filteredUsers = usersList.filter((u) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      u.fullName?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.accountNumber?.toString().includes(term);

    const isUserActive = u.isActive !== false;
    let matchesStatus = true;
    if (statusFilter === "active") {
      matchesStatus = isUserActive === true;
    } else if (statusFilter === "deactivated") {
      matchesStatus = isUserActive === false;
    }

    let matchesRole = true;
    if (roleFilter !== "all") {
      matchesRole = u.role?.toLowerCase() === roleFilter.toLowerCase();
    }

    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800 relative">
      {/* Toast Notification Container */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 transition-all transform translate-y-0">
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === "warning" && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
          {toast.type === "error" && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                Account Management System
              </span>
              <span className="bg-blue-500/20 text-blue-400 text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border border-blue-400/20">
                ADMIN CONTROL
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white">
                {user?.name || user?.fullName || "System Admin"}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                ADMINISTRATOR
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              User Accounts Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              View all user balances, track account activities, and manage active/deactivated statuses.
            </p>
          </div>
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="self-start sm:self-auto flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-xs sm:text-sm rounded-xl font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">TOTAL USERS</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalUsers}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ACTIVE ACCOUNTS</p>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.activeUsers}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">DEACTIVATED</p>
              <h3 className="text-2xl font-extrabold text-rose-600 mt-1">{stats.deactivatedUsers}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
              <UserX className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">TOTAL SYSTEM BALANCE</p>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                ${stats.totalSystemBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, email, account no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="deactivated">Deactivated Only</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold">
              <span>Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="user">User (Customer)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">USER DETAILS</th>
                  <th className="px-6 py-3.5">ACCOUNT NUMBER</th>
                  <th className="px-6 py-3.5">ACCOUNT TYPE</th>
                  <th className="px-6 py-3.5">BALANCE</th>
                  <th className="px-6 py-3.5">ROLE</th>
                  <th className="px-6 py-3.5">STATUS</th>
                  <th className="px-6 py-3.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const userId = u._id || u.id;
                    const isTargetLoading = actionLoadingId === userId;
                    const isAdminUser = u.role === "admin";
                    const isUserActive = u.isActive !== false;

                    return (
                      <tr key={userId} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 text-sm">
                            {u.fullName || (u.email ? u.email.split("@")[0] : "User")}
                          </div>
                          <div className="text-slate-400 font-medium text-[11px]">{u.email}</div>
                        </td>

                        <td className="px-6 py-4 font-mono font-bold text-slate-700">
                          {u.accountNumber || "N/A"}
                        </td>

                        <td className="px-6 py-4 font-medium text-slate-700">
                          {u.accountType || "Savings Account"}
                        </td>

                        <td className="px-6 py-4 font-extrabold text-slate-900">
                          ${Number(u.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase ${
                              isAdminUser
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {u.role || "user"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isUserActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isUserActive ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            <span>{isUserActive ? "Active" : "Deactivated"}</span>
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isTargetLoading || isAdminUser}
                            className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm border ${
                              isUserActive
                                ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200"
                            } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>
                              {isTargetLoading
                                ? "Updating..."
                                : isUserActive
                                ? "Deactivate"
                                : "Activate"}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}