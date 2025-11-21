
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../services/store';
import { Card, Button, Input, Select, Badge, GlassDatePicker } from '../components/GlassComponents';
import { Invoice, UserRole, User } from '../types';

// Declare html2pdf global
declare var html2pdf: any;

// --- TYPES ---

interface ReportItem {
  date: string;
  id: string; // Invoice ID or Item ID
  refId?: string; // Invoice ID for Detailed view
  description: string;
  qty?: number;
  price?: number;
  amount: number;
}

// --- INTERNAL COMPONENT: SEARCHABLE CUSTOMER SELECT ---

const CustomerSearchInput: React.FC<{
    users: User[];
    onSelect: (userId: string) => void;
    selectedId: string;
}> = ({ users, onSelect, selectedId }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter eligible customers (non-admins/non-staff for report generation)
    const customers = useMemo(() => users.filter(u => 
        u.role === UserRole.CUSTOMER_INHOUSE || u.role === UserRole.CUSTOMER_DELIVERY
    ), [users]);

    // Update query if selectedId changes externally
    useEffect(() => {
        if (selectedId) {
            const user = customers.find(u => u.id === selectedId);
            if (user) setQuery(user.name);
        } else {
            setQuery('');
        }
    }, [selectedId, customers]);

    // Filter based on type
    const filtered = customers.filter(u => 
        u.name.toLowerCase().includes(query.toLowerCase()) || 
        u.mobile.includes(query) ||
        (u.redboxId && u.redboxId.toLowerCase().includes(query.toLowerCase()))
    );

    // Close on click outside
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
        onSelect(user.id);
        setIsOpen(false);
    };

    return (
        <div className="relative mb-4" ref={wrapperRef}>
            <label className="block text-white/80 text-sm font-medium mb-1 ml-1">Select Customer</label>
            <div className="relative">
                <input 
                    type="text"
                    className="w-full px-4 py-3 rounded-xl glass-input text-white placeholder-white/50 focus:ring-2 focus:ring-white/20"
                    placeholder="Type Name, Mobile or ID..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); if(e.target.value === '') onSelect(''); }}
                    onClick={() => setIsOpen(true)}
                />
                {query && selectedId && (
                    <button 
                        onClick={() => { setQuery(''); onSelect(''); setIsOpen(true); }}
                        className="absolute right-3 top-3.5 text-white/40 hover:text-white"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto custom-scrollbar bg-gray-900/95 backdrop-blur-xl border border-white/30 rounded-xl shadow-2xl">
                    {filtered.length === 0 ? (
                        <div className="p-3 text-white/50 text-sm text-center">No customers found</div>
                    ) : (
                        filtered.map(user => (
                            <div 
                                key={user.id}
                                onClick={() => handleSelect(user)}
                                className="p-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-white font-bold text-sm">{user.name}</span>
                                    <span className="text-xs text-white/50 font-mono">{user.redboxId}</span>
                                </div>
                                <div className="text-xs text-white/60 mt-0.5">{user.mobile}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---

export const InvoiceManager: React.FC = () => {
  const { invoices, updateInvoiceStatus, users, settings, currentUser, inventory } = useStore();
  
  // View State
  const [activeView, setActiveView] = useState<'LIST' | 'SINGLE' | 'GENERATOR' | 'REPORT'>('LIST');
  
  // Search & Filter State (List View)
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Single Invoice View State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Derived state for the single view (reactive)
  const selectedInvoice = useMemo(() => 
    invoices.find(i => i.id === selectedInvoiceId) || null
  , [invoices, selectedInvoiceId]);

  // Admin Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payFile, setPayFile] = useState<string | null>(null);

  // --- GENERATOR STATE ---
  const [genConfig, setGenConfig] = useState({
    customerId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: 'SUMMARY' as 'SUMMARY' | 'DETAILED'
  });

  const [generatedReport, setGeneratedReport] = useState<{
    customerName: string;
    customer: User | undefined;
    items: ReportItem[];
    total: number;
    title: string;
  } | null>(null);


  // --- HELPERS ---
  const handlePrint = () => {
      const isReport = activeView === 'REPORT';
      const elementId = isReport ? 'report-print-area' : 'print-area';
      const element = document.getElementById(elementId);
      
      if (!element) {
          alert("Print element not found.");
          return;
      }

      const filename = isReport 
        ? `Statement_${generatedReport?.customerName || 'Report'}_${genConfig.startDate}.pdf`
        : `Invoice_${selectedInvoice?.id || 'doc'}.pdf`;

      if (typeof html2pdf !== 'undefined') {
          const opt = {
              margin: 0,
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          
          // Temporarily remove shadows for cleaner PDF
          const originalBoxShadow = element.style.boxShadow;
          element.style.boxShadow = 'none';

          html2pdf().set(opt).from(element).save().then(() => {
              // Restore styles
              element.style.boxShadow = originalBoxShadow;
          }).catch((err: any) => {
              console.error("PDF Generation Failed", err);
              element.style.boxShadow = originalBoxShadow;
              window.print(); // Fallback
          });
      } else {
          window.print();
      }
  };

  const getSku = (itemId: string) => inventory.find(i => i.id === itemId)?.sku || 'N/A';
  
  // --- PERMISSION HELPERS ---
  const canApprove = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.FINANCE;

  // --- ADMIN PAYMENT LOGIC ---
  const openPayModal = (method: 'CASH' | 'BANK') => {
      setPayMethod(method);
      setPayDate(new Date().toISOString().split('T')[0]);
      setPayFile(null);
      setShowPayModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setPayFile(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const confirmPayment = () => {
      if (!selectedInvoice) return;
      if (payMethod === 'CASH' && !payDate) return alert("Please select a payment date.");
      if (payMethod === 'BANK' && !payFile) return alert("Please upload the payment receipt.");
      
      const proof = payMethod === 'BANK' ? payFile : `Paid in Cash - ${payDate}`;
      updateInvoiceStatus(selectedInvoice.id, 'PAID', proof as string);
      setShowPayModal(false);
  };

  // --- GENERATOR LOGIC (REBUILT) ---
  const generateReport = () => {
      if (!genConfig.customerId) return alert("Please select a customer");

      const customer = users.find(u => u.id === genConfig.customerId);
      
      // Normalize Date Objects (Strip Time)
      const start = new Date(genConfig.startDate);
      start.setHours(0,0,0,0);
      
      const end = new Date(genConfig.endDate);
      end.setHours(23,59,59,999);

      // Filter Invoices
      const relevantInvoices = invoices.filter(inv => {
          const invDate = new Date(inv.date);
          // Strip time from invoice date for accurate comparison
          const invDateOnly = new Date(invDate.getFullYear(), invDate.getMonth(), invDate.getDate());
          
          return (
            inv.customerId === genConfig.customerId &&
            invDateOnly >= start && 
            invDateOnly <= end &&
            inv.status !== 'PAID' // Only outstanding
          );
      });

      if (relevantInvoices.length === 0) {
          alert("No unpaid invoices found for this period.");
          return;
      }

      let reportItems: ReportItem[] = [];
      let total = 0;

      if (genConfig.type === 'SUMMARY') {
          // CONSOLIDATED: One row per Invoice
          relevantInvoices.forEach(inv => {
              reportItems.push({
                  date: inv.date,
                  id: inv.id,
                  description: `Outstanding Invoice #${inv.id}`,
                  amount: inv.totalAmount
              });
              total += inv.totalAmount;
          });
      } else {
          // DETAILED: One row per Item
          relevantInvoices.forEach(inv => {
              inv.items.forEach(item => {
                  reportItems.push({
                      date: inv.date,
                      id: item.itemId,
                      refId: inv.id,
                      description: item.itemName,
                      qty: item.qty,
                      price: item.price,
                      amount: item.total
                  });
                  total += item.total;
              });
          });
      }

      setGeneratedReport({
          customerName: customer?.name || 'Unknown',
          customer: customer,
          items: reportItems,
          total: total,
          title: genConfig.type === 'SUMMARY' ? 'Statement of Accounts' : 'Detailed Unpaid Invoice Report'
      });
      setActiveView('REPORT');
  };


  // --- RENDER VARIABLES ---
  const statusOptions = [
      { value: 'ALL', label: 'All Status' },
      { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
      { value: 'PAID', label: 'Paid' },
      { value: 'UNPAID', label: 'Unpaid' },
  ];

  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = filter === 'ALL' || inv.status === filter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
        inv.customerName.toLowerCase().includes(searchLower) ||
        inv.id.toLowerCase().includes(searchLower) ||
        inv.totalAmount.toString().includes(searchLower);
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 relative">
      
      {/* TOP NAVIGATION */}
      {activeView !== 'SINGLE' && activeView !== 'REPORT' && (
           <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">Invoices & Statements</h2>
                <div className="flex gap-2">
                    <Button 
                        variant={activeView === 'LIST' ? 'primary' : 'secondary'} 
                        onClick={() => setActiveView('LIST')}
                    >
                        <i className="fas fa-list mr-2"></i> List
                    </Button>
                    <Button 
                        variant={activeView === 'GENERATOR' ? 'primary' : 'secondary'} 
                        onClick={() => setActiveView('GENERATOR')}
                    >
                        <i className="fas fa-file-contract mr-2"></i> Generator
                    </Button>
                </div>
           </div>
      )}

      {/* 1. LIST VIEW */}
      {activeView === 'LIST' && (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <i className="fas fa-search absolute left-3 top-4 text-white/50"></i>
                    <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 rounded-xl glass-input"
                        placeholder="Search ID, Customer or Amount..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-48">
                    <Select value={filter} onChange={(e) => setFilter(e.target.value)} options={statusOptions} />
                </div>
            </div>

            <Card>
                <table className="w-full text-left text-white">
                    <thead>
                        <tr className="border-b border-white/20 text-white/60">
                            <th className="p-3">ID</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInvoices.length === 0 && (
                            <tr><td colSpan={6} className="p-4 text-center text-white/50">No invoices found.</td></tr>
                        )}
                        {filteredInvoices.map(inv => (
                            <tr key={inv.id} className="border-b border-white/10 hover:bg-white/5">
                                <td className="p-3 font-mono text-sm">{inv.id}</td>
                                <td className="p-3">{inv.customerName}</td>
                                <td className="p-3">{new Date(inv.date).toLocaleDateString()}</td>
                                <td className="p-3 font-bold">{settings.currency} {inv.totalAmount}</td>
                                <td className="p-3">
                                    <Badge color={inv.status === 'PAID' ? 'green' : inv.status === 'UNPAID' ? 'red' : 'yellow'}>
                                        {inv.status.replace('_', ' ')}
                                    </Badge>
                                </td>
                                <td className="p-3">
                                    <Button variant="secondary" className="text-xs px-3 py-1" onClick={() => { setSelectedInvoiceId(inv.id); setActiveView('SINGLE'); }}>
                                        View
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
      )}

      {/* 2. GENERATOR VIEW */}
      {activeView === 'GENERATOR' && (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <Card>
                <h3 className="text-xl font-bold text-white mb-6">Generate Outstanding Statement</h3>
                
                <div className="space-y-4">
                    <CustomerSearchInput 
                        users={users}
                        selectedId={genConfig.customerId}
                        onSelect={(id) => setGenConfig({...genConfig, customerId: id})}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <GlassDatePicker 
                            label="Start Date" 
                            value={genConfig.startDate}
                            onChange={(date) => setGenConfig({...genConfig, startDate: date})}
                        />
                        <GlassDatePicker 
                            label="End Date" 
                            value={genConfig.endDate}
                            onChange={(date) => setGenConfig({...genConfig, endDate: date})}
                        />
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <label className="block text-white/80 text-sm font-medium mb-3">Report Type</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <label className={`flex items-center gap-3 cursor-pointer text-white p-3 rounded-lg border transition-all flex-1 ${genConfig.type === 'SUMMARY' ? 'bg-blue-500/20 border-blue-400' : 'hover:bg-white/5 border-transparent'}`}>
                                <input 
                                    type="radio" 
                                    name="type" 
                                    checked={genConfig.type === 'SUMMARY'} 
                                    onChange={() => setGenConfig({...genConfig, type: 'SUMMARY'})}
                                    className="w-4 h-4 accent-blue-500"
                                />
                                <div>
                                    <span className="block font-bold text-sm">Consolidated Statement</span>
                                    <span className="text-xs text-white/60">Lists Outstanding Invoice #s.</span>
                                </div>
                            </label>
                            <label className={`flex items-center gap-3 cursor-pointer text-white p-3 rounded-lg border transition-all flex-1 ${genConfig.type === 'DETAILED' ? 'bg-blue-500/20 border-blue-400' : 'hover:bg-white/5 border-transparent'}`}>
                                <input 
                                    type="radio" 
                                    name="type" 
                                    checked={genConfig.type === 'DETAILED'} 
                                    onChange={() => setGenConfig({...genConfig, type: 'DETAILED'})}
                                    className="w-4 h-4 accent-blue-500"
                                />
                                <div>
                                    <span className="block font-bold text-sm">Detailed Report</span>
                                    <span className="text-xs text-white/60">Lists every item unpaid.</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <Button onClick={generateReport} className="w-full mt-4 py-3 shadow-lg shadow-blue-900/20">
                        <i className="fas fa-file-pdf mr-2"></i> Generate Statement
                    </Button>
                </div>
            </Card>
        </div>
      )}

      {/* 3. SINGLE INVOICE DISPLAY */}
      {activeView === 'SINGLE' && selectedInvoice && (
        <div className="animate-fade-in">
             {/* Action Bar */}
             <div className="flex justify-between items-center mb-6 no-print">
                <Button variant="secondary" onClick={() => { setSelectedInvoiceId(null); setActiveView('LIST'); }}>
                    <i className="fas fa-arrow-left mr-2"></i> Back
                </Button>
                <div className="flex gap-3">
                    {selectedInvoice.status === 'PENDING_APPROVAL' && canApprove && (
                        <>
                            <Button variant="danger" onClick={() => updateInvoiceStatus(selectedInvoice.id, 'UNPAID')}>Reject</Button>
                            <Button variant="success" onClick={() => updateInvoiceStatus(selectedInvoice.id, 'PAID')}>Approve Payment</Button>
                        </>
                    )}
                    
                    {/* Admin/Finance Manual Payment Override */}
                    {canApprove && selectedInvoice.status === 'UNPAID' && (
                        <>
                            <Button 
                                className="bg-emerald-600/30 hover:bg-emerald-600/50 border-emerald-500/40 text-white" 
                                onClick={() => openPayModal('CASH')}
                            >
                                <i className="fas fa-money-bill-wave mr-2"></i> Cash Pay
                            </Button>
                            <Button 
                                className="bg-blue-600/30 hover:bg-blue-600/50 border-blue-500/40 text-white" 
                                onClick={() => openPayModal('BANK')}
                            >
                                <i className="fas fa-university mr-2"></i> Bank Pay
                            </Button>
                        </>
                    )}

                    <Button onClick={handlePrint}>
                        <i className="fas fa-print mr-2"></i> Print / PDF
                    </Button>
                </div>
            </div>

            {/* --- INVOICE PAPER (UPDATED LAYOUT) --- */}
            <div id="print-area" className="bg-white text-black font-sans max-w-[210mm] mx-auto p-10 min-h-[297mm] relative shadow-xl flex flex-col">
                
                {/* 1. Header (UPDATED WITH LOGO & SETTINGS) */}
                <div className="flex justify-between items-start mb-10">
                    <div className="flex gap-4">
                         {settings.logo ? (
                            <img src={settings.logo} className="w-20 h-20 object-contain" alt="Logo" />
                        ) : (
                            <div className="w-20 h-20 bg-gray-900 text-white flex items-center justify-center rounded-lg text-3xl font-bold shadow-sm">
                                {settings.shopName.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{settings.shopName}</h1>
                            <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                                <p>{settings.island || "Male'"}, {settings.country || "Maldives"}</p>
                                <p>Contact: {settings.contactNumber || "+960 777-0000"}</p>
                                <p>Email: {settings.email || "support@fridgemv.com"}</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice</h2>
                        <p className="text-2xl font-bold text-gray-900">#{selectedInvoice.id}</p>
                        <div className="text-xs text-gray-500 mt-1">
                            <p>Date: {new Date(selectedInvoice.date).toLocaleDateString()}</p>
                            {/* Add Cashier/Admin name if available, or placeholder */}
                        </div>
                    </div>
                </div>

                {/* 2. Customer & Invoice Details */}
                <div className="grid grid-cols-2 gap-10 mb-10 border-t border-b border-gray-100 py-6">
                    {/* Left: Customer */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Bill To</h3>
                        <p className="font-bold text-gray-900 text-lg">{selectedInvoice.customerName}</p>
                        <p className="text-sm text-gray-600 mt-1">{users.find(u => u.id === selectedInvoice.customerId)?.address || 'No Address Provided'}</p>
                        <div className="mt-3 space-y-1 text-sm text-gray-600">
                            <div className="flex gap-2">
                                <span className="w-20 text-gray-400">Mobile:</span>
                                <span className="font-medium">{users.find(u => u.id === selectedInvoice.customerId)?.mobile || 'N/A'}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="w-20 text-gray-400">Redbox ID:</span>
                                <span className="font-medium">{users.find(u => u.id === selectedInvoice.customerId)?.redboxId || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Invoice Info */}
                    <div>
                         <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Payment Details</h3>
                         <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex justify-between border-b border-gray-50 pb-1">
                                <span>Payment Status:</span>
                                <span className={`font-bold uppercase ${selectedInvoice.status === 'PAID' ? 'text-emerald-600' : 'text-red-500'}`}>{selectedInvoice.status.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-1 pt-1">
                                <span>Payment Method:</span>
                                <span className="font-medium text-gray-900">{selectedInvoice.proofOfPayment?.includes('Cash') ? 'Cash' : 'Bank Transfer'}</span>
                            </div>
                             <div className="flex justify-between border-b border-gray-50 pb-1 pt-1">
                                <span>Issued By:</span>
                                <span className="font-medium text-gray-900">Admin</span>
                            </div>
                         </div>
                    </div>
                </div>

                {/* 3. Item Table */}
                <div className="mb-6">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                                <th className="py-3 px-4 text-left rounded-l-lg">Item Name</th>
                                <th className="py-3 px-4 text-center">Qty</th>
                                <th className="py-3 px-4 text-right">Unit Price</th>
                                <th className="py-3 px-4 text-right">Discount</th>
                                <th className="py-3 px-4 text-right rounded-r-lg">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {selectedInvoice.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3 px-4">
                                        <p className="font-bold text-gray-900">{item.itemName}</p>
                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {getSku(item.itemId)}</p>
                                    </td>
                                    <td className="py-3 px-4 text-center font-medium">{item.qty}</td>
                                    <td className="py-3 px-4 text-right">{settings.currency} {item.price.toFixed(2)}</td>
                                    <td className="py-3 px-4 text-right text-gray-400">-</td> 
                                    <td className="py-3 px-4 text-right font-bold text-gray-900">{settings.currency} {item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. Totals Section */}
                <div className="flex justify-end mb-10">
                    <div className="w-72 bg-gray-50 rounded-lg p-6 border border-gray-100">
                        {(() => {
                            const subtotal = selectedInvoice.items.reduce((sum, i) => sum + i.total, 0);
                            const discount = subtotal - selectedInvoice.totalAmount;
                            return (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal</span>
                                        <span className="font-medium">{settings.currency} {subtotal.toFixed(2)}</span>
                                    </div>
                                    {discount > 0.01 && (
                                        <div className="flex justify-between text-sm text-emerald-600">
                                            <span>Discount</span>
                                            <span>- {settings.currency} {discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>GST (0%)</span>
                                        <span className="font-medium">{settings.currency} 0.00</span>
                                    </div>
                                    <div className="h-px bg-gray-200 my-2"></div>
                                    <div className="flex justify-between text-lg font-bold text-gray-900">
                                        <span>Grand Total</span>
                                        <span>{settings.currency} {selectedInvoice.totalAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-1 pt-1 border-t border-gray-200 border-dashed">
                                        <span>Paid Amount</span>
                                        <span>{settings.currency} {selectedInvoice.status === 'PAID' ? selectedInvoice.totalAmount.toFixed(2) : '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-900 font-bold">
                                        <span>Balance Due</span>
                                        <span>{settings.currency} {selectedInvoice.status === 'PAID' ? '0.00' : selectedInvoice.totalAmount.toFixed(2)}</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* 5. Payment Instructions (FIXED BLOCK) */}
                <div className="mt-auto mb-8 p-6 rounded-xl border border-gray-200 bg-slate-50">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2">Payment Instructions</h4>
                    <p className="text-sm text-gray-600 mb-4">Please settle the due amount to the following bank account:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{settings.bankDetails}</p>
                </div>

                {/* 6. Footer */}
                <div className="text-center border-t border-gray-100 pt-6">
                    <p className="text-gray-900 font-bold text-sm mb-1">Thank you for shopping with us!</p>
                </div>

            </div>

             {/* Proof Display */}
             {selectedInvoice.proofOfPayment && (
                 <div className="mt-8 max-w-3xl mx-auto no-print">
                    <h4 className="text-white font-bold mb-4">Payment Proof / Note</h4>
                    <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                        {selectedInvoice.proofOfPayment.startsWith('data:image') ? (
                             <img 
                                src={selectedInvoice.proofOfPayment} 
                                alt="Receipt" 
                                className="max-w-sm rounded border border-white/20 shadow-lg"
                             />
                        ) : (
                             <p className="text-white font-mono">{selectedInvoice.proofOfPayment}</p>
                        )}
                    </div>
                 </div>
             )}
        </div>
      )}

      {/* 4. GENERATED REPORT DISPLAY */}
      {activeView === 'REPORT' && generatedReport && (
           <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6 no-print">
                    <Button variant="secondary" onClick={() => setActiveView('GENERATOR')}>
                        <i className="fas fa-arrow-left mr-2"></i> Back
                    </Button>
                    <Button onClick={handlePrint}>
                        <i className="fas fa-print mr-2"></i> Print / PDF
                    </Button>
                </div>

                {/* Report Paper */}
                <div id="report-print-area" className="bg-white text-black font-sans max-w-[800px] mx-auto p-8 rounded-xl shadow-xl">
                    
                    {/* 1. Header */}
                    <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-start">
                        <div className="flex gap-4">
                             {settings.logo ? (
                                <img src={settings.logo} className="w-16 h-16 object-contain" alt="Logo" />
                            ) : (
                                <div className="w-16 h-16 bg-gray-900 text-white flex items-center justify-center rounded-lg text-2xl font-bold shadow-sm">
                                    {settings.shopName.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-gray-900">{settings.shopName}</h1>
                                <p className="text-gray-500 text-sm mt-1">Statement of Accounts</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold uppercase text-gray-400 mb-1">Date Generated</div>
                            <div className="font-bold text-gray-900">{new Date().toLocaleDateString()}</div>
                        </div>
                    </div>

                    {/* 2. Info Block */}
                    <div className="flex justify-between gap-6 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div>
                            <h3 className="text-xs font-bold uppercase text-gray-400 mb-1">Customer</h3>
                            <p className="font-bold text-lg text-gray-800">{generatedReport.customerName}</p>
                            <p className="text-gray-600 text-sm">{generatedReport.customer?.mobile}</p>
                        </div>
                        <div className="text-right">
                             <h3 className="text-xs font-bold uppercase text-gray-400 mb-1">Period</h3>
                             <p className="text-gray-800 font-medium">{genConfig.startDate}</p>
                             <p className="text-gray-500 text-xs">to</p>
                             <p className="text-gray-800 font-medium">{genConfig.endDate}</p>
                        </div>
                    </div>

                    {/* 3. Table */}
                    <div className="mb-6">
                         <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-100 text-gray-500 uppercase text-xs tracking-wider">
                                    <th className="text-left py-3 pl-2">Date</th>
                                    <th className="text-left py-3">Description</th>
                                    {genConfig.type === 'DETAILED' && (
                                        <>
                                            <th className="text-center py-3">Qty</th>
                                            <th className="text-right py-3">Unit Price</th>
                                        </>
                                    )}
                                    <th className="text-right py-3 pr-2">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700">
                                {generatedReport.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-50">
                                        <td className="py-3 pl-2 whitespace-nowrap w-24">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="py-3 font-medium text-gray-900">
                                            {item.description}
                                            {item.refId && <span className="block text-[10px] text-gray-400">Ref: {item.refId}</span>}
                                        </td>
                                        {genConfig.type === 'DETAILED' && (
                                            <>
                                                <td className="py-3 text-center">{item.qty}</td>
                                                <td className="py-3 text-right">{settings.currency} {item.price?.toFixed(2)}</td>
                                            </>
                                        )}
                                        <td className="py-3 text-right pr-2 font-bold">{settings.currency} {item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    </div>

                    {/* 4. Totals */}
                    <div className="flex justify-end mb-8">
                        <div className="w-full md:w-1/2 border border-gray-200 rounded-xl p-5 bg-gray-50/50">
                            <div className="flex justify-between text-lg font-bold text-gray-900">
                                <span>Total Outstanding</span>
                                <span className="text-red-600">{settings.currency} {generatedReport.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* 5. Payment Instructions */}
                    <div className="border border-gray-200 rounded-xl p-5 mb-8 bg-blue-50/30 page-break-inside-avoid">
                        <h3 className="text-sm font-bold text-gray-800 mb-2">Bank Transfer Details</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{settings.bankDetails}</p>
                    </div>

                    <div className="text-center text-xs text-gray-400 mt-8">
                        <p>Generated by Fridge MV POS</p>
                    </div>
                </div>
           </div>
      )}

      {/* 5. ADMIN PAYMENT MODAL */}
      {showPayModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in no-print">
              <div className="glass-heavy p-6 rounded-2xl w-full max-w-md space-y-6 shadow-2xl border border-white/20 animate-slide-down">
                  <div className="border-b border-white/10 pb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          {payMethod === 'CASH' ? <i className="fas fa-money-bill-wave text-green-400"></i> : <i className="fas fa-university text-blue-400"></i>}
                          {payMethod === 'CASH' ? 'Confirm Cash Payment' : 'Confirm Bank Transfer'}
                      </h3>
                      <p className="text-white/50 text-sm mt-1">Marking Invoice #{selectedInvoice?.id} as Paid.</p>
                  </div>
                  
                  {payMethod === 'CASH' && (
                      <div className="space-y-2">
                          <label className="block text-white/80 text-sm font-medium">Payment Received Date</label>
                          <GlassDatePicker 
                              value={payDate} 
                              onChange={setPayDate} 
                          />
                          <p className="text-xs text-white/40 mt-1">This date will be recorded on the invoice.</p>
                      </div>
                  )}

                  {payMethod === 'BANK' && (
                       <div className="space-y-2">
                          <label className="block text-white/80 text-sm font-medium">Upload Transfer Receipt</label>
                          <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 transition-colors relative group">
                              <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleFileSelect} 
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                              />
                              <div className="flex flex-col items-center gap-3 pointer-events-none">
                                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 group-hover:bg-white/20 group-hover:scale-110 transition-all">
                                      <i className="fas fa-cloud-upload-alt text-xl"></i>
                                  </div>
                                  <span className={`text-sm font-medium ${payFile ? 'text-green-400' : 'text-white/60'}`}>
                                      {payFile ? 'Receipt Selected (Ready)' : 'Click to Upload Receipt'}
                                  </span>
                                  {payFile && <i className="fas fa-check-circle text-green-500 text-lg absolute top-2 right-2"></i>}
                              </div>
                          </div>
                       </div>
                  )}

                  <div className="flex gap-3 pt-2">
                      <Button variant="secondary" onClick={() => setShowPayModal(false)} className="flex-1 py-3">Cancel</Button>
                      <Button onClick={confirmPayment} className="flex-1 py-3 shadow-lg shadow-green-500/20 bg-green-600/40 hover:bg-green-600/50 border-green-500/40">
                          <i className="fas fa-check mr-2"></i> Confirm Payment
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};