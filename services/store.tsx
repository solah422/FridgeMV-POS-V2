
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, InventoryItem, Wholesaler, Invoice, Notification, AppSettings, PurchaseOrder, POTimelineEvent, DeliveryRequest, VerificationToken } from '../types';

interface StoreContextType {
  currentUser: User | null;
  users: User[];
  inventory: InventoryItem[];
  wholesalers: Wholesaler[];
  invoices: Invoice[];
  notifications: Notification[];
  purchaseOrders: PurchaseOrder[];
  deliveryRequests: DeliveryRequest[];
  settings: AppSettings;
  verificationTokens: VerificationToken[];
  
  // Actions
  login: (redboxId: string, password?: string) => boolean; // Updated to require password for registered users
  logout: () => void;
  
  // Account Management
  generateVerificationCode: (redboxId: string) => string | null;
  registerUser: (redboxId: string, code: string, password: string) => { success: boolean; message: string };

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
  updateInvoiceStatus: (invoiceId: string, status: Invoice['status'], proof?: string) => void;
  createPurchaseOrder: (po: PurchaseOrder) => void;
  updatePurchaseOrderStatus: (poId: string, status: PurchaseOrder['status'], receivedItems?: {itemId: string, qty: number}[]) => void;
  
  // Delivery Actions
  addDeliveryRequest: (req: DeliveryRequest) => void;
  updateDeliveryRequestStatus: (id: string, status: DeliveryRequest['status']) => void;

  sendNotification: (notif: Notification) => void;
  markNotificationAsRead: (id: string) => void;
  updateSettings: (settings: AppSettings) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Mock Data
const MOCK_USERS: User[] = [
  { 
    id: '1', 
    name: 'Admin User', 
    mobile: '9999999', 
    redboxId: 'ADMIN01', 
    role: UserRole.ADMIN, 
    creditLimit: 0, 
    currentBalance: 0, 
    status: 'ACTIVE',
    email: 'admin@fridgemv.com',
    password: 'admin', // Default demo password
    isRegistered: true
  },
  { 
    id: '2', 
    name: 'Fatima Ali', 
    mobile: '7771122', 
    redboxId: 'RB-055', 
    role: UserRole.CUSTOMER_INHOUSE, 
    creditLimit: 500, 
    currentBalance: 150, 
    status: 'ACTIVE',
    email: 'fatima@gmail.com',
    address: 'Ma. Rose Garden, 3rd Floor',
    notes: 'Prefers payments via BML Transfer.',
    password: '123',
    isRegistered: true
  },
  { 
    id: '3', 
    name: 'Ahmed Delivery', 
    mobile: '7773344', 
    redboxId: 'RB-102', 
    role: UserRole.CUSTOMER_DELIVERY, 
    creditLimit: 1000, 
    currentBalance: 0, 
    status: 'ACTIVE',
    email: 'ahmed.del@yahoo.com',
    address: 'H. Blue Villa',
    deliveryAddressLine: 'H. Blue Villa, 2nd Floor',
    deliveryArea: 'Henveiru',
    deliveryCity: 'Male',
    deliveryNotes: 'Ring bell twice.',
    password: '123',
    isRegistered: true
  },
  { 
    id: '4', 
    name: 'Sarah Finance', 
    mobile: '9991111', 
    redboxId: 'FIN-01', 
    role: UserRole.FINANCE, 
    creditLimit: 0, 
    currentBalance: 0, 
    status: 'ACTIVE',
    email: 'finance@fridgemv.com',
    password: '123',
    isRegistered: true
  },
  { 
    id: '5', 
    name: 'John Cashier', 
    mobile: '9992222', 
    redboxId: 'POS-01', 
    role: UserRole.CASHIER, 
    creditLimit: 0, 
    currentBalance: 0, 
    status: 'ACTIVE',
    email: 'cashier@fridgemv.com',
    password: '123',
    isRegistered: true
  },
  {
      id: '6',
      name: 'New Unregistered User',
      mobile: '7770000',
      redboxId: 'NEW-001',
      role: UserRole.CUSTOMER_INHOUSE,
      creditLimit: 500,
      currentBalance: 0,
      status: 'ACTIVE',
      isRegistered: false
  }
];

const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Wireless Mouse', sku: 'PER-001', qty: 50, minStock: 10, price: 150, details: 'Logitech Silent Touch', category: 'Electronics', status: 'IN_STOCK', lastPurchasePrice: 100, lastSupplierId: '1', lastSupplierName: 'Tech Supplies Maldives' },
  { id: '2', name: 'Mechanical Keyboard', sku: 'PER-002', qty: 5, minStock: 8, price: 1200, details: 'RGB Backlit Blue Switch', category: 'Electronics', status: 'LOW_STOCK', lastPurchasePrice: 950, lastSupplierId: '1', lastSupplierName: 'Tech Supplies Maldives' },
  { id: '3', name: 'USB-C Cable', sku: 'ACC-005', qty: 100, minStock: 20, price: 85, details: 'Braided 2m', category: 'Accessories', status: 'IN_STOCK', lastPurchasePrice: 40 },
  { id: '4', name: 'Coca Cola 500ml', sku: 'DRK-101', qty: 0, minStock: 24, price: 15, details: 'Chilled', category: 'Drinks', status: 'OUT_OF_STOCK', lastPurchasePrice: 8 },
];

