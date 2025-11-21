
import React from 'react';
import { useStore } from '../services/store';
import { Card, Badge } from '../components/GlassComponents';

export const FinanceDashboard: React.FC = () => {
  const { invoices, updateInvoiceStatus, settings } = useStore();

  // Stats
  const pendingInvoices = invoices.filter(i => i.status === 'PENDING_APPROVAL');
  const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.totalAmount, 0);
  const outstanding = invoices.filter(i => i.status === 'UNPAID').reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
           <h1 className="text-3xl font-bold text-white">Finance Overview</h1>
           <div className="px-4 py-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 rounded-full text-xs font-bold uppercase">
               Finance Access
           </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
              <p className="text-white/70 text-sm">Total Revenue Collected</p>
              <h3 className="text-3xl font-bold text-white mt-2">{settings.currency} {totalRevenue.toLocaleString()}</h3>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/20">
              <p className="text-white/70 text-sm">Outstanding Payments</p>
              <h3 className="text-3xl font-bold text-white mt-2">{settings.currency} {outstanding.toLocaleString()}</h3>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
              <p className="text-white/70 text-sm">Pending Approvals</p>
              <h3 className="text-3xl font-bold text-white mt-2">{pendingInvoices.length}</h3>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 1. Pending Verifications */}
          <Card className="h-[500px] flex flex-col">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <i className="fas fa-check-double text-yellow-400"></i> Pending Payment Approvals
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                  {pendingInvoices.length === 0 && (
                      <div className="text-center py-20 text-white/30">
                          <i className="fas fa-check-circle text-4xl mb-3"></i>
                          <p>All payments processed</p>
                      </div>
                  )}
                  {pendingInvoices.map(inv => (
                      <div key={inv.id} className="bg-white/5 p-4 rounded-xl border border-white/10">
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <p className="text-white font-bold">{inv.customerName}</p>
                                  <p className="text-white/50 text-xs">Inv #{inv.id}</p>
                              </div>
                              <div className="text-right">
                                  <p className="text-white font-bold">{settings.currency} {inv.totalAmount}</p>
                                  <span className="text-[10px] text-yellow-200 bg-yellow-500/20 px-2 py-0.5 rounded">Pending</span>
                              </div>
                          </div>
                          
                          {inv.proofOfPayment && (
                              <div className="bg-black/20 p-2 rounded border border-white/5 mb-3 text-xs text-white/70 flex items-center gap-2">
                                  <i className="fas fa-paperclip"></i> 
                                  {inv.proofOfPayment.startsWith('data:image') ? 'Image Receipt Attached' : inv.proofOfPayment}
                                  <a href={inv.proofOfPayment} target="_blank" rel="noreferrer" className="ml-auto text-blue-300 hover:underline">View</a>
                              </div>
                          )}

                          <div className="flex gap-3">
                              <button 
                                  onClick={() => updateInvoiceStatus(inv.id, 'UNPAID')} 
                                  className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/20 transition text-sm"
                              >
                                  Reject
                              </button>
                              <button 
                                  onClick={() => updateInvoiceStatus(inv.id, 'PAID')} 
                                  className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/20 transition text-sm"
                              >
                                  Approve
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </Card>

          {/* 2. Recent Transactions */}
          <Card className="h-[500px] flex flex-col">
               <h3 className="text-xl font-bold text-white mb-4">Recent Transactions</h3>
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left text-white text-sm">
                       <thead className="text-white/50 uppercase text-xs font-bold border-b border-white/10">
                           <tr>
                               <th className="pb-2">Invoice</th>
                               <th className="pb-2">Customer</th>
                               <th className="pb-2 text-right">Amount</th>
                               <th className="pb-2 text-right">Status</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                           {invoices.slice(0, 20).map(inv => (
                               <tr key={inv.id} className="hover:bg-white/5">
                                   <td className="py-3 font-mono text-xs text-white/70">{inv.id}</td>
                                   <td className="py-3">{inv.customerName}</td>
                                   <td className="py-3 text-right font-bold">{settings.currency} {inv.totalAmount}</td>
                                   <td className="py-3 text-right">
                                       <Badge color={inv.status === 'PAID' ? 'green' : inv.status === 'UNPAID' ? 'red' : 'yellow'}>
                                           {inv.status}
                                       </Badge>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
          </Card>

      </div>
    </div>
  );
};
