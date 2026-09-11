import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Briefcase,
  Zap,
  AlertCircle,
  Wallet,
  Calendar
} from 'lucide-react';
import heroImg from '../assets/hero.png';

export default function LandingPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    accountType: '',
    dob: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        navigate('/dashboard');
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        await register({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role || 'user',
          accountType: formData.accountType || 'Savings Account',
          dob: formData.dob
        });
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ fullName: '', email: '', password: '', confirmPassword: '', role: '', accountType: '', dob: '' });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans antialiased">
      {/* Left Hero Panel (Now visible on mobile view too) */}
      <div
        className="w-full lg:w-1/2 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden bg-cover bg-center bg-no-repeat min-h-[320px] sm:min-h-[400px] lg:min-h-screen"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#071325]/90 via-[#071325]/60 to-[#071325]/30 pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center space-x-3 mb-6 lg:mb-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-white">Account Management System</span>
        </div>

        {/* Hero Title & Subtext */}
        <div className="relative z-10 my-auto max-w-lg space-y-4 sm:space-y-6 py-4">
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-extrabold text-white leading-tight">
            {isLogin ? (
              <>Your Money,<br /><span className="text-blue-400">Our Priority</span></>
            ) : (
              <>Build Your<br /><span className="text-blue-400">Financial Future</span></>
            )}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-sm">
            {isLogin
              ? "Secure, simple and reliable account management for a better tomorrow."
              : "Create your account and take the first step towards better financial management."}
          </p>

          <div className="space-y-3 sm:space-y-4 pt-2">
            <div className="flex items-center space-x-3.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 backdrop-blur-sm flex items-center justify-center text-blue-400 shrink-0 border border-blue-400/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Secure Transactions</h4>
                <p className="text-[11px] text-slate-300">Your data is always protected</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 backdrop-blur-sm flex items-center justify-center text-blue-400 shrink-0 border border-blue-400/20">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Easy Management</h4>
                <p className="text-[11px] text-slate-300">Access your account anytime</p>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 backdrop-blur-sm flex items-center justify-center text-blue-400 shrink-0 border border-blue-400/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Fast & Reliable</h4>
                <p className="text-[11px] text-slate-300">Banking made simple</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/50 pt-4 mt-4 lg:mt-0">
          <span>© 2026 AuraBank Inc. All rights reserved.</span>
          <span className="hover:text-white cursor-pointer">Privacy Policy</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              {isLogin ? 'Sign in to your account' : 'Join us today'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2.5 text-red-600 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name (Register Only) */}
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full bg-white border border-slate-300 text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal rounded-xl pl-9 pr-4 py-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  className="w-full bg-white border border-slate-300 text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal rounded-xl pl-9 pr-4 py-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Account Type Dropdown (Register Only) */}
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Account Type
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    name="accountType"
                    required
                    value={formData.accountType}
                    onChange={handleChange}
                    className={`w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-sm appearance-none cursor-pointer ${
                      formData.accountType ? "text-slate-900 font-semibold" : "text-slate-400 font-normal"
                    }`}
                  >
                    <option value="" disabled hidden>Select account type</option>
                    <option value="Savings Account" className="text-slate-900 font-medium">Savings Account</option>
                    <option value="Current Account" className="text-slate-900 font-medium">Current Account</option>
                    <option value="Salary Account" className="text-slate-900 font-medium">Salary Account</option>
                    <option value="Business Account" className="text-slate-900 font-medium">Business Account</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px] font-semibold">
                    ▼
                  </div>
                </div>
              </div>
            )}

            {/* Date of Birth Input (Register Only) */}
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    name="dob"
                    required
                    value={formData.dob}
                    onChange={handleChange}
                    className={`w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-sm ${
                      formData.dob ? "text-slate-900 font-semibold" : "text-slate-400 font-normal"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Account Role Dropdown (Register Only) */}
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Account Role
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    className={`w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-sm appearance-none cursor-pointer ${
                      formData.role ? "text-slate-900 font-semibold" : "text-slate-400 font-normal"
                    }`}
                  >
                    <option value="" disabled hidden>Select account role</option>
                    <option value="user" className="text-slate-900 font-medium">User (Customer)</option>
                    <option value="admin" className="text-slate-900 font-medium">Admin (Administrator)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px] font-semibold">
                    ▼
                  </div>
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isLogin ? 'Enter your password' : 'Create a password'}
                  className="w-full bg-white border border-slate-300 text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal rounded-xl pl-9 pr-10 py-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register Only) */}
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    className="w-full bg-white border border-slate-300 text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal rounded-xl pl-9 pr-4 py-2.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#1b63ff] hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}
            </button>
          </form>

          {/* Toggle Mode Link */}
          <p className="text-center text-xs text-slate-600 font-medium pt-1">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 font-extrabold hover:underline cursor-pointer"
            >
              {isLogin ? 'Create account' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}