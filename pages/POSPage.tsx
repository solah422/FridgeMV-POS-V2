
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '../services/store';
import { Card, Button } from '../components/GlassComponents';
import { UserRole, InvoiceItem, InventoryItem, User } from '../types';

// --- INTERNAL: POS CUSTOMER SELECTOR ---
const POSCustomerSelector: React.FC<{
    users: User[];
    onSelect: (user: User | null) => void;
    selectedUser: User | null;
    currency: string;
}> = ({ users, onSelect, selectedUser, currency }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter Customers Only
    const customers = useMemo(() => users.filter(u => 
        u.role === UserRole.CUSTOMER
    ), [users]);

    useEffect(() => {
        if (selectedUser) {
            setQuery(selectedUser.name);
        } else {
            setQuery('');
        }
    }, [selectedUser]);

    const filtered = customers.filter(u => 
        u.name.toLowerCase().includes(query.toLowerCase()) || 
        u.mobile.includes(query) ||
        (u.username && u.username.toLowerCase().includes(query.toLowerCase()))
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (user: User) => {
        setQuery(user.name);
        onSelect(user);
        setIsOpen(false);
    };

    const handleClear = () => {
        setQuery('');
        onSelect(null);
        setIsOpen(false);
    };

    const avail = selectedUser ? selectedUser.creditLimit - selectedUser.currentBalance : 0;

    return (
        <div className="w-full" ref={wrapperRef}>
            <label className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2 block">CUSTOMER</label>
            
            <div className="relative group">
                {/* Input Wrapper */}
                <div className={`
                    relative flex items-center w-full rounded-xl transition-all duration-200
                    ${selectedUser 
                        ? 'bg-white/20 border border-white/30' 
                        : 'bg-white/10 border border-white/10 hover:bg-white/15'
                    }
                `}>
                    <input 
                        type="text"
                        className={`
                            w-full pl-4 pr-10 py-3 bg-transparent border-none text-white placeholder-white/40 focus:ring-0 text-sm font-bold outline-none
                            ${selectedUser ? 'cursor-default' : ''}
                        `}
                        placeholder="Select Customer..."
                        value={query}
                        onChange={(e) => { 
                            if (!selectedUser) {
                                setQuery(e.target.value); 
                                setIsOpen(true); 
                            }
                        }}
                        onClick={() => !selectedUser && setIsOpen(true)}
                        readOnly={!!selectedUser}
                    />
                    
                    {/* Icons */}
                    <div className="absolute right-3 flex items-center">
                        {selectedUser ? (
                            <button 
                                onClick={handleClear}
                                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition"
                            >
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        ) : (
                            <i className="fas fa-search text-white/30 text-xs"></i>
                        )}
                    </div>
                </div>

                {/* Dropdown Menu */}
                {isOpen && !selectedUser && (
                    <div className="absolute top-full left-0 w-full mt-2 max-h-64 overflow-y-auto custom-scrollbar bg-[#2d2b55] border border-white/20 rounded-xl shadow-2xl z-[100] animate-slide-down">
                         {filtered.length === 0 ? (
                            <div className="p-4 text-center text-white/50 text-xs">No customer found.</div>
                        ) : (
                            filtered.map(user => (
                                <div 
                                    key={user.id}
                                    onClick={() => handleSelect(user)}
                                    className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-white font-bold text-sm">{user.name}</span>
                                        <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">{user.username}</span>
                                    </div>
                                    <div className="text-xs text-white/40 mt-0.5">{user.mobile}</div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Credit Info Bar (Only when selected) */}
            {selectedUser && (
                <div className="mt-3 bg-black/20 rounded-lg px-3 py-2 flex justify-between items-center text-[10px] font-bold border border-white/5">
                    <span className="text-white/50">Credit Limit: {currency} {selectedUser.creditLimit}</span>
                    <span className={`${avail > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        Avail: {currency} {avail}
                    </span>
                </div>
            )}
        </div>
    );
};

// --- MAIN POS COMPONENT ---

export const POSPage: React.FC = () => {
  const { currentUser, inventory, users, createInvoice, settings } = useStore();
  
  // State
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [discount, setDiscount] = useState<number>(0);

  // Permission Check
  if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.CASHIER)) {
      return (
          <div className="flex items-center justify-center h-full">
              <Card className="text-center p-10">
                  <i className="fas fa-lock text-4xl text-red-400 mb-4"></i>
                  <h2 className="text-2xl font-bold text-white">Access Denied</h2>
              </Card>
          </div>
      );
  }

  // Data Logic
  const categories = ['ALL', ...Array.from(new Set(inventory.map(i => i.category).filter(Boolean)))];

  const filteredItems = inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      return matchesSearch && matchesCategory && item.status !== 'OUT_OF_STOCK';
  });

  const addToCart = (item: InventoryItem) => {
      const existing = cart.find(c => c.itemId === item.id);
      const currentQtyInCart = existing ? existing.qty : 0;
      if (currentQtyInCart + 1 > item.qty) return alert(`Insufficient stock! Only ${item.qty} available.`);

      if (existing) {
          setCart(cart.map(c => c.itemId === item.id ? { ...c, qty: c.qty + 1, total: (c.qty + 1) * c.price } : c));
      } else {
          setCart([...cart, { itemId: item.id, itemName: item.name, qty: 1, price: item.price, total: item.price }]);
      }
  };

  const updateQty = (itemId: string, delta: number) => {
      const existing = cart.find(c => c.itemId === itemId);
      if (!existing) return;
      const itemInStock = inventory.find(i => i.id === itemId);
      if (!itemInStock) return;

      const newQty = existing.qty + delta;
      if (newQty <= 0) return setCart(cart.filter(c => c.itemId !== itemId));
      if (newQty > itemInStock.qty) return alert("Max stock reached");

      setCart(cart.map(c => c.itemId === itemId ? { ...c, qty: newQty, total: newQty * c.price } : c));
  };

  const removeFromCart = (itemId: string) => setCart(cart.filter(c => c.itemId !== itemId));
  const clearCart = () => { if(confirm("Clear current sale?")) { setCart([]); setSelectedUser(null); setDiscount(0); } };

  const handleCheckout = (paymentType: 'CASH' | 'CREDIT') => {
      if (cart.length === 0) return alert("Cart is empty");
      if (paymentType === 'CREDIT') {
          if (!selectedUser) return alert("Customer must be selected for Credit Sale.");
          const total = Math.max(0, cart.reduce((a,b) => a + b.total, 0) - discount);
          const available = selectedUser.creditLimit - selectedUser.currentBalance;
          if (total > available) return alert(`Credit Limit Exceeded! Available: ${settings.currency} ${available}`);
      }

      const finalTotal = Math.max(0, cart.reduce((a,b) => a + b.total, 0) - discount);
      createInvoice({
          id: `POS-${Date.now().toString().slice(-6)}`,
          customerId: selectedUser ? selectedUser.id : 'WALK_IN',
          customerName: selectedUser ? selectedUser.name : 'Walk-in Customer',
          date: new Date().toISOString(),
          items: cart,
          totalAmount: finalTotal,
          status: paymentType === 'CASH' ? 'PAID' : 'UNPAID',
          type: 'SINGLE_DAY',
          proofOfPayment: paymentType === 'CASH' ? 'POS Cash Sale' : undefined
      });
      setCart([]); setSelectedUser(null); setDiscount(0);
      alert(paymentType === 'CASH' ? "Sale Completed (Cash)!" : "Invoice Saved to Account!");
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-12 gap-6">
      
      {/* --- LEFT PANEL: CATALOG (8 Cols) --- */}
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 h-full">
          
          {/* Search & Filter Block */}
          <div className="glass rounded-3xl p-5 flex-shrink-0 shadow-lg border border-white/20">
              <div className="flex flex-col gap-4">
                  {/* Search Input */}
                  <div className="relative w-full">
                      <i className="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50"></i>
                      <input 
                          type="text" 
                          className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-lg font-bold placeholder-white/50 focus:ring-2 focus:ring-white/20 transition-all bg-black/10 border-white/10"
                          placeholder="Scan Barcode or Search Item..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          autoFocus
                      />
                  </div>
                  
                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                          <button
                              key={cat}
                              onClick={() => setCategoryFilter(cat)}
                              className={`
                                  px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 border
                                  ${categoryFilter === cat 
                                      ? 'bg-white text-blue-900 border-white scale-105 shadow-md' 
                                      : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20'
                                  }
                              `}
                          >
                              {cat}
                          </button>
                      ))}
                  </div>
              </div>
          </div>

          {/* Item List Table */}
          <div className="glass rounded-3xl flex-1 overflow-hidden flex flex-col shadow-lg border border-white/20 relative">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-bold text-white/50 uppercase tracking-wider">
                  <div className="col-span-6 pl-2">Item Details</div>
                  <div className="col-span-2 text-center">Stock</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-2 text-center">Action</div>
              </div>

              {/* Table Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredItems.map(item => (
                      <div 
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="grid grid-cols-12 gap-4 p-3 items-center border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                          {/* Item Info */}
                          <div className="col-span-6 flex items-center gap-3 pl-2">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-lg border border-white/10
                                    bg-gradient-to-br from-white/10 to-white/5
                              `}>
                                  {item.category ? item.category.charAt(0) : 'I'}
                              </div>
                              <div className="min-w-0">
                                  <h4 className="text-white font-bold text-sm truncate group-hover:text-blue-200 transition-colors">{item.name}</h4>
                                  <div className="flex items-center gap-2 text-xs text-white/50">
                                      <span className="font-mono uppercase">{item.sku || 'NO SKU'}</span>
                                      <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                      <span>{item.category}</span>
                                  </div>
                              </div>
                          </div>

                          {/* Stock */}
                          <div className="col-span-2 text-center">
                              <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border ${
                                  item.qty < 10 
                                  ? 'bg-red-500/10 border-red-500/20 text-red-200' 
                                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                              }`}>
                                  <span className="text-xs font-bold">{item.qty}</span>
                              </div>
                          </div>

                          {/* Price */}
                          <div className="col-span-2 text-right">
                              <span className="font-bold text-white">{item.price.toFixed(2)}</span>
                              <span className="text-[10px] text-white/40 block">MVR</span>
                          </div>

                          {/* Action */}
                          <div className="col-span-2 flex justify-center">
                               <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all group-hover:scale-110 group-hover:bg-blue-500/20 group-hover:border-blue-400/30">
                                  <i className="fas fa-plus text-xs"></i>
                               </button>
                          </div>
                      </div>
                  ))}
                  
                  {/* Empty State */}
                  {filteredItems.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 opacity-50">
                          <i className="fas fa-search text-4xl mb-4 text-white/50"></i>
                          <p className="text-white font-medium">No items found matching your search.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* --- RIGHT PANEL: TRANSACTION (4 Cols) --- */}
      <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-4">
          
          {/* Customer Card (Z-Index High) */}
          <div className="glass rounded-3xl p-5 flex-shrink-0 border border-white/20 shadow-lg relative z-20">
              <POSCustomerSelector 
                  users={users}
                  selectedUser={selectedUser}
                  onSelect={setSelectedUser}
                  currency={settings.currency}
              />
          </div>

          {/* Cart Card (Z-Index Lower) */}
          <div className="glass rounded-3xl flex-1 flex flex-col overflow-hidden border border-white/20 shadow-lg relative z-10">
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md z-10">
                  <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                      <i className="fas fa-shopping-cart"></i> Current Sale
                  </h3>
                  {cart.length > 0 && (
                      <button onClick={clearCart} className="text-xs text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/50 px-2 py-1 rounded transition-all">
                          Clear
                      </button>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 relative">
                  {cart.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 pointer-events-none">
                          <i className="fas fa-cash-register text-5xl mb-3"></i>
                          <p className="font-bold">Cart is empty</p>
                          <p className="text-xs">Select items from catalog</p>
                      </div>
                  ) : (
                      cart.map(item => (
                          <div key={item.itemId} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all flex items-center group animate-slide-down">
                              <div className="flex-1 min-w-0 mr-2">
                                  <p className="text-white font-bold text-sm truncate">{item.itemName}</p>
                                  <p className="text-white/40 text-xs">@ {item.price}</p>
                              </div>
                              
                              <div className="flex items-center gap-1 bg-black/20 rounded-lg px-1 py-1">
                                  <button onClick={() => updateQty(item.itemId, -1)} className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded transition"><i className="fas fa-minus text-[10px]"></i></button>
                                  <span className="font-bold text-white w-6 text-center text-sm">{item.qty}</span>
                                  <button onClick={() => updateQty(item.itemId, 1)} className="w-7 h-7 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded transition"><i className="fas fa-plus text-[10px]"></i></button>
                              </div>

                              <div className="text-right min-w-[70px] ml-2">
                                  <p className="text-white font-bold">{settings.currency} {item.total}</p>
                                  <button onClick={() => removeFromCart(item.itemId)} className="text-[10px] text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* Totals Card */}
          <div className="glass rounded-3xl p-6 flex-shrink-0 border border-white/20 shadow-lg bg-gradient-to-b from-white/10 to-white/5 z-10">
              <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-white text-sm font-medium">
                      <span className="opacity-60">Subtotal</span>
                      <span className="font-bold">{settings.currency} {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-white text-sm font-medium">
                      <span className="opacity-60">Discount</span>
                      <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1 border border-white/10">
                          <span className="text-xs opacity-50">- {settings.currency}</span>
                          <input 
                              type="number" 
                              className="w-16 bg-transparent text-right text-white text-sm focus:outline-none font-bold"
                              value={discount}
                              onChange={(e) => setDiscount(Number(e.target.value))}
                              min="0"
                          />
                      </div>
                  </div>
              </div>

              <div className="border-t border-white/10 pt-5 mb-6">
                  <div className="flex justify-between items-end">
                      <span className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">GRAND TOTAL</span>
                      <span className="text-3xl font-bold text-white tracking-tight">{settings.currency} {grandTotal.toFixed(2)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <button 
                      onClick={() => handleCheckout('CREDIT')}
                      disabled={cart.length === 0}
                      className="group relative overflow-hidden rounded-xl bg-indigo-600/30 border border-indigo-500/30 p-4 text-center transition-all hover:bg-indigo-600/50 hover:border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <div className="relative z-10">
                          <div className="font-bold text-indigo-100 text-sm group-hover:text-white transition-colors flex flex-col items-center justify-center gap-1">
                              <i className="fas fa-file-invoice text-lg"></i> 
                              Charge Account
                          </div>
                          <div className="text-[10px] text-indigo-200/60 mt-1 group-hover:text-indigo-100/80">Create Unpaid Invoice</div>
                      </div>
                  </button>

                  <button 
                      onClick={() => handleCheckout('CASH')}
                      disabled={cart.length === 0}
                      className="group relative overflow-hidden rounded-xl bg-emerald-600/30 border border-emerald-500/30 p-4 text-center transition-all hover:bg-emerald-600/50 hover:border-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                       <div className="relative z-10">
                          <div className="font-bold text-emerald-100 text-sm group-hover:text-white transition-colors flex flex-col items-center justify-center gap-1">
                              <i className="fas fa-money-bill-wave text-lg"></i> 
                              Cash Sale
                          </div>
                          <div className="text-[10px] text-emerald-200/60 mt-1 group-hover:text-emerald-100/80">Mark Paid Immediately</div>
                      </div>
                  </button>
              </div>
          </div>

      </div>
    </div>
  );
};
