
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, InventoryItem, Wholesaler, Invoice, Notification, AppSettings, PurchaseOrder, POTimelineEvent } from '../types';

interface StoreContextType {
  currentUser: User | null;
  users: User[];
  inventory: InventoryItem[];
  wholesalers: Wholesaler[];
  invoices: Invoice[];
  notifications: Notification[];
  purchaseOrders: PurchaseOrder[];
  settings: AppSettings;
  
  // Actions
  login: (role: UserRole, username: string, password?: string) => boolean;
  logout: () => void;
  
  addUser: (user: User) => void;
  bulkAddUsers: (users: User[]) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  addInventoryItem: (item: InventoryItem) => void;
  bulkAddInventoryItem: (items: InventoryItem[]) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  addWholesaler: (wholesaler: Wholesaler) => void;
  updateWholesaler: (wholesaler: Wholesaler) => void;
  createInvoice: (invoice: Invoice) => void;
  updateInvoiceStatus: (invoiceId: string, status: Invoice['status']) => void;
  createPurchaseOrder: (po: PurchaseOrder) => void;
  updatePurchaseOrderStatus: (poId: string, status: PurchaseOrder['status'], receivedItems?: {itemId: string, qty: number}[]) => void;
  
  sendNotification: (notif: Notification) => void;
  markNotificationAsRead: (id: string) => void;
  updateSettings: (settings: AppSettings) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// --- DEFAULT DATA FOR OFFLINE MODE ---

const DEFAULT_USERS: User[] = [
  { 
    id: '1', 
    name: 'System Admin', 
    mobile: '0000000', 
    username: 'admin', 
    role: UserRole.ADMIN, 
    creditLimit: 0, 
    currentBalance: 0, 
    status: 'ACTIVE',
    email: 'admin@local.pos',
    password: 'admin', // Default Offline Password (Change in Settings)
  },
  { 
    id: '2', 
    name: 'Main Cashier', 
    mobile: '0000000', 
    username: 'cashier', 
    role: UserRole.CASHIER, 
    creditLimit: 0, 
    currentBalance: 0, 
    status: 'ACTIVE',
    email: 'cashier@local.pos',
    password: '123', // Default Offline Password
  }
];

const DEFAULT_SETTINGS: AppSettings = {
    shopName: 'Fridge MV POS (Offline)',
    island: 'Male\'',
    country: 'Maldives',
    contactNumber: '+960 777-0000',
    email: 'admin@fridgemv.local',
    defaultCreditLimit: 500,
    currency: 'MVR',
    bankDetails: 'BML Account: 7730000xxxxxxx'
};

// --- HELPER: LOCAL STORAGE HOOK ---
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    // Initialize state
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Session is volatile, not persisted
  
  // Persistent Data
  const [users, setUsers] = useLocalStorage<User[]>('pos_users', DEFAULT_USERS);
  const [inventory, setInventory] = useLocalStorage<InventoryItem[]>('pos_inventory', []);
  const [wholesalers, setWholesalers] = useLocalStorage<Wholesaler[]>('pos_wholesalers', []);
  const [invoices, setInvoices] = useLocalStorage<Invoice[]>('pos_invoices', []);
  const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>('pos_purchase_orders', []);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>('pos_notifications', []);
  const [settings, setSettings] = useLocalStorage<AppSettings>('pos_settings', DEFAULT_SETTINGS);

  // --- AUTHENTICATION ---

