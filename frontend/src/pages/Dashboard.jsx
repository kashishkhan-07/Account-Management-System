import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Copy,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Check
} from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // --- Dark / Light Theme State ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'my-account' | 'transactions' | 'profile'
  const [accountData, setAccountData] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalType, setModalType] = useState(null);
  const [amount, setAmount] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [description, setDescription] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [copied, setCopied] = useState(false);

  // Filtering & Pagination for Transactions Tab
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 6;

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || user?.name || "",
    email: user?.email || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3500);
  };

  const fetchBalance = async () => {
    try {
      let res;
      try {
        res = await API.get("/account/balance");
      } catch (err) {
        res = await API.get("/accounts/balance");
      }
      const data = res.data.data || res.data;
      setAccountData(data);
      setBalance(data.balance !== undefined ? data.balance : res.data.balance || 0);
    } catch (err) {
      console.error("Fetch balance error:", err);
    }
  };

  const fetchTransactions = async () => {
    try {
      let res;
      try {
        res = await API.get("/transactions");
      } catch (err) {
        res = await API.get("/transaction");
      }
      const list = res.data.data || res.data.transactions || [];
      setTransactions(list);
    } catch (err) {
      console.error("Fetch transactions error:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchBalance(), fetchTransactions()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || user.name || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleAction = async (e) => {
    e.preventDefault();
    setModalError("");
    setModalLoading(true);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setModalError("Please enter a valid amount greater than ₹0");
      setModalLoading(false);
      return;
    }

    try {
      const endpoint = modalType;
      const payload = {
        amount: numAmount,
        description,
        ...(modalType === "transfer" && { receiverAccountNumber: recipientAccountNumber }),
      };

      let res;
      try {
        res = await API.post(`/account/${endpoint}`, payload);
      } catch (err) {
        res = await API.post(`/accounts/${endpoint}`, payload);
      }

      const newBal = res.data.balance !== undefined ? res.data.balance : res.data.data?.newBalance || res.data.data?.remainingBalance;
      if (newBal !== undefined) {
        setBalance(newBal);
      }

      showToast(res.data.message || `Successfully processed ${modalType}!`, "success");
      setModalType(null);
      setAmount("");
      setRecipientAccountNumber("");
      setDescription("");

      fetchBalance();
      fetchTransactions();
    } catch (err) {
      console.error("Modal action error:", err);
      setModalError(err.response?.data?.message || `Failed to process ${modalType}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await API.put("/users/profile", profileForm);
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const copyAccountNumber = () => {
    if (accountData?.accountNumber) {
      navigator.clipboard.writeText(accountData.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Account number copied to clipboard!", "success");
    }
  };

  // Calculations
  const accountNo = accountData?.accountNumber || "";
  const totalInflow = transactions
    .filter((t) => t.type === "deposit" || (t.type === "transfer" && t.receiverAccount === accountNo))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalOutflow = transactions
    .filter((t) => t.type === "withdrawal" || (t.type === "transfer" && t.senderAccount === accountNo))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const grandTotal = totalInflow + totalOutflow;
  const inflowPercent = grandTotal > 0 ? Math.round((totalInflow / grandTotal) * 100) : 75;
  const outflowPercent = 100 - inflowPercent;

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const userName = user?.fullName || user?.name || "Vani Verma";
  const userInitial = userName.charAt(0).toUpperCase();

  // Filtering & Pagination for Transactions Tab
  const filteredTransactions = transactions.filter((t) => {
    const matchesType = filterType === "all" || t.type === filterType;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      t.description?.toLowerCase().includes(term) ||
      t.type?.toLowerCase().includes(term) ||
      t.amount?.toString().includes(term);

    return matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTransactions.length / limit) || 1;
  const paginatedTransactions = filteredTransactions.slice((page - 1) * limit, page * limit);

  return (
    <div className={`min-h-screen flex font-sans antialiased transition-colors duration-300 ${
      isDarkMode ? "bg-[#0b132b] text-slate-100" : "bg-[#f4f6fc] text-slate-800"
    }`}>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700">
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Left Sidebar Navigation */}
      <aside className="w-64 bg-[#0a1427] text-slate-300 flex flex-col justify-between p-6 shrink-0 min-h-screen sticky top-0 h-screen border-r border-slate-800">
        <div className="space-y-8">
          {/* Logo Header */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Account</h2>
              <p className="text-[11px] text-blue-400 font-semibold tracking-wide">Management System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#1b63ff] text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("my-account")}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "my-account"
                  ? "bg-[#1b63ff] text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>My Account</span>
            </button>

            <button
              onClick={() => setActiveTab("transactions")}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "transactions"
                  ? "bg-[#1b63ff] text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Transactions</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === "profile"
                  ? "bg-[#1b63ff] text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Profile</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer - Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-rose-400 text-xs font-bold transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Bar */}
        <header className={`px-8 py-4 flex items-center justify-between sticky top-0 z-30 border-b transition-colors ${
          isDarkMode ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200/80 text-slate-900"
        }`}>
          <h1 className="text-lg font-bold capitalize">
            {activeTab.replace("-", " ")}
          </h1>

          <div className="flex items-center space-x-5">
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
              {todayDateStr}
            </span>

            {/* --- FUNCTIONAL THEME TOGGLE BUTTON --- */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition cursor-pointer ${
                isDarkMode ? "text-amber-400 hover:bg-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className={`flex items-center space-x-2.5 pl-2 border-l ${
              isDarkMode ? "border-slate-800" : "border-slate-200"
            }`}>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md">
                {userInitial}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold">{userName}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">{user?.role || "User"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Main Body per Selected Tab */}
        <main className="p-8 space-y-8 flex-1 overflow-y-auto">

          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              {/* Greeting Banner */}
              <div>
                <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}>
                  Good Afternoon, {userName}!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Here's what's happening with your account today.
                </p>
              </div>

              {/* Row 1: Debit Card & Quick Action Buttons */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                {/* --- EXACT BLUE-PURPLE GRADIENT DEBIT CARD (MATCHING PICTURE 1-TO-1) --- */}
                <div className="lg:col-span-7 bg-gradient-to-br from-[#2952ee] via-[#385fff] to-[#6d30ed] rounded-3xl p-7 text-white shadow-xl flex flex-col justify-between relative overflow-hidden min-h-[220px]">

                  {/* Glossy Diagonal Light Band Across Card */}
                  <div className="absolute top-0 right-1/4 w-32 h-[300px] bg-gradient-to-b from-white/20 via-white/10 to-transparent transform rotate-[30deg] pointer-events-none" />

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold tracking-wider uppercase leading-none">AURABANK</h4>
                        <span className="text-[9px] text-blue-200 font-bold uppercase tracking-widest">PLATINUM DIGITAL</span>
                      </div>
                    </div>

                    <div className="w-10 h-7 rounded-md bg-amber-400 border border-amber-300 shadow-inner flex items-center justify-center">
                      <div className="w-6 h-4 border border-amber-600/40 rounded-sm" />
                    </div>
                  </div>

                  <div className="my-5 relative z-10">
                    <span className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest">AVAILABLE BALANCE</span>
                    <h3 className="text-3xl sm:text-4xl font-black text-white mt-1 tracking-tight">
                      ₹ {Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-white/20 flex items-center justify-between text-xs relative z-10">
                    <div>
                      <span className="block text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">CARD HOLDER</span>
                      <span className="font-extrabold uppercase text-white tracking-wider">{userName}</span>
                    </div>

                    <div>
                      <span className="block text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">ACCOUNT NUMBER</span>
                      <span className="font-mono font-bold tracking-widest text-white">{accountNo || "3964626721"}</span>
                    </div>

                    <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">
                      ACTIVE
                    </span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className={`lg:col-span-5 rounded-3xl p-6 border shadow-sm flex items-center justify-around ${
                  isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200/80"
                }`}>
                  <button
                    onClick={() => { setModalType("deposit"); setModalError(""); }}
                    className="flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${
                      isDarkMode ? "bg-emerald-950/60 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                    }`}>
                      <ArrowDownLeft className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-extrabold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Deposit</span>
                  </button>

                  <button
                    onClick={() => { setModalType("withdraw"); setModalError(""); }}
                    className="flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${
                      isDarkMode ? "bg-rose-950/60 text-rose-400" : "bg-rose-50 text-rose-600"
                    }`}>
                      <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-extrabold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Withdraw</span>
                  </button>

                  <button
                    onClick={() => { setModalType("transfer"); setModalError(""); }}
                    className="flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${
                      isDarkMode ? "bg-purple-950/60 text-purple-400" : "bg-purple-50 text-purple-600"
                    }`}>
                      <Send className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-extrabold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Transfer</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Transaction Ratio Breakdown & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Transaction Ratio Breakdown */}
                <div className={`lg:col-span-5 rounded-3xl p-6 border shadow-sm space-y-6 ${
                  isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200/80"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-extrabold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Transaction Ratio Breakdown</h3>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Real-time Inflow vs Outflow Ratio</p>
                    </div>
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-xl border ${
                      isDarkMode ? "text-slate-300 bg-slate-800 border-slate-700" : "text-slate-600 bg-slate-100 border-slate-200"
                    }`}>
                      Last 30 Days
                    </span>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-rose-500"
                          strokeWidth="4"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-500 transition-all duration-700"
                          strokeDasharray={`${inflowPercent}, 100`}
                          strokeWidth="4"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className={`text-base font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}>{inflowPercent}%</span>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase">INFLOW RATIO</span>
                      </div>
                    </div>

                    <div className="space-y-3 flex-1">
                      <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                        isDarkMode ? "bg-slate-800/60 border-slate-800" : "bg-slate-50 border-slate-100"
                      }`}>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className={`text-xs font-extrabold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>Deposits (Inflow)</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">{inflowPercent}% of Total Volume</span>
                        </div>
                        <span className="text-xs font-black text-emerald-600">+₹{totalInflow.toLocaleString()}</span>
                      </div>

                      <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                        isDarkMode ? "bg-slate-800/60 border-slate-800" : "bg-slate-50 border-slate-100"
                      }`}>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            <span className={`text-xs font-extrabold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>Withdrawals (Outflow)</span>
                          </div>
                          <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{outflowPercent}% of Total Volume</span>
                        </div>
                        <span className="text-xs font-black text-rose-600">-₹{totalOutflow.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Card */}
                <div className={`lg:col-span-7 rounded-3xl p-6 border shadow-sm flex flex-col justify-between ${
                  isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200/80"
                }`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-sm font-extrabold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Recent Activity</h3>
                      <button
                        onClick={() => setActiveTab("transactions")}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        View All
                      </button>
                    </div>

                    {loading ? (
                      <div className="py-12 text-center text-xs text-slate-400 font-medium">
                        Loading recent transactions...
                      </div>
                    ) : transactions.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 font-semibold">
                        No recent transactions found in database.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className={`border-b text-slate-400 font-bold uppercase text-[10px] tracking-wider ${
                            isDarkMode ? "border-slate-800" : "border-slate-100"
                          }`}>
                            <tr>
                              <th className="py-2.5 px-3">TYPE</th>
                              <th className="py-2.5 px-3">DESCRIPTION</th>
                              <th className="py-2.5 px-3">DATE</th>
                              <th className="py-2.5 px-3 text-right">AMOUNT</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDarkMode ? "divide-slate-800 text-slate-300" : "divide-slate-100 text-slate-600"}`}>
                            {transactions.slice(0, 4).map((t) => {
                              const isCredit =
                                t.type === "deposit" ||
                                (t.type === "transfer" && t.receiverAccount === accountNo);

                              return (
                                <tr key={t.transactionId || t._id} className={isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80"}>
                                  <td className="py-3 px-3">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                        isCredit
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-rose-100 text-rose-700"
                                      }`}
                                    >
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className={`py-3 px-3 font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                    {t.description || `${t.type} operation`}
                                  </td>
                                  <td className="py-3 px-3 text-slate-400 font-medium">
                                    {new Date(t.createdAt || t.timestamp).toLocaleDateString()}
                                  </td>
                                  <td
                                    className={`py-3 px-3 text-right font-black ${
                                      isCredit ? "text-emerald-600" : "text-rose-600"
                                    }`}
                                  >
                                    {isCredit ? "+" : "-"}₹{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: MY ACCOUNT */}
          {activeTab === "my-account" && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>My Bank Account Details</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Comprehensive overview of your active bank account.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={`lg:col-span-2 rounded-3xl p-6 border shadow-sm space-y-6 ${
                  isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200"
                }`}>
                  <div className={`flex items-center justify-between pb-4 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className={`font-extrabold text-base ${isDarkMode ? "text-white" : "text-slate-900"}`}>{accountData?.accountType || "Savings Account"}</h3>
                        <span className="text-xs text-slate-400 font-semibold">Primary Banking Account</span>
                      </div>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-extrabold px-3 py-1 rounded-full">ACTIVE</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                    <div className={`p-4 rounded-2xl border space-y-1 ${isDarkMode ? "bg-slate-800/60 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACCOUNT NUMBER</span>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono font-bold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>{accountNo || "N/A"}</span>
                        <button onClick={copyAccountNumber} className="text-blue-600 hover:text-blue-700 cursor-pointer p-1">
                          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-1 ${isDarkMode ? "bg-slate-800/60 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AVAILABLE BALANCE</span>
                      <div className={`font-extrabold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>₹{Number(balance).toLocaleString()}</div>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-1 ${isDarkMode ? "bg-slate-800/60 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CURRENCY</span>
                      <div className={`font-extrabold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>INR (₹) - Indian Rupee</div>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-1 ${isDarkMode ? "bg-slate-800/60 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CARD HOLDER NAME</span>
                      <div className={`font-extrabold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>{userName}</div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-3xl p-6 border shadow-sm space-y-4 flex flex-col justify-between ${
                  isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200"
                }`}>
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className={`font-extrabold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>Bank-grade Security</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Your account is protected by 256-bit SSL encryption and tokenized authentication.
                    </p>
                  </div>

                  <div className={`space-y-2 pt-2 border-t text-xs ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Status</span>
                      <span className="text-emerald-600 font-bold">Verified</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Daily Transfer Limit</span>
                      <span className={`font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>₹1,00,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTIONS */}
          {activeTab === "transactions" && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>Transaction Records</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Filter, search, and review all your past deposits, withdrawals, and transfers.</p>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between ${
                isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200"
              }`}>
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by description or amount..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div className={`flex items-center space-x-1 p-1 rounded-xl text-xs font-semibold ${
                  isDarkMode ? "bg-slate-800" : "bg-slate-100"
                }`}>
                  {["all", "deposit", "withdrawal", "transfer"].map((t) => (
                    <button
                      key={t}
                      onClick={() => { setFilterType(t); setPage(1); }}
                      className={`px-3 py-1.5 rounded-lg capitalize transition cursor-pointer ${
                        filterType === t
                          ? isDarkMode ? "bg-slate-700 text-blue-400 font-bold" : "bg-white text-blue-600 shadow-sm font-bold"
                          : "text-slate-500"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`rounded-3xl border shadow-sm overflow-hidden ${
                isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200"
              }`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b text-slate-400 font-bold uppercase text-[10px] tracking-wider ${
                      isDarkMode ? "bg-slate-800/50 border-slate-800" : "bg-slate-50 border-slate-100"
                    }`}>
                      <tr>
                        <th className="py-3.5 px-6">TYPE</th>
                        <th className="py-3.5 px-6">DESCRIPTION</th>
                        <th className="py-3.5 px-6">DATE & TIME</th>
                        <th className="py-3.5 px-6 text-right">AMOUNT</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? "divide-slate-800 text-slate-300" : "divide-slate-100 text-slate-600"}`}>
                      {loading ? (
                        <tr><td colSpan="4" className="py-12 text-center text-slate-400 font-medium">Loading transactions...</td></tr>
                      ) : paginatedTransactions.length === 0 ? (
                        <tr><td colSpan="4" className="py-12 text-center text-slate-400 font-medium">No matching transactions found.</td></tr>
                      ) : (
                        paginatedTransactions.map((t) => {
                          const isCredit =
                            t.type === "deposit" ||
                            (t.type === "transfer" && t.receiverAccount === accountNo);

                          return (
                            <tr key={t.transactionId || t._id} className={isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80"}>
                              <td className="py-4 px-6">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                    isCredit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {t.type}
                                </span>
                              </td>
                              <td className={`py-4 px-6 font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                {t.description || `${t.type} transaction`}
                              </td>
                              <td className="py-4 px-6 text-slate-400 font-medium">
                                {new Date(t.createdAt || t.timestamp).toLocaleString()}
                              </td>
                              <td className={`py-4 px-6 text-right font-black text-sm ${isCredit ? "text-emerald-600" : "text-rose-600"}`}>
                                {isCredit ? "+" : "-"}₹{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={`p-4 border-t flex items-center justify-between text-xs font-semibold text-slate-500 ${
                  isDarkMode ? "border-slate-800" : "border-slate-100"
                }`}>
                  <span>Page {page} of {totalPages}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer ${
                        isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4 inline mr-1" />
                      Prev
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className={`px-3 py-1.5 rounded-lg border disabled:opacity-40 transition cursor-pointer ${
                        isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                      }`}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 inline ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>User Profile Settings</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Manage your personal account credentials and info.</p>
              </div>

              <div className={`rounded-3xl p-6 border shadow-sm space-y-6 ${
                isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200"
              }`}>
                <div className={`flex items-center space-x-4 pb-6 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                    {userInitial}
                  </div>
                  <div>
                    <h3 className={`font-extrabold text-lg ${isDarkMode ? "text-white" : "text-slate-900"}`}>{userName}</h3>
                    <span className="text-xs text-slate-400 font-semibold">{user?.email}</span>
                    <div className="mt-1">
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                        {user?.role || "User"}
                      </span>
                    </div>
                  </div>
                </div>

                <form className="space-y-4 text-xs">
                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={profileForm.fullName}
                      className={`w-full font-semibold rounded-xl px-4 py-2.5 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      readOnly
                      value={profileForm.email}
                      className={`w-full font-semibold rounded-xl px-4 py-2.5 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        Date of Birth
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user?.dob ? new Date(user.dob).toLocaleDateString() : "1/1/2000"}
                        className={`w-full font-semibold rounded-xl px-4 py-2.5 cursor-not-allowed ${
                          isDarkMode ? "bg-slate-800/40 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        Account Role
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user?.role || "USER"}
                        className={`w-full font-semibold uppercase rounded-xl px-4 py-2.5 cursor-not-allowed ${
                          isDarkMode ? "bg-slate-800/40 border-slate-700 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"
                        }`}
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Action Modal (Deposit / Withdraw / Transfer) */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl border w-full max-w-md p-6 relative ${
            isDarkMode ? "bg-[#131e3a] border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"
          }`}>
            <button
              onClick={() => setModalType(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <h3 className={`text-xl font-bold capitalize ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {modalType} Money
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Add or manage funds in your live account.
              </p>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAction} className="space-y-4">
              {modalType === "transfer" && (
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    RECIPIENT ACCOUNT NUMBER *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter 10-digit account number"
                    value={recipientAccountNumber}
                    onChange={(e) => setRecipientAccountNumber(e.target.value)}
                    className={`w-full rounded-xl px-4 py-2.5 text-xs font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                      isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              )}

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  AMOUNT (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  DESCRIPTION (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Deposit, Rent"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full rounded-xl px-4 py-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                    isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading}
                className={`w-full mt-2 py-3 px-4 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                  modalType === "deposit"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : modalType === "withdraw"
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {modalLoading ? "Processing..." : `Confirm ${modalType.toUpperCase()}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}