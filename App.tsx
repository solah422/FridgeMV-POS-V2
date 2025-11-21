
import React, { useState, useEffect } from 'react';
import { useStore } from './services/store';
import { Sidebar } from './components/Sidebar';
import { UserRole } from './types';

// Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { InventoryManager } from './pages/InventoryManager';
import { CustomerManager } from './pages/CustomerManager';
import { InvoiceManager } from './pages/InvoiceManager';
import { CustomerPortal } from './pages/CustomerPortal';
import { SettingsPage } from './pages/SettingsPage';
import { WholesalerManager } from './pages/WholesalerManager';
import { POSPage } from './pages/POSPage';
import { Button, Card, Input } from './components/GlassComponents';

const App: React.FC = () => {
  const { currentUser, login, registerUser, notifications, markNotificationAsRead } = useStore();
  const [activePage, setActivePage] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  // Auth State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [authId, setAuthId] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authConfirmPass, setAuthConfirmPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // --- ROUTING LOGIC ON LOGIN ---
  useEffect(() => {
      if (currentUser) {
          if (currentUser.role === UserRole.ADMIN) {
              setActivePage('dashboard');
          } else if (currentUser.role === UserRole.FINANCE) {
              setActivePage('dashboard');
          } else if (currentUser.role === UserRole.CASHIER) {
              setActivePage('pos'); // Cashier goes straight to POS
          } else if (currentUser.role === UserRole.CUSTOMER_INHOUSE || currentUser.role === UserRole.CUSTOMER_DELIVERY) {
              setActivePage('dashboard');
          }
      }
  }, [currentUser]);

  // Filter notifications for current user
  const myNotifications = currentUser ? notifications.filter(n => 
    (n.targetUserId === 'ALL' || n.targetUserId === currentUser.id)
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  const unreadCount = myNotifications.filter(n => !n.read).length;

  const handleLogin = () => {
      setAuthError('');
      setAuthSuccess('');
      if (!authId || !authPass) return setAuthError('Please enter Redbox ID and Password');
      
      const success = login(authId, authPass);
      if (!success) setAuthError('Invalid Redbox ID or Password. If you have not created an account, please use a Verification Code to Sign Up.');
  };

  const handleSignup = () => {
      setAuthError('');
      setAuthSuccess('');
      if (!authId || !authCode || !authPass) return setAuthError('All fields are required');
      if (authPass !== authConfirmPass) return setAuthError('Passwords do not match');
      if (authPass.length < 3) return setAuthError('Password too short');

      const result = registerUser(authId, authCode, authPass);
      if (result.success) {
          setAuthSuccess(result.message);
          setTimeout(() => {
              setAuthMode('LOGIN');
              setAuthSuccess('');
              setAuthPass('');
          }, 1500);
      } else {
          setAuthError(result.message);
      }
  };

  // Login/Signup Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#1a1b26]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <Card className="w-full max-w-md glass-heavy p-8 animate-fade-in relative z-10 border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/20">
              <i className="fas fa-cube text-4xl text-white"></i>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Fridge MV POS</h1>
            <p className="text-white/50 text-sm">Secure Access Portal</p>
          </div>
          
          {authError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center animate-slide-down">
                  <i className="fas fa-exclamation-circle mr-2"></i>{authError}
              </div>
          )}
           {authSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm text-center animate-slide-down">
                  <i className="fas fa-check-circle mr-2"></i>{authSuccess}
              </div>
          )}

          {authMode === 'LOGIN' ? (
              <div className="space-y-4 animate-fade-in">
                 <Input 
                    placeholder="Redbox ID" 
                    value={authId} 
                    onChange={(e) => setAuthId(e.target.value)}
                    className="text-center font-mono"
                 />
                 <Input 
                    type="password" 
                    placeholder="Password" 
                    value={authPass} 
                    onChange={(e) => setAuthPass(e.target.value)}
                    className="text-center"
                 />
                 <Button className="w-full py-3 text-lg shadow-lg shadow-blue-500/20 mt-2" onClick={handleLogin}>
                    Login
                 </Button>
                 
                 <div className="mt-6 text-center">
                     <p className="text-white/40 text-xs mb-2">Don't have an account password yet?</p>
                     <button onClick={() => setAuthMode('SIGNUP')} className="text-blue-300 text-sm font-bold hover:text-white transition">
                         Create Account with Verification Code
                     </button>
                 </div>
                 <div className="text-center mt-4 text-xs text-white/20">
                     Use ID: ADMIN01 | Pass: admin (Demo)
                 </div>
              </div>
          ) : (
              <div className="space-y-4 animate-fade-in">
                 <Input 
                    placeholder="Redbox ID" 
                    value={authId} 
                    onChange={(e) => setAuthId(e.target.value)}
                 />
                 <Input 
                    placeholder="Verification Code (6-Digits)" 
                    value={authCode} 
                    onChange={(e) => setAuthCode(e.target.value)}
                    maxLength={6}
                    className="font-mono text-center tracking-widest"
                 />
                 <div className="grid grid-cols-2 gap-3">
                    <Input 
                        type="password" 
                        placeholder="New Password" 
                        value={authPass} 
                        onChange={(e) => setAuthPass(e.target.value)}
                    />
                    <Input 
                        type="password" 
                        placeholder="Confirm" 
                        value={authConfirmPass} 
                        onChange={(e) => setAuthConfirmPass(e.target.value)}
                    />
                 </div>
                 <Button className="w-full py-3 text-lg bg-green-600/40 border-green-500/50 hover:bg-green-600/60 mt-2" onClick={handleSignup}>
                    Create Account
                 </Button>
                 
                 <div className="mt-6 text-center">
                     <button onClick={() => setAuthMode('LOGIN')} className="text-white/50 text-sm hover:text-white transition">
                         <i className="fas fa-arrow-left mr-2"></i> Back to Login
                     </button>
                 </div>
              </div>
          )}
        </Card>
      </div>
    );
  }

  // Main Layout Renderer
  const renderContent = () => {
    
    // ADMIN ROUTES
    if (currentUser.role === UserRole.ADMIN) {
        switch (activePage) {
            case 'dashboard': return <AdminDashboard />;
            case 'pos': return <POSPage />;
            case 'inventory': return <InventoryManager />;
            case 'customers': return <CustomerManager />;
            case 'invoices': return <InvoiceManager />;
            case 'wholesalers': return <WholesalerManager />;
            case 'settings': return <SettingsPage />;
            default: return <AdminDashboard />;
        }
    } 
    // FINANCE ROUTES
    else if (currentUser.role === UserRole.FINANCE) {
        switch (activePage) {
            case 'dashboard': return <FinanceDashboard />;
            case 'customers': return <CustomerManager />;
            case 'invoices': return <InvoiceManager />;
            case 'wholesalers': return <WholesalerManager />;
            case 'settings': return <SettingsPage />;
            default: return <FinanceDashboard />;
        }
    }
    // CASHIER ROUTES
    else if (currentUser.role === UserRole.CASHIER) {
         switch (activePage) {
            // Cashier has limited view. Default is POS.
            case 'pos': return <POSPage />;
            case 'customers': return <CustomerManager />;
            case 'inventory': return <InventoryManager />;
            default: return <POSPage />;
        }
    }
    // CUSTOMER ROUTES (Shared Component, Internal Logic handles differences)
    else {
        return <CustomerPortal />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#1a1b26]">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      
      <main className="flex-1 overflow-y-auto p-8 relative" id="main-content">
        {/* Header / Breadcrumb area */}
        <div className="mb-8 flex justify-between items-center relative no-print">
            <div>
                <h2 className="text-white/50 text-sm uppercase tracking-wider mb-1">{currentUser.role.replace('CUSTOMER_', '').replace('_', ' ')}</h2>
                <h1 className="text-2xl font-bold text-white capitalize">{activePage === 'dashboard' && currentUser.role === 'FINANCE' ? 'Overview' : activePage.replace('_', ' ')}</h1>
            </div>
            <div className="flex items-center gap-4 relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition relative"
                >
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white/10"></span>
                    )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                    <div className="absolute top-12 right-0 w-80 glass-heavy rounded-xl shadow-2xl p-4 z-50 border border-white/20 animate-slide-down">
                        <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold">Notifications</h3>
                        <span className="text-xs text-white/50">{unreadCount} unread</span>
                        </div>
                        <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                        {myNotifications.length === 0 && <p className="text-white/50 text-sm text-center py-4">No notifications</p>}
                        {myNotifications.map(n => (
                            <div key={n.id} className={`p-3 rounded-lg border transition-all ${n.read ? 'bg-white/5 border-transparent' : 'bg-white/10 border-blue-500/30'}`}>
                                <p className="text-sm text-white">{n.message}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-white/40">{new Date(n.date).toLocaleDateString()}</span>
                                    {!n.read && (
                                        <button onClick={() => markNotificationAsRead(n.id)} className="text-xs text-blue-300 hover:text-blue-200 px-2 py-1 rounded bg-blue-500/10">
                                            Mark Read
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {renderContent()}
      </main>
    </div>
  );
};

export default App;
