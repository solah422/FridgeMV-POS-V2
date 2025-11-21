
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Card, Button, Input, Badge, Select } from '../components/GlassComponents';
import { UserRole } from '../types';

export const AdminDashboard: React.FC = () => {
  const { users, inventory, invoices, settings, sendNotification, deliveryRequests, updateDeliveryRequestStatus, updateInvoiceStatus, generateVerificationCode } = useStore();
  const [notifMsg, setNotifMsg] = useState('');
  const [notifTarget, setNotifTarget] = useState('ALL');

  // Verification Code State
  const [verifyRedboxId, setVerifyRedboxId] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState('');

  // Stats
  const totalSales = invoices
    .filter(i => i.status === 'PAID')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const pendingInvoices = invoices.filter(i => i.status === 'PENDING_APPROVAL');
  const lowStock = inventory.filter(i => i.qty > 0 && i.qty <= (i.minStock || 5)).length;
  const outOfStock = inventory.filter(i => i.qty <= 0).length;

  // Delivery Stats
  const activeDeliveries = deliveryRequests.filter(d => d.status === 'NEW' || d.status === 'IN_PROGRESS');

  const handleBroadcast = () => {
    if (!notifMsg) return;
    
    if (notifTarget === 'ALL') {
        users.forEach(user => {
            sendNotification({
                id: `${Date.now()}-${user.id}-${Math.random().toString(36).substr(2, 9)}`,
                targetUserId: user.id,
                message: notifMsg,
                date: new Date().toISOString(),
                read: false
            });
        });
    } else {
        sendNotification({
            id: Date.now().toString(),
            targetUserId: notifTarget,
            message: notifMsg,
            date: new Date().toISOString(),
            read: false
        });
    }
    
    setNotifMsg('');
    alert('Notification Sent!');
  };
  
  const handleGenerateCode = () => {
      setGeneratedCode(null);
      setVerifyError('');
      const code = generateVerificationCode(verifyRedboxId);
      if (code) {
          setGeneratedCode(code);
      } else {
          setVerifyError('User not found by Redbox ID');
      }
  };

  const targetOptions = [
      { value: 'ALL', label: 'All Users' },
      ...users.map(u => ({ value: u.id, label: `${u.name} (${u.role})` }))
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <p className="text-white/70 text-sm">Total Revenue</p>
          <h3 className="text-3xl font-bold text-white mt-2">{settings.currency} {totalSales.toLocaleString()}</h3>
          <div className="mt-4 text-xs text-green-300 flex items-center gap-1">
            <i className="fas fa-chart-line"></i> Lifetime Sales
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20">
          <p className="text-white/70 text-sm">Pending Verifications</p>
          <h3 className="text-3xl font-bold text-white mt-2">{pendingInvoices.length}</h3>
          <div className="mt-4 text-xs text-orange-300">Payments to Approve</div>
        </Card>
        <Card>
            <p className="text-white/70 text-sm">Active Deliveries</p>
            <h3 className="text-3xl font-bold text-white mt-2">{activeDeliveries.length}</h3>
            <p className="mt-4 text-xs text-white/50">Requests In-Queue</p>
        </Card>
        <Card>
            <p className="text-white/70 text-sm">Inventory Health</p>
            <div className="flex gap-4 mt-2">
                <div>
                    <span className="text-2xl font-bold text-red-400">{outOfStock}</span>
                    <span className="text-xs text-white/40 block">Empty</span>
                </div>
                <div>
                    <span className="text-2xl font-bold text-yellow-400">{lowStock}</span>
                    <span className="text-xs text-white/40 block">Low</span>
                </div>
                <div>
                    <span className="text-2xl font-bold text-green-400">{inventory.length}</span>
                    <span className="text-xs text-white/40 block">Total</span>
                </div>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Payment Verification Widget */}
        <Card className="h-[450px] flex flex-col lg:col-span-2">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-check-double text-blue-400"></i> Payment Verifications
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {pendingInvoices.length === 0 && (
                    <div className="text-center py-10 text-white/30">
                        <i className="fas fa-check-circle text-3xl mb-2"></i>
                        <p>No pending payments</p>
                    </div>
                )}
                {pendingInvoices.map(inv => (
                    <div key={inv.id} className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                        <div>
                            <p className="text-white font-bold text-sm">{inv.customerName}</p>
                            <p className="text-white/50 text-xs">Inv #{inv.id} • {settings.currency} {inv.totalAmount}</p>
                            {inv.proofOfPayment && (
                                <a href={inv.proofOfPayment} target="_blank" rel="noreferrer" className="text-blue-300 text-xs hover:underline">
                                    View Receipt
                                </a>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => updateInvoiceStatus(inv.id, 'UNPAID')} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/40"><i className="fas fa-times"></i></button>
                            <button onClick={() => updateInvoiceStatus(inv.id, 'PAID')} className="w-8 h-8 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/40"><i className="fas fa-check"></i></button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
        
        {/* 2. Account Verification Widget (NEW) */}
        <Card className="flex flex-col h-[450px]">
             <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-key text-green-400"></i> Account Setup
            </h3>
            <div className="flex-1 flex flex-col bg-white/5 rounded-xl p-4 border border-white/10">
                 <p className="text-sm text-white/60 mb-4">Generate a 1-time verification code for new users to create their password.</p>
                 <div className="space-y-3">
                     <Input 
                        placeholder="Enter Redbox ID (e.g. RB-123)" 
                        value={verifyRedboxId} 
                        onChange={e => setVerifyRedboxId(e.target.value)}
                     />
                     <Button onClick={handleGenerateCode} className="w-full">Generate Code</Button>
                 </div>
                 
                 {verifyError && (
                     <div className="mt-4 p-3 bg-red-500/20 text-red-200 text-xs rounded-lg text-center animate-slide-down">
                         {verifyError}
                     </div>
                 )}

                 {generatedCode && (
                     <div className="mt-auto animate-slide-down">
                         <p className="text-xs text-center text-white/50 uppercase tracking-widest mb-1">Verification Code</p>
                         <div className="bg-white/20 p-4 rounded-xl text-center border-2 border-white/30 border-dashed">
                             <span className="text-3xl font-mono font-bold text-white tracking-widest">{generatedCode}</span>
                         </div>
                         <p className="text-xs text-center text-green-400 mt-2">Valid for 10 minutes.</p>
                         <p className="text-[10px] text-center text-white/30">Share this code with the user.</p>
                     </div>
                 )}
            </div>
        </Card>

        {/* 3. Delivery Requests Widget */}
        <Card className="h-[400px] flex flex-col lg:col-span-2">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-truck text-yellow-400"></i> Delivery Requests
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {activeDeliveries.length === 0 && (
                    <div className="text-center py-10 text-white/30">
                        <i className="fas fa-road text-3xl mb-2"></i>
                        <p>No active deliveries</p>
                    </div>
                )}
                {activeDeliveries.map(req => (
                    <div key={req.id} className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-white font-bold text-sm">{req.customerName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge color="blue">{req.deliveryCity}</Badge>
                                    <span className="text-white/70 text-xs font-bold">{req.deliveryArea}</span>
                                </div>
                                <p className="text-white/50 text-xs mt-1">{req.deliveryAddressLine}</p>
                            </div>
                            <Badge color="yellow">{req.status}</Badge>
                        </div>
                        <p className="text-white/70 text-xs bg-black/20 p-2 rounded mb-2 flex items-start gap-2">
                            <i className="fas fa-clock mt-0.5"></i> 
                            <span>
                                {req.requestedTime}
                                {req.notes && <span className="block text-white/40 italic mt-1">Note: {req.notes}</span>}
                            </span>
                        </p>
                        <div className="flex gap-2">
                             <Button variant="secondary" className="text-xs flex-1 py-1" onClick={() => updateDeliveryRequestStatus(req.id, 'IN_PROGRESS')}>Start</Button>
                             <Button className="text-xs flex-1 py-1 bg-green-600/30" onClick={() => updateDeliveryRequestStatus(req.id, 'COMPLETED')}>Complete</Button>
                             <Button variant="danger" className="text-xs flex-1 py-1" onClick={() => updateDeliveryRequestStatus(req.id, 'CANCELLED')}>Cancel</Button>
                        </div>
                    </div>
                ))}
            </div>
        </Card>

        {/* 4. Broadcast Notification (Admin Only) */}
        <Card>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-bullhorn text-purple-400"></i> Broadcast
            </h3>
            <div className="space-y-4">
                <Select 
                    label="Target Audience" 
                    value={notifTarget} 
                    onChange={(e) => setNotifTarget(e.target.value)}
                    options={targetOptions}
                />
                <textarea 
                    className="w-full px-4 py-3 rounded-xl glass-input h-24 resize-none text-white placeholder-white/50 text-sm" 
                    value={notifMsg}
                    onChange={(e) => setNotifMsg(e.target.value)}
                    placeholder="Type system announcement..."
                />
                <Button onClick={handleBroadcast} className="w-full">
                    <i className="fas fa-paper-plane mr-2"></i> Send Message
                </Button>
            </div>
        </Card>
      </div>
    </div>
  );
};
