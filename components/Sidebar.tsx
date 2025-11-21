
import React from 'react';
import { useStore } from '../services/store';
import { UserRole } from '../types';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { currentUser, logout } = useStore();

  const menuItems = {
    [UserRole.ADMIN]: [
      { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
      { id: 'pos', icon: 'fa-cash-register', label: 'POS Terminal' },
      { id: 'inventory', icon: 'fa-boxes', label: 'Inventory' },
      { id: 'customers', icon: 'fa-users', label: 'Users & Customers' },
      { id: 'wholesalers', icon: 'fa-truck', label: 'Wholesalers' },
      { id: 'invoices', icon: 'fa-file-invoice-dollar', label: 'Invoices' },
      { id: 'settings', icon: 'fa-cog', label: 'Settings' },
    ],
    [UserRole.FINANCE]: [
      { id: 'dashboard', icon: 'fa-chart-pie', label: 'Overview' },
      { id: 'customers', icon: 'fa-users', label: 'Customers' },
      { id: 'invoices', icon: 'fa-file-invoice-dollar', label: 'Finance & Invoices' },
      { id: 'wholesalers', icon: 'fa-truck', label: 'Wholesalers' },
      { id: 'settings', icon: 'fa-cog', label: 'Settings' },
    ],
    [UserRole.CASHIER]: [
      { id: 'pos', icon: 'fa-cash-register', label: 'POS Terminal' },
      { id: 'customers', icon: 'fa-users', label: 'Customers' }, // Cashier needs to select customers for POS
      { id: 'inventory', icon: 'fa-boxes', label: 'Inventory Check' },
    ],
    [UserRole.CUSTOMER_INHOUSE]: [
      { id: 'dashboard', icon: 'fa-home', label: 'My Dashboard' },
    ],
    [UserRole.CUSTOMER_DELIVERY]: [
      { id: 'dashboard', icon: 'fa-home', label: 'My Dashboard' },
    ]
  };

  if (!currentUser) return null;

  // Fallback to customer view if role not explicitly handled, though all should be covered
  const items = menuItems[currentUser.role] || menuItems[UserRole.CUSTOMER_INHOUSE];

  return (
    <div className="w-64 h-full glass flex flex-col justify-between flex-shrink-0 no-print z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-8 tracking-wide flex items-center gap-2">
          <i className="fas fa-layer-group text-blue-300"></i> GlassPOS
        </h1>
        <nav className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                activePage === item.id 
                ? 'bg-white/20 text-white shadow-lg border border-white/20' 
                : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} w-6`}></i>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6 border-t border-white/10">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                <i className="fas fa-user"></i>
            </div>
            <div>
                <p className="text-white text-sm font-medium truncate w-32">{currentUser.name}</p>
                <p className="text-white/60 text-[10px] uppercase tracking-wider">{currentUser.role.replace('CUSTOMER_', '').replace('_', ' ')}</p>
            </div>
        </div>
        <button 
            onClick={logout}
            className="w-full py-2 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30 border border-red-500/20 flex items-center justify-center gap-2 transition-all"
        >
            <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  );
};
