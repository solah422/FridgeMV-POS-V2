
export enum UserRole {
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  CASHIER = 'CASHIER',
  CUSTOMER_INHOUSE = 'CUSTOMER_INHOUSE',
  CUSTOMER_DELIVERY = 'CUSTOMER_DELIVERY',
}

export interface User {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string; // General/Billing Address
  redboxId: string;
  telegramId?: string; 
  role: UserRole;
  creditLimit: number; 
  currentBalance: number; 
  avatar?: string;
  notes?: string; // Internal Admin Notes
  status: 'ACTIVE' | 'INACTIVE';
  joinedDate?: string;
  
  // Auth
  password?: string; // Mocked hashed password
  isRegistered: boolean; // True if they have completed signup with Verification Code

  // Delivery Profile Fields
  deliveryAddressLine?: string;
  deliveryArea?: string;
  deliveryCity?: string;
  deliveryNotes?: string; // Customer's default delivery instructions
}

export interface VerificationToken {
    userId: string;
    redboxId: string;
    code: string;
    expiresAt: number; // Timestamp
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  qty: number;
  minStock?: number;
  price: number; 
  details: string;
  category: string;
  status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  
  lastSupplierId?: string; 
  lastSupplierName?: string; 
  lastPurchasePrice?: number; 
  lastPurchaseDate?: string;
}

export interface Wholesaler {
  id: string;
  name: string;
  code?: string;
  contact: string; 
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  itemsSupplied: string; 
  linkedInventoryIds?: string[]; 
  tags?: string[];
  paymentTerms?: string; 
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}

export interface InvoiceItem {
  itemId: string;
  itemName: string;
  qty: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  date: string; 
  items: InvoiceItem[];
  totalAmount: number;
  status: 'PAID' | 'UNPAID' | 'PENDING_APPROVAL';
  type: 'SINGLE_DAY' | 'MULTI_DAY';
  proofOfPayment?: string; 
}

export interface POItem {
  inventoryItemId: string;
  name: string;
  qty: number; 
  receivedQty?: number; 
  unitCost: number;
  total: number;
}

export interface POTimelineEvent {
  date: string;
  status: string;
  note?: string;
  user?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string; 
  wholesalerId: string;
  wholesalerName: string;
  date: string;
  expectedDeliveryDate?: string;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  items: POItem[];
  
  subtotal: number;
  tax: number; 
  shipping: number;
  discount: number;
  totalCost: number;
  
  notes?: string;
  timeline: POTimelineEvent[];
}

export interface Notification {
  id: string;
  targetUserId: string | 'ALL';
  message: string;
  date: string;
  read: boolean;
}

export interface DeliveryRequest {
  id: string;
  customerId: string;
  customerName: string;
  
  // Snapshot Address (Copied from Profile at time of request)
  deliveryAddressLine: string;
  deliveryArea: string;
  deliveryCity: string;
  
  requestedTime: string; 
  notes?: string; // Specific notes for this request
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  date: string;
}

export interface AppSettings {
  shopName: string;
  logo?: string; 
  island?: string;
  country?: string;
  contactNumber?: string;
  email?: string;
  defaultCreditLimit: number;
  currency: string;
  bankDetails: string;
}