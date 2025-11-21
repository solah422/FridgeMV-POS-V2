
import React, { useState, useEffect } from 'react';
import { useStore } from './services/store';
import { Sidebar } from './components/Sidebar';
import { UserRole } from './types';

// Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { InventoryManager } from './pages/InventoryManager';
import { CustomerManager } from './pages/CustomerManager';
import { InvoiceManager } from './pages/InvoiceManager';
import { SettingsPage } from './pages/SettingsPage';
import { WholesalerManager } from './pages/WholesalerManager';
import { POSPage } from './pages/POSPage';
import { Button, Card, Input, Select } from './components/GlassComponents';

const App: React.FC = () => {
  const { currentUser, login, notifications, markNotificationAsRead } = useStore();
  const [activePage, setActivePage] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  // Auth State
  const [authRole, setAuthRole] = useState<UserRole>(UserRole.ADMIN);
  const [authUsername, setAuthUsername] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');

  // --- ROUTING LOGIC ON LOGIN ---
  useEffect(() => {
      if (currentUser) {
          if (currentUser.role === UserRole.ADMIN) {
              setActivePage('dashboard');
          } else if (currentUser.role === UserRole.CASHIER) {
              setActivePage('pos'); // Cashier goes straight to POS
          }
      }
  }, [currentUser]);

  const handleLogin = () => {
      setAuthError('');
      if (!authUsername || !authPass) return setAuthError('Please enter credentials');
      
      const success = login(authRole, authUsername, authPass);
      if (!success) setAuthError('Invalid Credentials or Role selection.');
  };

  const roleOptions = [
      { value: UserRole.ADMIN, label: 'Administrator' },
      { value: UserRole.CASHIER, label: 'Cashier' }
  ];

  // Login Screen
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
              <i className="fas fa-server text-4xl text-white"></i>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Fridge MV POS</h1>
            <p className="text-white/50 text-sm uppercase tracking-widest">Offline Edition</p>
          </div>
          
          {authError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm text-center animate-slide-down">
                  <i className="fas fa-exclamation-circle mr-2"></i>{authError}
              </div>
          )}

          <div className="space-y-4 animate-fade-in">
             <Select 
                value={authRole}
                onChange={(e) => setAuthRole(e.target.value as UserRole)}
                options={roleOptions}
                className="mb-0"
             />
             <Input 
                placeholder="Username (e.g. admin)" 
                value={authUsername} 
                onChange={(e) => setAuthUsername(e.target.value)}
                className="text-center font-bold"
             />
             <Input 
                type="password" 
                placeholder="Password" 
                value={authPass} 
                onChange={(e) => setAuthPass(e.target.value)}
                className="text-center"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
             />
             <Button className="w-full py-3 text-lg shadow-lg shadow-blue-500/20 mt-2" onClick={handleLogin}>
                <i className="fas fa-sign-in-alt mr-2"></i> Local Login
             </Button>
             
             <div className="mt-6 text-center text-white/20 text-xs">
                 <p>Default Admin: admin / admin</p>
                 <p>Default Cashier: cashier / 123</p>
             </div>
          </div>
        </Card>
      </div>
    );
  }

  // Main Layout Renderer
  const renderContent = () => {
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
    } else if (currentUser.role === UserRole.CASHIER) {
         switch (activePage) {
            case 'pos': return <POSPage />;
            case 'customers': return <CustomerManager />;
            case 'inventory': return <InventoryManager />; // Cashier can check stock
            default: return <POSPage />;
        }
    } else {
        // Fallback for invalid state
        return <div className="p-10 text-white text-center">Access Denied</div>;
    }
  };

  const unreadCount = notifications.filter(n => !n.read && (n.targetUserId === 'ALL' || n.targetUserId === currentUser.id)).length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#1a1b26]">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      
      <main className="flex-1 overflow-y-auto p-8 relative" id="main-content">
        {/* Header / Breadcrumb area */}
        <div className="mb-8 flex justify-between items-center relative no-print">
            <div>
                <h2 className="text-white/50 text-sm uppercase tracking-wider mb-1">{currentUser.role}</h2>
                <h1 className="text-2xl font-bold text-white capitalize">{activePage.replace('_', ' ')}</h1>
            </div>
            <div className="flex items-center gap-4 relative">
                {/* Local Notification System */}
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition relative"
                >
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white/10"></span>
                    )}
                </button>

                {showNotifications && (
                    <div className="absolute top-12 right-0 w-80 glass-heavy rounded-xl shadow-2xl p-4 z-50 border border-white/20 animate-slide-down">
                        <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold">Local Alerts</h3>
                        <span className="text-xs text-white/50">{unreadCount} unread</span>
                        </div>
                        <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                        {notifications.length === 0 && <p className="text-white/50 text-sm text-center py-4">No alerts</p>}
                        {notifications.map(n => (
                            <div key={n.id} className={`p-3 rounded-lg border transition-all ${n.read ? 'bg-white/5 border-transparent' : 'bg-white/10 border-blue-500/30'}`}>
                                <p className="text-sm text-white">{n.message}</p>
                                <button onClick={() => markNotificationAsRead(n.id)} className="text-xs text-blue-300 hover:text-blue-200 mt-2 block">
                                    Mark Read
                                </button>
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