const MOCK_WHOLESALERS: Wholesaler[] = [
  { 
      id: '1', 
      name: 'Tech Supplies Maldives', 
      code: 'TSM-001',
      contact: 'Ali Riza', 
      phone: '333-4444',
      email: 'sales@techsupplies.mv',
      address: 'H. Orchid Magu, Male',
      city: 'Male',
      itemsSupplied: 'Peripherals, Cables',
      linkedInventoryIds: ['1', '2'],
      tags: ['Electronics', 'Reliable'],
      paymentTerms: 'Cash on Pickup',
      status: 'ACTIVE',
      notes: 'Main supplier for all IT equipment.'
  },
  { 
      id: '2', 
      name: 'Happy Drinks Pvt Ltd', 
      code: 'HDP-022',
      contact: 'Manager', 
      phone: '777-8888',
      email: 'orders@happydrinks.com',
      address: 'M. Boduthakurufaanu Magu',
      city: 'Male',
      itemsSupplied: 'Beverages',
      linkedInventoryIds: ['4'],
      tags: ['Beverages'],
      paymentTerms: 'Cash on Pickup',
      status: 'ACTIVE',
      notes: 'Call before pickup.'
  },
];

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-2023-001',
    customerId: '2',
    customerName: 'Fatima Ali',
    date: new Date().toISOString(),
    status: 'UNPAID',
    type: 'SINGLE_DAY',
    totalAmount: 150,
    items: [{ itemId: '1', itemName: 'Wireless Mouse', qty: 1, price: 150, total: 150 }]
  }
];