  const login = (role: UserRole, username: string, password?: string): boolean => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.role === role);
    
    if (!user) return false;

    if (user.password === password) {
        setCurrentUser(user);
        return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  // --- DATA ACTIONS ---

  const addUser = (user: User) => setUsers([...users, user]);
  const bulkAddUsers = (newUsers: User[]) => setUsers([...users, ...newUsers]);

  const updateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    // If updating current user, update session too
    if (currentUser && currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
    }
  };
  const deleteUser = (userId: string) => {
      setUsers(users.filter(u => u.id !== userId));
  };

  const addInventoryItem = (item: InventoryItem) => setInventory([...inventory, item]);
  const bulkAddInventoryItem = (items: InventoryItem[]) => setInventory([...inventory, ...items]);

  const updateInventoryItem = (updatedItem: InventoryItem) => {
    setInventory(inventory.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const addWholesaler = (w: Wholesaler) => setWholesalers([...wholesalers, w]);
  const updateWholesaler = (updated: Wholesaler) => {
    setWholesalers(wholesalers.map(w => w.id === updated.id ? updated : w));
  };

  const createInvoice = (invoice: Invoice) => {
    setInvoices([invoice, ...invoices]);
    const user = users.find(u => u.id === invoice.customerId);
    if (user) {
        updateUser({ ...user, currentBalance: user.currentBalance + invoice.totalAmount });
    }
    invoice.items.forEach(item => {
        const invItem = inventory.find(i => i.id === item.itemId);
        if (invItem) {
            updateInventoryItem({ ...invItem, qty: invItem.qty - item.qty });
        }
    });
  };

  const updateInvoiceStatus = (invoiceId: string, status: Invoice['status']) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    setInvoices(invoices.map(i => i.id === invoiceId ? { ...i, status } : i));
    
    if (status === 'PAID' && invoice.status !== 'PAID') {
        const user = users.find(u => u.id === invoice.customerId);
        if (user) {
            updateUser({ ...user, currentBalance: user.currentBalance - invoice.totalAmount });
        }
    } else if (status === 'UNPAID' && invoice.status === 'PAID') {
        const user = users.find(u => u.id === invoice.customerId);
        if (user) {
            updateUser({ ...user, currentBalance: user.currentBalance + invoice.totalAmount });
        }
    }
  };

  const createPurchaseOrder = (po: PurchaseOrder) => {
    const subtotal = po.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.08; // 8% GST Rule
    const totalCost = subtotal + tax + (po.shipping || 0) - (po.discount || 0);

    const newPO: PurchaseOrder = {
        ...po,
        subtotal,
        tax,
        totalCost,
        timeline: [{ date: new Date().toISOString(), status: po.status, note: 'PO Created', user: currentUser?.name }]
    };
    setPurchaseOrders([newPO, ...purchaseOrders]);
  };

  const updatePurchaseOrderStatus = (poId: string, status: PurchaseOrder['status'], receivedItems?: {itemId: string, qty: number}[]) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    const oldStatus = po.status;
    if (oldStatus === status && !receivedItems) return;

    const timelineEvent: POTimelineEvent = {
        date: new Date().toISOString(),
        status: status,
        note: `Status changed from ${oldStatus} to ${status}`,
        user: currentUser?.name
    };

    let updatedPOItems = po.items;
    
    if (receivedItems) {
        updatedPOItems = po.items.map(item => {
            const received = receivedItems.find(r => r.itemId === item.inventoryItemId);
            return received ? { ...item, receivedQty: (item.receivedQty || 0) + received.qty } : item;
        });
    } else if (status === 'RECEIVED' && oldStatus !== 'RECEIVED') {
        updatedPOItems = po.items.map(item => ({ ...item, receivedQty: item.qty }));
    }

    setPurchaseOrders(prev => prev.map(p => p.id === poId ? { 
        ...p, 
        status,
        items: updatedPOItems,
        timeline: [timelineEvent, ...p.timeline]
    } : p));

    if ((status === 'RECEIVED' || status === 'PARTIALLY_RECEIVED') && updatedPOItems) {
        const newInventory = [...inventory];
        let invChanged = false;

        updatedPOItems.forEach(poItem => {
             const invItemIndex = newInventory.findIndex(i => i.id === poItem.inventoryItemId);
             
             if (invItemIndex >= 0) {
                 const invItem = newInventory[invItemIndex];
                 let qtyToAdd = 0;

                 if (receivedItems) {
                     const specificRec = receivedItems.find(r => r.itemId === poItem.inventoryItemId);
                     if (specificRec) qtyToAdd = specificRec.qty;
                 } else if (status === 'RECEIVED' && oldStatus !== 'RECEIVED') {
                     qtyToAdd = poItem.qty - (poItem.receivedQty || 0); 
                 }

                 if (qtyToAdd > 0 || status === 'RECEIVED') {
                    newInventory[invItemIndex] = {
                        ...invItem,
                        qty: invItem.qty + qtyToAdd, 
                        lastSupplierId: po.wholesalerId,
                        lastSupplierName: po.wholesalerName,
                        lastPurchasePrice: poItem.unitCost,
                        lastPurchaseDate: new Date().toISOString()
                    };
                    invChanged = true;
                 }
             }
        });

        if (invChanged) setInventory(newInventory);
    }
  };

  const sendNotification = (notif: Notification) => setNotifications((prev) => [notif, ...prev]);
  
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const updateSettings = (s: AppSettings) => setSettings(s);

  return (
    <StoreContext.Provider value={{
      currentUser, users, inventory, wholesalers, invoices, notifications, purchaseOrders, settings,
      login, logout, 
      addUser, bulkAddUsers, updateUser, deleteUser, addInventoryItem, bulkAddInventoryItem, updateInventoryItem,
      addWholesaler, updateWholesaler, createInvoice, updateInvoiceStatus, 
      createPurchaseOrder, updatePurchaseOrderStatus,
      sendNotification, markNotificationAsRead, updateSettings
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
