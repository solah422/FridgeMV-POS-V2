
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../services/store';
import { Card, Button, Select, Badge, GlassDatePicker } from '../components/GlassComponents';
import { Invoice, UserRole, User } from '../types';

// Declare html2pdf global
declare var html2pdf: any;

export const InvoiceManager: React.FC = () => {
  const { invoices, updateInvoiceStatus, users, settings, inventory } = useStore();
  
  const [activeView, setActiveView] = useState<'LIST' | 'SINGLE'>('LIST');
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const selectedInvoice = useMemo(() => 
    invoices.find(i => i.id === selectedInvoiceId) || null
  , [invoices, selectedInvoiceId]);

  // --- HELPERS ---
  const handlePrint = () => {
      const element = document.getElementById('print-area');
      if (!element) return alert("Print element not found.");

      const filename = `Invoice_${selectedInvoice?.id || 'doc'}.pdf`;

      if (typeof html2pdf !== 'undefined') {
          const opt = {
              margin: 0,
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          const originalBoxShadow = element.style.boxShadow;
          element.style.boxShadow = 'none';
          html2pdf().set(opt).from(element).save().then(() => {
              element.style.boxShadow = originalBoxShadow;
          }).catch((err: any) => {
              console.error("PDF Gen Failed", err);
              element.style.boxShadow = originalBoxShadow;
              window.print();
          });
      } else {
          window.print();
      }
  };

  const getSku = (itemId: string) => inventory.find(i => i.id === itemId)?.sku || 'N/A';
  
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
      
      {activeView !== 'SINGLE' && (
           <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">Invoices</h2>
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
                    <Select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)} 
                        options={[
                            { value: 'ALL', label: 'All Status' },
                            { value: 'PAID', label: 'Paid' },
                            { value: 'UNPAID', label: 'Unpaid' },
                        ]} 
                    />
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
                                    <Badge color={inv.status === 'PAID' ? 'green' : 'red'}>
                                        {inv.status}
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

      {/* 2. SINGLE INVOICE DISPLAY */}
      {activeView === 'SINGLE' && selectedInvoice && (
        <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6 no-print">
                <Button variant="secondary" onClick={() => { setSelectedInvoiceId(null); setActiveView('LIST'); }}>
                    <i className="fas fa-arrow-left mr-2"></i> Back
                </Button>
                <div className="flex gap-3">
                    {selectedInvoice.status === 'UNPAID' ? (
                         <Button variant="success" onClick={() => updateInvoiceStatus(selectedInvoice.id, 'PAID')}>
                             <i className="fas fa-check mr-2"></i> Mark as Paid
                         </Button>
                    ) : (
                        <Button variant="danger" onClick={() => updateInvoiceStatus(selectedInvoice.id, 'UNPAID')}>
                             <i className="fas fa-undo mr-2"></i> Mark Unpaid
                         </Button>
                    )}
                    <Button onClick={handlePrint}>
                        <i className="fas fa-print mr-2"></i> Print
                    </Button>
                </div>
            </div>

            {/* --- INVOICE PAPER --- */}
            <div id="print-area" className="bg-white text-black font-sans max-w-[210mm] mx-auto p-10 min-h-[297mm] relative shadow-xl flex flex-col">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{settings.shopName}</h1>
                        <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                            <p>{settings.island || "Male'"}, {settings.country || "Maldives"}</p>
                            <p>Contact: {settings.contactNumber || "0000"}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice</h2>
                        <p className="text-2xl font-bold text-gray-900">#{selectedInvoice.id}</p>
                        <div className="text-xs text-gray-500 mt-1">
                            <p>Date: {new Date(selectedInvoice.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-10 border-t border-b border-gray-100 py-6">
                    <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Bill To</h3>
                    <p className="font-bold text-gray-900 text-lg">{selectedInvoice.customerName}</p>
                    <p className="text-sm text-gray-600 mt-1">{users.find(u => u.id === selectedInvoice.customerId)?.address || 'No Address'}</p>
                    <div className="mt-1 text-sm text-gray-600">
                        Mobile: {users.find(u => u.id === selectedInvoice.customerId)?.mobile || 'N/A'}
                    </div>
                    <div className="mt-4 font-bold uppercase text-sm">
                        Status: <span className={selectedInvoice.status === 'PAID' ? 'text-green-600' : 'text-red-600'}>{selectedInvoice.status}</span>
                    </div>
                </div>

                <div className="mb-6">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                                <th className="py-3 px-4 text-left rounded-l-lg">Item</th>
                                <th className="py-3 px-4 text-center">Qty</th>
                                <th className="py-3 px-4 text-right">Price</th>
                                <th className="py-3 px-4 text-right rounded-r-lg">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {selectedInvoice.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50 last:border-0">
                                    <td className="py-3 px-4">
                                        <p className="font-bold text-gray-900">{item.itemName}</p>
                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {getSku(item.itemId)}</p>
                                    </td>
                                    <td className="py-3 px-4 text-center">{item.qty}</td>
                                    <td className="py-3 px-4 text-right">{settings.currency} {item.price.toFixed(2)}</td>
                                    <td className="py-3 px-4 text-right font-bold text-gray-900">{settings.currency} {item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end mb-10">
                    <div className="w-72 bg-gray-50 rounded-lg p-6 border border-gray-100">
                        <div className="flex justify-between text-lg font-bold text-gray-900">
                            <span>Total</span>
                            <span>{settings.currency} {selectedInvoice.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="text-center border-t border-gray-100 pt-6 mt-auto">
                    <p className="text-gray-900 font-bold text-sm mb-1">Thank you!</p>
                    <p className="text-xs text-gray-400">Generated by Fridge MV POS (Offline)</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