const MOCK_DELIVERY_REQUESTS: DeliveryRequest[] = [
  {
    id: 'DEL-101',
    customerId: '3',
    customerName: 'Ahmed Delivery',
    deliveryAddressLine: 'H. Blue Villa, 2nd Floor',
    deliveryArea: 'Henveiru',
    deliveryCity: 'Male',
    requestedTime: 'ASAP',
    status: 'NEW',
    date: new Date().toISOString(),
    notes: 'Please call upon arrival'
  }
];

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>(MOCK_WHOLESALERS);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [deliveryRequests, setDeliveryRequests] = useState<DeliveryRequest[]>(MOCK_DELIVERY_REQUESTS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [verificationTokens, setVerificationTokens] = useState<VerificationToken[]>([]);
  
  const [settings, setSettings] = useState<AppSettings>({
    shopName: 'Fridge MV POS',
    island: 'Male\'',
    country: 'Maldives',
    contactNumber: '+960 777-0000',
    email: 'support@fridgemv.com',
    defaultCreditLimit: 500,
    currency: 'MVR',
    bankDetails: 'Account Name: Fridge MV Pvt Ltd\nAccount Number: 77300002222333\nBank: Bank of Maldives\nViber Slip: 777-0000'
  });

  // --- AUTHENTICATION ---

  const login = (redboxId: string, password?: string): boolean => {
    const user = users.find(u => u.redboxId === redboxId);
    
    if (!user) return false;

    // For legacy/demo purposes, if user is registered, they MUST check password
    if (user.isRegistered) {
        if (user.password === password) {
            setCurrentUser(user);
            return true;
        }
        return false;
    } else {
        // If user is NOT registered, they cannot login. They must sign up.
        return false;
    }
  };

  const logout = () => setCurrentUser(null);

  const generateVerificationCode = (redboxId: string): string | null => {
      const user = users.find(u => u.redboxId === redboxId);
      if (!user) return null;

      // Generate 6 digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Remove existing tokens for this user
      const cleanTokens = verificationTokens.filter(t => t.redboxId !== redboxId);
      
      const newToken: VerificationToken = {
          userId: user.id,
          redboxId: user.redboxId,
          code,
          expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      };

      setVerificationTokens([...cleanTokens, newToken]);
      return code;
  };

  const registerUser = (redboxId: string, code: string, password: string): { success: boolean; message: string } => {
      const user = users.find(u => u.redboxId === redboxId);
      if (!user) return { success: false, message: 'User not found.' };
      
      if (user.isRegistered) return { success: false, message: 'Account already registered. Please login.' };

      const token = verificationTokens.find(t => t.redboxId === redboxId && t.code === code);
      
      if (!token) return { success: false, message: 'Invalid verification code.' };
      if (Date.now() > token.expiresAt) return { success: false, message: 'Verification code expired.' };

      // Success
      const updatedUser: User = {
          ...user,
          password,
          isRegistered: true,
          status: 'ACTIVE'
      };
      
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      // Remove used token
      setVerificationTokens(verificationTokens.filter(t => t.redboxId !== redboxId));
      
      return { success: true, message: 'Account created successfully!' };
  };

  // --- DATA ACTIONS ---

  const addUser = (user: User) => setUsers([...users, user]);
  const bulkAddUsers = (newUsers: User[]) => setUsers(prev => [...prev, ...newUsers]);

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
  const bulkAddInventoryItem = (items: InventoryItem[]) => setInventory(prev => [...prev, ...items]);

  const updateInventoryItem = (updatedItem: InventoryItem) => {
    setInventory(inventory.map(i => i.id === updatedItem.id ? updatedItem : i));
  };

  const addWholesaler = (w: Wholesaler) => setWholesalerForm([...wholesalers, w]);
  const updateWholesaler = (updated: Wholesaler) => {
    setWholesalers(wholesalers.map(w => w.id === updated.id ? updated : w));
  };
  const setWholesalerForm = (w: Wholesaler[]) => setWholesalers(w);

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

  const updateInvoiceStatus = (invoiceId: string, status: Invoice['status'], proof?: string) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    setInvoices(invoices.map(i => i.id === invoiceId ? { ...i, status, proofOfPayment: proof || i.proofOfPayment } : i));
    
    if (status === 'PAID' && invoice.status !== 'PAID') {
        const user = users.find(u => u.id === invoice.customerId);
        if (user) {
            updateUser({ ...user, currentBalance: user.currentBalance - invoice.totalAmount });
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

  const addDeliveryRequest = (req: DeliveryRequest) => {
      setDeliveryRequests([req, ...deliveryRequests]);
  };

  const updateDeliveryRequestStatus = (id: string, status: DeliveryRequest['status']) => {
      setDeliveryRequests(deliveryRequests.map(d => d.id === id ? { ...d, status } : d));
  };

  const sendNotification = (notif: Notification) => setNotifications((prev) => [notif, ...prev]);
  
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const updateSettings = (s: AppSettings) => setSettings(s);

  return (
    <StoreContext.Provider value={{
      currentUser, users, inventory, wholesalers, invoices, notifications, purchaseOrders, settings, deliveryRequests, verificationTokens,
      login, logout, generateVerificationCode, registerUser, 
      addUser, bulkAddUsers, updateUser, deleteUser, addInventoryItem, bulkAddInventoryItem, updateInventoryItem,
      addWholesaler, updateWholesaler, createInvoice, updateInvoiceStatus, 
      createPurchaseOrder, updatePurchaseOrderStatus,
      addDeliveryRequest, updateDeliveryRequestStatus,
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
