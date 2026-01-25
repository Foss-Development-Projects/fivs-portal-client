
import React, { useState, useEffect } from 'react';
import { UserRole, UserStatus } from '@/types';
import { CONTACT_INFO } from '@/constants';
import { useGlobalState } from '@/context';
import { portalApi as api } from '@/services/portalApi';

interface HomeProps {
  onLogin: (role: UserRole) => void;
}

// Requirement 1: Beautiful effect without wave
const PremiumTitle: React.FC<{ text: string }> = ({ text }) => {
  return (
    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E7D32] via-[#4CAF50] to-[#1B5E20] inline-block pb-2">
      {text}
    </span>
  );
};

// Requirement 2: Moving Neon Light Effect Wrapper (Updated with Increased Width)
const MovingNeonWrapper: React.FC<{ children: React.ReactNode; className?: string; borderRadius?: string }> = ({ children, className = "", borderRadius = "32px" }) => {
  return (
    <div className={`relative p-[5px] overflow-hidden group ${className}`} style={{ borderRadius }}>
      {/* The rotating light beam */}
      <div
        className="absolute inset-[-150%] animate-spin-slow opacity-40 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none z-0"
        style={{
          background: 'conic-gradient(from 0deg, transparent, #9333ea, #c084fc, #9333ea, transparent 40%)'
        }}
      />
      {/* Inner background to keep content solid */}
      <div className="relative z-10 w-full h-full bg-white dark:bg-gray-900 overflow-hidden" style={{ borderRadius: `calc(${borderRadius} - 5px)` }}>
        {children}
      </div>
    </div>
  );
};

