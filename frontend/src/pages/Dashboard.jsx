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
  Check,
  Menu
} from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Dynamic Time Greeting (Morning / Afternoon / Evening / Night)
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 22) return "Good Evening";
    return "Good Night";
  };

  // --- Dark / Light Theme State ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Mobile Navigation Drawer Toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Logout Confirmation Modal State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  // Clean fetchBalance without duplicate retry loops
  const fetchBalance = async () => {
    try {
      const res = await API.get("/account/balance");
      const data = res.data.data || res.data;
      setAccountData(data);
      setBalance(data.balance !== undefined ? data.balance : res.data.balance || 0);
    } catch (err) {
      console.error("Fetch balance error:", err);
    }
  };

  // Clean fetchTransactions without 404 endpoint retry loops
  const fetchTransactions = async () => {
    try {
      const res = await API.get("/transactions");
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

  const handleLogout = async () => {
    setShowLogoutModal(false);
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

  // Precise 2-Decimal Calculations
  const accountNo = accountData?.accountNumber || "";
  const totalInflow = transactions
    .filter((t) => t.type === "deposit" || (t.type === "transfer" && t.receiverAccount === accountNo))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalOutflow = transactions
    .filter((t) => t.type === "withdrawal" || (t.type === "transfer" && t.senderAccount === accountNo))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const grandTotal = totalInflow + totalOutflow;
  const rawInflow = grandTotal > 0 ? (totalInflow / grandTotal) * 100 : 0;
  const rawOutflow = grandTotal > 0 ? (totalOutflow / grandTotal) * 100 : 0;

  const inflowPercent = rawInflow > 0 ? (rawInflow % 1 === 0 ? rawInflow.toFixed(0) : rawInflow.toFixed(2)) : 0;
  const outflowPercent = rawOutflow > 0 ? (rawOutflow % 1 === 0 ? rawOutflow.toFixed(0) : rawOutflow.toFixed(2)) : 0;

  // Dynamic Account Number -> Account Holder Name Lookup Map built from transaction history
  const accountNameMap = {};
  transactions.forEach((tr) => {
    // Check receiver
    const rAcc = tr.receiverAccount || tr.receiverAccountNumber || tr.toAccount || tr.receiver?.accountNumber;
    let rName = tr.receiverName || tr.recipientName || tr.toUserName || tr.receiverHolderName || tr.receiverAccountHolder || tr.receiverDetails?.fullName || tr.receiverDetails?.name || tr.receiver?.fullName || tr.receiver?.name;
    if (!rName && tr.description && typeof tr.description === "string") {
      const m = tr.description.match(/^(?:Transfer to|Sent to|To)\s+([^(]+)/i);
      if (m && m[1] && !m[1].toLowerCase().startsWith("acc") && m[1].toLowerCase() !== "account") {
        rName = m[1].trim();
      }
    }
    if (rAcc && rName && !rName.toLowerCase().startsWith("acc") && rName.toLowerCase() !== "account") {
      accountNameMap[rAcc.toString().trim()] = rName.trim();
    }

    // Check sender
    const sAcc = tr.senderAccount || tr.senderAccountNumber || tr.fromAccount || tr.sender?.accountNumber;
    let sName = tr.senderName || tr.sender_name || tr.senderHolderName || tr.senderAccountHolder || tr.fromUserName || tr.senderDetails?.fullName || tr.senderDetails?.name || tr.sender?.fullName || tr.sender?.name;
    if (!sName && tr.description && typeof tr.description === "string") {
      const m = tr.description.match(/^(?:Received from|Transfer from|From)\s+([^(]+)/i);
      if (m && m[1] && !m[1].toLowerCase().startsWith("acc") && m[1].toLowerCase() !== "account") {
        sName = m[1].trim();
      }
    }
    if (sAcc && sName && !sName.toLowerCase().startsWith("acc") && sName.toLowerCase() !== "account") {
      accountNameMap[sAcc.toString().trim()] = sName.trim();
    }
  });

  // Smart Transaction Description Formatting (Extracts Sender & Receiver Details)
  const getTransactionDescription = (t) => {
    if (t.type === "transfer") {
      const isReceiver =
        t.receiverAccount === accountNo ||
        t.receiverAccountNumber === accountNo ||
        t.toAccount === accountNo ||
        (t.receiverAccount && accountNo && t.receiverAccount.toString() === accountNo.toString()) ||
        (t.receiverAccountNumber && accountNo && t.receiverAccountNumber.toString() === accountNo.toString());

      // --- 1. Extract Sender Name & Account ---
      let senderName =
        t.senderName ||
        t.sender_name ||
        t.senderHolderName ||
        t.senderAccountHolder ||
        t.senderAccountHolderName ||
        t.sender_account_holder ||
        t.fromUserName ||
        t.from_user_name ||
        t.fromName ||
        t.senderDetails?.fullName ||
        t.senderDetails?.name ||
        t.senderDetails?.accountHolder ||
        t.sender?.fullName ||
        t.sender?.name ||
        t.sender?.userName ||
        t.sender?.username ||
        t.sender?.accountHolder ||
        t.sender?.accountHolderName ||
        t.senderId?.fullName ||
        t.senderId?.name ||
        t.senderId?.userName ||
        t.senderId?.accountHolder ||
        t.fromUser?.fullName ||
        t.fromUser?.name ||
        t.fromUser?.accountHolder ||
        t.user?.fullName ||
        t.user?.name ||
        t.accountHolder ||
        t.accountHolderName ||
        t.holderName;

      if (!senderName && t.sender) {
        if (typeof t.sender === "string" && !t.sender.match(/^[0-9a-fA-F]{24}$/) && !t.sender.toLowerCase().startsWith("acc")) {
          senderName = t.sender;
        } else if (typeof t.sender === "object") {
          senderName = t.sender.fullName || t.sender.name || t.sender.userName || t.sender.accountHolder;
        }
      }

      if (!senderName && t.senderId) {
        if (typeof t.senderId === "string" && !t.senderId.match(/^[0-9a-fA-F]{24}$/) && !t.senderId.toLowerCase().startsWith("acc")) {
          senderName = t.senderId;
        } else if (typeof t.senderId === "object") {
          senderName = t.senderId.fullName || t.senderId.name || t.senderId.userName;
        }
      }

      if (!senderName && t.fromUser) {
        if (typeof t.fromUser === "string" && !t.fromUser.match(/^[0-9a-fA-F]{24}$/) && !t.fromUser.toLowerCase().startsWith("acc")) {
          senderName = t.fromUser;
        } else if (typeof t.fromUser === "object") {
          senderName = t.fromUser.fullName || t.fromUser.name;
        }
      }

      let senderAcc =
        t.senderAccount ||
        t.senderAccountNumber ||
        t.senderAccountNo ||
        t.sender_account ||
        t.sender_account_number ||
        t.sender?.accountNumber ||
        t.sender?.account_number ||
        t.sender?.accountNo ||
        t.senderId?.accountNumber ||
        t.fromAccount ||
        t.fromAccountNumber ||
        t.fromAccountNo ||
        t.from_account ||
        t.sourceAccount ||
        t.sourceAccountNumber;

      // --- 2. Extract Receiver Name & Account ---
      let receiverName =
        t.receiverName ||
        t.receiver_name ||
        t.recipientName ||
        t.recipient_name ||
        t.receiverHolderName ||
        t.receiverAccountHolder ||
        t.receiverAccountHolderName ||
        t.toUserName ||
        t.to_user_name ||
        t.toName ||
        t.receiverDetails?.fullName ||
        t.receiverDetails?.name ||
        t.receiverDetails?.accountHolder ||
        t.receiver?.fullName ||
        t.receiver?.name ||
        t.receiver?.userName ||
        t.receiver?.accountHolder ||
        t.receiverId?.fullName ||
        t.receiverId?.name ||
        t.receiverId?.accountHolder ||
        t.recipient?.fullName ||
        t.recipient?.name ||
        t.recipient?.accountHolder;

      if (!receiverName && t.receiver) {
        if (typeof t.receiver === "string" && !t.receiver.match(/^[0-9a-fA-F]{24}$/) && !t.receiver.toLowerCase().startsWith("acc")) {
          receiverName = t.receiver;
        } else if (typeof t.receiver === "object") {
          receiverName = t.receiver.fullName || t.receiver.name || t.receiver.userName || t.receiver.accountHolder;
        }
      }

      if (!receiverName && t.receiverId) {
        if (typeof t.receiverId === "string" && !t.receiverId.match(/^[0-9a-fA-F]{24}$/) && !t.receiverId.toLowerCase().startsWith("acc")) {
          receiverName = t.receiverId;
        } else if (typeof t.receiverId === "object") {
          receiverName = t.receiverId.fullName || t.receiverId.name || t.receiverId.userName;
        }
      }

      if (!receiverName && t.recipient) {
        if (typeof t.recipient === "string" && !t.recipient.match(/^[0-9a-fA-F]{24}$/) && !t.recipient.toLowerCase().startsWith("acc")) {
          receiverName = t.recipient;
        } else if (typeof t.recipient === "object") {
          receiverName = t.recipient.fullName || t.recipient.name || t.recipient.userName;
        }
      }

      let receiverAcc =
        t.receiverAccount ||
        t.receiverAccountNumber ||
        t.receiverAccountNo ||
        t.receiver_account ||
        t.receiver_account_number ||
        t.receiver?.accountNumber ||
        t.receiver?.account_number ||
        t.receiverId?.accountNumber ||
        t.recipientAccount ||
        t.recipientAccountNumber ||
        t.recipient_account ||
        t.toAccount ||
        t.toAccountNumber ||
        t.to_account ||
        t.targetAccount ||
        t.targetAccountNumber;

      // --- 3. Smart Regex Extraction from description if fields are missing ---
      if (t.description && typeof t.description === "string") {
        // Match "Transfer to Name (AccNo)"
        const toMatch = t.description.match(/^(?:Transfer to|Sent to|To)\s+([^(]+)(?:\s*\(([^)]+)\))?/i);
        if (toMatch) {
          const matchedName = toMatch[1].trim();
          if (!receiverName && matchedName && !matchedName.toLowerCase().startsWith("acc") && matchedName.toLowerCase() !== "account") {
            receiverName = matchedName;
          }
          if (!receiverAcc && toMatch[2]) receiverAcc = toMatch[2].trim();
        }

        // Match "Received from Name (AccNo)" or "Transfer from Name (AccNo)"
        const fromMatch = t.description.match(/^(?:Received from|Transfer from|From)\s+([^(]+)(?:\s*\(([^)]+)\))?/i);
        if (fromMatch) {
          const matchedName = fromMatch[1].trim();
          if (!senderName && matchedName && !matchedName.toLowerCase().startsWith("acc") && matchedName.toLowerCase() !== "account") {
            senderName = matchedName;
          }
          if (!senderAcc && fromMatch[2]) senderAcc = fromMatch[2].trim();
        }
      }

      // --- 4. Dynamic Account Name Map Lookup ---
      const sAccStr = senderAcc ? senderAcc.toString().trim() : "";
      if (!senderName && sAccStr && accountNameMap[sAccStr]) {
        senderName = accountNameMap[sAccStr];
      }

      const rAccStr = receiverAcc ? receiverAcc.toString().trim() : "";
      if (!receiverName && rAccStr && accountNameMap[rAccStr]) {
        receiverName = accountNameMap[rAccStr];
      }

      // Format names cleanly
      const displaySenderName = senderName && senderName.trim().toLowerCase() !== "account" && !senderName.trim().toLowerCase().startsWith("acc") ? senderName.trim() : null;
      const displaySenderAcc = sAccStr;

      const displayReceiverName = receiverName && receiverName.trim().toLowerCase() !== "account" && !receiverName.trim().toLowerCase().startsWith("acc") ? receiverName.trim() : null;
      const displayReceiverAcc = rAccStr;

      if (isReceiver) {
        // RECEIVER VIEW: Show SENDER'S Account Holder Name & Account Number
        if (displaySenderName && displaySenderAcc) {
          return `Received from ${displaySenderName} (${displaySenderAcc})`;
        }
        if (displaySenderName) {
          return `Received from ${displaySenderName}`;
        }
        if (displaySenderAcc) {
          return `Received from (${displaySenderAcc})`;
        }
        return "Received Money Transfer";
      } else {
        // SENDER VIEW: Show RECEIVER'S Account Holder Name & Account Number
        if (displayReceiverName && displayReceiverAcc) {
          return `Transfer to ${displayReceiverName} (${displayReceiverAcc})`;
        }
        if (displayReceiverName) {
          return `Transfer to ${displayReceiverName}`;
        }
        if (displayReceiverAcc) {
          return `Transfer to (${displayReceiverAcc})`;
        }
        return t.description || "Transfer to Recipient";
      }
    }
    return t.description || `${t.type} operation`;
  };

  const todayDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Account Created On Formatter (Date, Day, Time)
  const accountCreatedOnStr = (() => {
    const dateRaw =
      accountData?.createdAt ||
      accountData?.created_at ||
      accountData?.timestamp ||
      user?.createdAt ||
      user?.created_at ||
      user?.timestamp;

    const validDate = dateRaw ? new Date(dateRaw) : new Date();
    const finalDate = !isNaN(validDate.getTime()) ? validDate : new Date();

    const dayName = finalDate.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = finalDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = finalDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    return `${dayName}, ${dateStr} at ${timeStr}`;
  })();

  const userName = user?.fullName || user?.name || "Vani Verma";
  const userInitial = userName.charAt(0).toUpperCase();

  // Filtering & Pagination for Transactions Tab
  const filteredTransactions = transactions.filter((t) => {
    const matchesType = filterType === "all" || t.type === filterType;
    const term = searchTerm.toLowerCase();
    const formattedDesc = getTransactionDescription(t).toLowerCase();
    const matchesSearch =
      !term ||
      formattedDesc.includes(term) ||
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
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2.5 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 max-w-xs sm:max-w-md">
          {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Overlay Backdrop for Mobile Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Navigation (Desktop Fixed + Mobile Responsive Drawer) */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 w-64 bg-[#0a1427] text-slate-300 flex flex-col justify-between p-6 shrink-0 h-screen border-r border-slate-800 transition-transform duration-300 ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}>
        <div className="space-y-8">
          {/* Logo Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}>
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">Account</h2>
                <p className="text-[11px] text-blue-400 font-semibold tracking-wide">Management System</p>
              </div>
            </div>
            {/* Mobile Drawer Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "my-account", label: "My Account", icon: Wallet },
              { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
              { id: "profile", label: "Profile", icon: UserIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? "bg-[#1b63ff] text-white shadow-lg shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer - Logout Button */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-rose-400 text-xs font-bold transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Right Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Navigation Bar */}
        <header className={`px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-30 border-b transition-colors ${
          isDarkMode ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200/80 text-slate-900"
        }`}>
          <div className="flex items-center space-x-3">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border text-slate-400 hover:text-white border-slate-700 hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold capitalize truncate">
              {activeTab.replace("-", " ")}
            </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-5">
            <span className={`hidden sm:inline-block text-xs font-semibold px-3 py-1.5 rounded-full border ${
              isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
              {todayDateStr}
            </span>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition cursor-pointer ${
                isDarkMode ? "text-amber-400 hover:bg-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className={`flex items-center space-x-2 sm:space-x-2.5 pl-2 border-l ${
              isDarkMode ? "border-slate-800" : "border-slate-200"
            }`}>
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center shadow-md shrink-0">
                {userInitial}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold truncate max-w-[120px]">{userName}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">{user?.role || "User"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Main Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">

          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              <div>
                <h2 className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}>
                  {getGreeting()}, {userName}!
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                  Here's what's happening with your account today.
                </p>
              </div>

              {/* Row 1: Debit Card & Quick Action Buttons */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

                {/* --- EXACT BLUE-PURPLE GRADIENT DEBIT CARD --- */}
                <div className="lg:col-span-7 bg-gradient-to-br from-[#2952ee] via-[#385fff] to-[#6d30ed] rounded-3xl p-5 sm:p-7 text-white shadow-xl flex flex-col justify-between relative overflow-hidden min-h-[200px] sm:min-h-[220px]">

                  <div className="absolute top-0 right-1/4 w-32 h-[300px] bg-gradient-to-b from-white/20 via-white/10 to-transparent transform rotate-[30deg] pointer-events-none" />

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-2 sm:space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold tracking-wider uppercase leading-none">AURABANK</h4>
                        <span className="text-[9px] text-blue-200 font-bold uppercase tracking-widest">PLATINUM DIGITAL</span>
                      </div>
                    </div>

                    <div className="w-9 sm:w-10 h-6 sm:h-7 rounded-md bg-amber-400 border border-amber-300 shadow-inner flex items-center justify-center">
                      <div className="w-5 sm:w-6 h-3.5 sm:h-4 border border-amber-600/40 rounded-sm" />
                    </div>
                  </div>

                  <div className="my-4 sm:my-5 relative z-10">
                    <span className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest">AVAILABLE BALANCE</span>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mt-1 tracking-tight">
                      ₹ {Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                  </div>

                  <div className="pt-3 sm:pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
                    <div>
                      <span className="block text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">CARD HOLDER</span>
                      <span className="font-extrabold uppercase text-white tracking-wider">{userName}</span>
                    </div>

                    <div>
                      <span className="block text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">ACCOUNT NUMBER</span>
                      <span className="font-mono font-bold tracking-widest text-white">{accountNo || "3964626721"}</span>
                    </div>

                    <span className="bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-extrabold px-2.5 sm:px-3 py-1 rounded-full uppercase">
                      ACTIVE
                    </span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className={`lg:col-span-5 rounded-3xl p-4 sm:p-6 border shadow-sm flex items-center justify-around ${
                  isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200/80"
                }`}>
                  <button
                    onClick={() => { setModalType("deposit"); setModalError(""); }}
                    className="flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${
                      isDarkMode ? "bg-emerald-950/60 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                    }`}>
                      <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className={`text-xs font-extrabold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Deposit</span>
                  </button>

                  <button
                    onClick={() => { setModalType("withdraw"); setModalError(""); }}
                    className="flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${
                      isDarkMode ? "bg-rose-950/60 text-rose-400" : "bg-rose-50 text-rose-600"
                    }`}>
                      <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <span className={`text-xs font-extrabold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Withdraw</span>
                  </button>

                  <button
                    onClick={() => { setModalType("transfer"); setModalError(""); }}
                    className="flex flex-col items-center justify-center space-y-2 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm ${
                      isDarkMode ? "bg-purple-950/60 text-purple-400" : "bg-purple-50 text-purple-600"
                    }`}>
                      <Send className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-extrabold ${isDarkMode ? "text-white" : "text-slate-800"}`}>Transfer</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Breakdown & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className={`lg:col-span-5 rounded-3xl p-5 sm:p-6 border shadow-sm space-y-6 ${
                  isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200/80"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-sm font-extrabold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Transaction Ratio Breakdown</h3>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Real-time Inflow vs Outflow Ratio</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 sm:space-x-6">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center shrink-0">
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

                    <div className="space-y-3 w-full flex-1">
                      <div className={`p-3 rounded-2xl border flex items-center justify-between ${
                        isDarkMode ? "bg-slate-800/60 border-slate-800" : "bg-slate-50 border-slate-100"
                      }`}>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className={`text-xs font-extrabold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>Deposits (Inflow)</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">{inflowPercent}% of Total</span>
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
                          <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{outflowPercent}% of Total</span>
                        </div>
                        <span className="text-xs font-black text-rose-600">-₹{totalOutflow.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Table */}
                <div className={`lg:col-span-7 rounded-3xl p-5 sm:p-6 border shadow-sm flex flex-col justify-between ${
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
                      <div className="py-12 text-center text-xs text-slate-400 font-medium">Loading recent transactions...</div>
                    ) : transactions.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 font-semibold">No recent transactions found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[400px]">
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
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                      isCredit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                    }`}>
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className={`py-3 px-3 font-bold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                    {getTransactionDescription(t)}
                                  </td>
                                  <td className="py-3 px-3 text-slate-400 font-medium whitespace-nowrap">
                                    {new Date(t.createdAt || t.timestamp).toLocaleDateString()}
                                  </td>
                                  <td className={`py-3 px-3 text-right font-black ${isCredit ? "text-emerald-600" : "text-rose-600"}`}>
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
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>My Bank Account Details</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Comprehensive overview of your active bank account.</p>
              </div>

              <div className={`rounded-3xl p-5 sm:p-6 border shadow-sm space-y-6 max-w-4xl ${
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-xs">
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

                  <div className={`p-4 rounded-2xl border space-y-1 sm:col-span-2 lg:col-span-1 ${isDarkMode ? "bg-slate-800/60 border-slate-800" : "bg-slate-50 border-slate-100"}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACCOUNT CREATED ON</span>
                    <div className={`font-extrabold text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>{accountCreatedOnStr}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTIONS */}
          {activeTab === "transactions" && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>Transaction Records</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Filter, search, and review all your past deposits, withdrawals, and transfers.</p>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between ${
                isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200"
              }`}>
                <div className="relative w-full sm:w-80">
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

                <div className={`flex flex-wrap items-center space-x-1 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto justify-center ${
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
                  <table className="w-full text-left text-xs min-w-[500px]">
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
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                  isCredit ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                }`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className={`py-4 px-6 font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                {getTransactionDescription(t)}
                              </td>
                              <td className="py-4 px-6 text-slate-400 font-medium whitespace-nowrap">
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
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>User Profile Settings</h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Manage your personal account credentials and info.</p>
              </div>

              <div className={`rounded-3xl p-5 sm:p-6 border shadow-sm space-y-6 ${
                isDarkMode ? "bg-[#131e3a] border-slate-800" : "bg-white border-slate-200"
              }`}>
                <div className={`flex items-center space-x-4 pb-6 border-b ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                    {userInitial}
                  </div>
                  <div>
                    <h3 className={`font-extrabold text-base sm:text-lg ${isDarkMode ? "text-white" : "text-slate-900"}`}>{userName}</h3>
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
                      type="text"
                      readOnly
                      value={profileForm.email}
                      className={`w-full font-semibold rounded-xl px-4 py-2.5 ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className={`rounded-3xl shadow-2xl border w-full max-w-md p-5 sm:p-6 relative ${
            isDarkMode ? "bg-[#131e3a] border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"
          }`}>
            <button
              onClick={() => setModalType(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <h3 className={`text-lg sm:text-xl font-bold capitalize ${isDarkMode ? "text-white" : "text-slate-900"}`}>
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

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl shadow-2xl border w-full max-w-sm p-6 text-center space-y-4 ${
            isDarkMode ? "bg-[#131e3a] border-slate-800 text-white" : "bg-white border-slate-100 text-slate-800"
          }`}>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Confirm Logout
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Are you sure you want to log out of your account?
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}