
import React from 'react';
import { useStore } from '../services/store';
import { Card } from '../components/GlassComponents';

export const AdminDashboard: React.FC = () => {
  const { inventory, invoices, settings } = useStore();

  // Stats
  const totalSales = invoices
    .filter(i => i.status === 'PAID')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const outstanding = invoices
    .filter(i => i.status === 'UNPAID')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const lowStock = inventory.filter(i => i.qty > 0 && i.qty <= (i.minStock || 5)).length;
  const outOfStock = inventory.filter(i => i.qty <= 0).length;
  const totalValue = inventory.reduce((acc, item) => acc + (item.price * item.qty), 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <p className="text-white/70 text-sm">Total Revenue</p>
          <h3 className="text-3xl font-bold text-white mt-2">{settings.currency} {totalSales.toLocaleString()}</h3>
          <div className="mt-4 text-xs text-green-300 flex items-center gap-1">
            <i className="fas fa-wallet"></i> Lifetime Sales (Local)
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/20 to-orange-500/20">
          <p className="text-white/70 text-sm">Outstanding Credit</p>
          <h3 className="text-3xl font-bold text-white mt-2">{settings.currency} {outstanding.toLocaleString()}</h3>
          <div className="mt-4 text-xs text-orange-300">Unpaid Invoices</div>
        </Card>
        <Card>
            <p className="text-white/70 text-sm">Inventory Value</p>
            <h3 className="text-3xl font-bold text-white mt-2">{settings.currency} {totalValue.toLocaleString()}</h3>
            <div className="flex gap-3 mt-4">
                <span className="text-xs text-red-400 font-bold">{outOfStock} Empty</span>
                <span className="text-xs text-yellow-400 font-bold">{lowStock} Low</span>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Recent Sales */}
        <Card className="h-[450px] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-receipt text-blue-400"></i> Recent Transactions
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-white text-sm">
                    <thead className="text-white/50 uppercase text-xs font-bold border-b border-white/10">
                        <tr>
                            <th className="pb-2">Inv #</th>
                            <th className="pb-2">Customer</th>
                            <th className="pb-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {invoices.slice(0, 10).map(inv => (
                            <tr key={inv.id} className="hover:bg-white/5">
                                <td className="py-3 font-mono text-xs text-white/70">{inv.id}</td>
                                <td className="py-3">{inv.customerName}</td>
                                <td className="py-3 text-right font-bold">{settings.currency} {inv.totalAmount}</td>
                            </tr>
                        ))}
                        {invoices.length === 0 && (
                            <tr><td colSpan={3} className="text-center py-8 text-white/30">No sales yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
        
        {/* 2. Inventory Alerts */}
        <Card className="h-[450px] flex flex-col">
             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle text-yellow-400"></i> Low Stock Alerts
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {outOfStock > 0 && inventory.filter(i => i.qty <= 0).map(item => (
                    <div key={item.id} className="bg-red-500/10 p-3 rounded-xl border border-red-500/20 flex justify-between items-center">
                        <div>
                            <p className="text-red-200 font-bold text-sm">{item.name}</p>
                            <p className="text-red-300/50 text-xs uppercase">Out of Stock</p>
                        </div>
                        <div className="text-red-200 font-bold">0</div>
                    </div>
                ))}
                {lowStock > 0 && inventory.filter(i => i.qty > 0 && i.qty <= (i.minStock || 5)).map(item => (
                    <div key={item.id} className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20 flex justify-between items-center">
                        <div>
                            <p className="text-yellow-200 font-bold text-sm">{item.name}</p>
                            <p className="text-yellow-300/50 text-xs uppercase">Low Stock</p>
                        </div>
                        <div className="text-yellow-200 font-bold">{item.qty}</div>
                    </div>
                ))}
                {lowStock === 0 && outOfStock === 0 && (
                     <div className="text-center py-20 text-white/30">
                        <i className="fas fa-check-circle text-4xl mb-3"></i>
                        <p>Inventory looks good!</p>
                    </div>
                )}
            </div>
        </Card>
      </div>
    </div>
  );
};