const Home: React.FC<HomeProps> = ({ onLogin }) => {
  const { registerUser, setCurrentUser, darkMode, toggleDarkMode } = useGlobalState();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: ''
  });

  const LOGO_URL = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjQP3GbpiX6PTXwBPogsN7Z9GYViQF7RciaBSJ9sXPDGjhq5SY25Con616krp_COWQE8TkDZjJYNaPLR9Lk9z6VDs_ZYcL0zmABWLkumfWRTkFgBo8HBdFYfGUCV1KZmuliOc0v10Rm_7PGFXgPFwMipN_bonERXvYkH9I95mQzQqheiK9FRQltiA3NP4g/s320/Adobe%20Express%20-%20file.png";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        const user = await api.login(formData.email, formData.password);

        if (user.role === UserRole.PARTNER && user.status === UserStatus.PENDING) {
          setError('Your account is waiting for Admin approval.');
          return;
        }
        if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.FROZEN) {
          setError('Your account has been restricted. Contact support.');
          return;
        }
        setCurrentUser(user);
        onLogin(user.role);
      } else {
        await registerUser({
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          username: formData.email.split('@')[0],
          role: UserRole.PARTNER,
          password: formData.password
        } as any);
        setSuccess('Hooray! Your registration request has been accepted and pending for review. you will be notified shortly within 72 hours when it is activated.');
        setIsLogin(true);
        setFormData({ ...formData, password: '' });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#fcfdfc] via-white to-[#f0f9f1] dark:from-gray-950 dark:via-gray-900 dark:to-black transition-colors duration-500 font-['Inter'] overflow-x-hidden relative">

      {/* Background Neon Elements */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/10 dark:bg-purple-500/5 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-indigo-600/10 dark:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0 animate-pulse" />

      <div className="flex-1 flex flex-col items-center justify-center relative py-12 z-10">
        {/* Floating Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="fixed md:absolute top-8 right-6 md:right-8 z-[100] w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] rounded-full text-gray-700 dark:text-gray-300 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border border-gray-100 dark:border-gray-700"
          aria-label="Toggle Dark Mode"
        >
          <span className="material-icons-outlined text-xl md:text-2xl transition-transform duration-500">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        <div className="max-w-7xl mx-auto w-full flex flex-col-reverse md:flex-row items-center justify-center gap-8 lg:gap-24 px-6 mb-16">
          {/* Left Section: Branding & Info */}
          <div className="flex-1 flex flex-col justify-center py-8 space-y-10 md:space-y-12">
            <div className="max-w-xl animate-fadeIn">
              <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-black leading-[1.1] tracking-[-0.03em] mb-4 md:mb-6 antialiased">
                <PremiumTitle text="FIVS Partner Portal" />
              </h1>
              <p className="text-base sm:text-lg lg:text-[19px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-10 md:mb-14 max-w-[500px] opacity-90">
                Empowering partners with seamless lead management, transparent commission tracking, and dedicated support.
              </p>

              <div className="space-y-8 md:space-y-10">
                <div className="flex items-center space-x-4 md:space-x-6 group">
                  <div className="w-12 h-12 md:w-[56px] md:h-[56px] bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] dark:from-green-900/20 dark:to-green-900/40 rounded-full flex items-center justify-center text-[#2E7D32] flex-shrink-0 transition-all duration-300 group-hover:scale-110 shadow-sm">
                    <span className="material-icons-outlined text-2xl md:text-[30px]">verified</span>
                  </div>
                  <div>
                    <h3 className="text-base md:text-[19px] font-extrabold text-gray-800 dark:text-gray-100 leading-none mb-1 tracking-tight">Quick KYC</h3>
                    <p className="text-[13px] md:text-[15px] text-gray-500 dark:text-gray-400 font-medium opacity-80">Hassle-free digital verification process.</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 md:space-x-6 group">
                  <div className="w-12 h-12 md:w-[56px] md:h-[56px] bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] dark:from-green-900/20 dark:to-green-900/40 rounded-full flex items-center justify-center text-[#2E7D32] flex-shrink-0 transition-all duration-300 group-hover:scale-110 shadow-sm">
                    <span className="material-icons-outlined text-2xl md:text-[30px]">payments</span>
                  </div>
                  <div>
                    <h3 className="text-base md:text-[19px] font-extrabold text-gray-800 dark:text-gray-100 leading-none mb-1 tracking-tight">Fast Payouts</h3>
                    <p className="text-[13px] md:text-[15px] text-gray-500 dark:text-gray-400 font-medium opacity-80">Transparent wallet and monthly statements.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Section: Auth Card with Moving Neon Effect */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="relative w-full max-w-[450px]">
              <MovingNeonWrapper borderRadius="40px" className="shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]">
                <div className="p-8 sm:p-11 relative z-10">
                  <div className="flex items-center justify-center mb-10 relative">
                    <img src={LOGO_URL} alt="FIVS Logo" className="h-16 w-auto object-contain" />
                  </div>

                  <div className="bg-[#f0f2f5] dark:bg-gray-800/50 p-1.5 rounded-[1.25rem] flex mb-9 relative">
                    <div
                      className={`absolute inset-1.5 w-[calc(50%-6px)] bg-white dark:bg-gray-700 rounded-xl shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isLogin ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'}`}
                    />
                    <button
                      onClick={() => { setIsLogin(false); setError(null); }}
                      className={`flex-1 py-3 rounded-xl text-[14px] md:text-[15px] font-bold transition-all relative z-10 ${!isLogin ? 'text-gray-800 dark:text-white' : 'text-gray-400 hover:text-gray-500'}`}
                    >
                      Register
                    </button>
                    <button
                      onClick={() => setIsLogin(true)}
                      className={`flex-1 py-3 rounded-xl text-[14px] md:text-[15px] font-bold transition-all relative z-10 ${isLogin ? 'text-[#2E7D32] dark:text-green-400' : 'text-gray-400 hover:text-gray-500'}`}
                    >
                      Login
                    </button>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl text-[13px] font-bold border border-red-100 dark:border-red-900/20 animate-fadeIn flex items-center gap-2">
                      <span className="material-icons-outlined text-sm">error_outline</span>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="mb-6 p-5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-3xl text-[13px] font-bold border border-green-100 dark:border-green-900/20 animate-fadeIn flex flex-col items-center text-center gap-3">
                      <span className="material-icons-outlined text-3xl">celebration</span>
                      <p>{success}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6 relative">
                    {!isLogin && (
                      <div className="space-y-2 group">
                        <label htmlFor="auth-name" className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">Full Name</label>
                        <input
                          type="text"
                          id="auth-name"
                          name="name"
                          required
                          className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-[#2E7D32] focus:ring-4 focus:ring-green-500/5 outline-none transition-all placeholder-gray-300 text-sm md:text-base font-medium"
                          placeholder="Enter your name"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="space-y-2 group">
                      <label className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">EMAIL ADDRESS</label>
                      <input
                        type="email"
                        id="auth-email"
                        name="email"
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-[#2E7D32] focus:ring-4 focus:ring-green-500/5 outline-none transition-all placeholder-gray-300 text-sm md:text-base font-medium"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    {!isLogin && (
                      <div className="space-y-2 group">
                        <label className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">Mobile Number</label>
                        <input
                          type="tel"
                          id="auth-mobile"
                          name="mobile"
                          required
                          className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-[#2E7D32] focus:ring-4 focus:ring-green-500/5 outline-none transition-all placeholder-gray-300 text-sm md:text-base font-medium"
                          placeholder="9876543210"
                          value={formData.mobile}
                          onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="space-y-2 group">
                      <label className="text-[10px] md:text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">PASSWORD</label>
                      <input
                        type="password"
                        id="auth-password"
                        name="password"
                        required
                        className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:border-[#2E7D32] focus:ring-4 focus:ring-green-500/5 outline-none transition-all placeholder-gray-300 text-sm md:text-base font-medium"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-br from-[#2E7D32] to-[#1b5e20] text-white py-5 rounded-[1.25rem] font-black shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 mt-4 text-[16px]"
                    >
                      {isLoading ? (
                        <span className="material-icons-outlined animate-spin text-2xl">sync</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {isLogin ? 'Login to Portal' : 'Create Account'}
                          <span className="material-icons-outlined text-sm">arrow_forward</span>
                        </span>
                      )}
                    </button>
                  </form>

                  <p className="mt-8 text-center text-[12px] md:text-[13px] text-gray-400 font-medium opacity-80">
                    Note: All data is saved to a central database. Access your account from any device.
                  </p>
                </div>
              </MovingNeonWrapper>
            </div>
          </div>
        </div>

        {/* Need Support Section with Moving Neon Effect */}
        <div className="w-full max-w-7xl px-6 pb-12 flex justify-center animate-fadeIn relative z-10">
          <div className="relative w-full max-w-[1000px]">
            <MovingNeonWrapper borderRadius="2.5rem" className="shadow-[0_15px_50px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_15px_50px_-15px_rgba(0,0,0,0.4)]">
              <div className="w-full p-7 md:p-10 border-l-[8px] border-[#2E7D32] dark:border-green-600 transition-all duration-300 relative z-10 overflow-hidden">
                <h4 className="text-xl md:text-[24px] font-black text-gray-800 dark:text-white mb-6 tracking-tight">Need Support?</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-3.5 group">
                    <span className="material-icons-outlined text-[#E91E63] text-[22px]">phone</span>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Call Us</p>
                      <p className="text-[14px] md:text-[15px] font-bold tracking-tight text-gray-800 dark:text-gray-200">{CONTACT_INFO.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3.5 group">
                    <span className="material-icons-outlined text-[#3F51B5] text-[22px]">email</span>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email Support</p>
                      <p className="text-[14px] md:text-[15px] font-bold tracking-tight text-gray-800 dark:text-gray-200">{CONTACT_INFO.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3.5 group">
                    <span className="material-icons-outlined text-[#00897B] text-[22px]">language</span>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Official Website</p>
                      <a href="https://www.fivs.in" target="_blank" rel="noopener noreferrer" className="text-[14px] md:text-[15px] font-bold tracking-tight text-[#2E7D32] hover:underline">www.fivs.in</a>
                    </div>
                  </div>
                </div>
              </div>
            </MovingNeonWrapper>
          </div>
        </div>
      </div>

      <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet" />
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Home;
