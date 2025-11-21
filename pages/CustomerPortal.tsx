
import React, { useState } from 'react';
import { useStore } from '../services/store';
import { Card, Button, Input, Badge, Select, GlassDatePicker } from '../components/GlassComponents';
import { Invoice, InvoiceItem, UserRole, DeliveryRequest, User } from '../types';

export const CustomerPortal: React.FC = () => {
  const { currentUser, invoices, inventory, createInvoice, updateInvoiceStatus, settings, deliveryRequests, addDeliveryRequest, updateUser } = useStore();
  const [activeTab, setActiveTab] = useState<'DASH' | 'ORDER' | 'INVOICES' | 'DELIVERY_REQUESTS'>('DASH');
  
  // Order State
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  
  // Delivery Request Form State
  // Note: address fields are sourced from profile now.
  const [reqTime, setReqTime] = useState('');
  const [reqNotes, setReqNotes] = useState('');

  // Profile Edit State (For missing fields)
  const [profileEdit, setProfileEdit] = useState<Partial<User>>({});
  
  // Payment Upload State
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  if (!currentUser) return <div>Loading...</div>;

  const myInvoices = invoices.filter(i => i.customerId === currentUser.id);
  const myDeliveries = deliveryRequests.filter(d => d.customerId === currentUser.id);
  
  const balance = currentUser.currentBalance;
  const availableCredit = currentUser.creditLimit - balance;

  // Check if profile is complete for delivery
  const isProfileComplete = currentUser.deliveryAddressLine && currentUser.deliveryArea && currentUser.deliveryCity;

  // --- CART LOGIC ---
  const addToCart = (item: any) => {
    const existing = cart.find(c => c.itemId === item.id);
    if (existing) {
        setCart(cart.map(c => c.itemId === item.id ? {...c, qty: c.qty + 1, total: (c.qty + 1) * c.price} : c));
    } else {
        setCart([...cart, { itemId: item.id, itemName: item.name, qty: 1, price: item.price, total: item.price }]);
    }
  };

  const placeOrder = () => {
    if (cart.length === 0) return;
    const total = cart.reduce((acc, c) => acc + c.total, 0);
    if (total > availableCredit) return alert("Insufficient Credit Limit!");

    const newInvoice: Invoice = {
        id: `INV-${Date.now()}`,
        customerId: currentUser.id,
        customerName: currentUser.name,
        date: new Date().toISOString(),
        items: cart,
        totalAmount: total,
        status: 'UNPAID',
        type: 'SINGLE_DAY'
    };

    createInvoice(newInvoice);
    setCart([]);
    setActiveTab('INVOICES');
    alert("Order Placed Successfully!");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, invId: string) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            updateInvoiceStatus(invId, 'PENDING_APPROVAL', reader.result as string);
            setUploadingId(null);
        };
        reader.readAsDataURL(file);
    }
  };

  const submitDeliveryRequest = () => {
      if (!reqTime) return alert("Preferred Time required.");
      if (!isProfileComplete) return alert("Please complete your profile address first.");
      
      // Use snapshot of current profile address
      const newReq: DeliveryRequest = {
          id: `DEL-${Date.now()}`,
          customerId: currentUser.id,
          customerName: currentUser.name,
          
          // SNAPSHOT FIELDS
          deliveryAddressLine: currentUser.deliveryAddressLine || '',
          deliveryArea: currentUser.deliveryArea || '',
          deliveryCity: currentUser.deliveryCity || '',
          
          requestedTime: reqTime,
          status: 'NEW',
          date: new Date().toISOString(),
          notes: reqNotes || currentUser.deliveryNotes // Fallback to profile notes if no specific notes
      };

      addDeliveryRequest(newReq);
      setReqTime('');
      setReqNotes('');
      alert("Delivery Request Sent!");
  };

  const saveDeliveryProfile = () => {
      if (!profileEdit.deliveryAddressLine || !profileEdit.deliveryArea || !profileEdit.deliveryCity) {
          return alert("All address fields are required.");
      }
      
      updateUser({
          ...currentUser,
          deliveryAddressLine: profileEdit.deliveryAddressLine,
          deliveryArea: profileEdit.deliveryArea,
          deliveryCity: profileEdit.deliveryCity,
          deliveryNotes: profileEdit.deliveryNotes || currentUser.deliveryNotes
      });
      alert("Profile Updated! You can now request deliveries.");
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Navigation Tabs */}
      <div className="flex gap-6 border-b border-white/20 pb-1 mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('DASH')} className={`text-white pb-3 px-2 transition-colors whitespace-nowrap ${activeTab === 'DASH' ? 'font-bold border-b-2 border-blue-400' : 'opacity-60 hover:opacity-100'}`}>Overview</button>
        <button onClick={() => setActiveTab('INVOICES')} className={`text-white pb-3 px-2 transition-colors whitespace-nowrap ${activeTab === 'INVOICES' ? 'font-bold border-b-2 border-blue-400' : 'opacity-60 hover:opacity-100'}`}>My Invoices</button>
        
        {currentUser.role === UserRole.CUSTOMER_DELIVERY && (
             <>
                 <button onClick={() => setActiveTab('ORDER')} className={`text-white pb-3 px-2 transition-colors whitespace-nowrap ${activeTab === 'ORDER' ? 'font-bold border-b-2 border-blue-400' : 'opacity-60 hover:opacity-100'}`}>Place Order</button>
                 <button onClick={() => setActiveTab('DELIVERY_REQUESTS')} className={`text-white pb-3 px-2 transition-colors whitespace-nowrap ${activeTab === 'DELIVERY_REQUESTS' ? 'font-bold border-b-2 border-blue-400' : 'opacity-60 hover:opacity-100'}`}>Deliveries</button>
             </>
        )}
      </div>

      {/* DASHBOARD VIEW */}
      {activeTab === 'DASH' && (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500/30 to-blue-500/30 border border-indigo-500/30">
                    <p className="text-white/70 text-sm">Current Balance Due</p>
                    <h3 className="text-4xl font-bold text-white mt-2">{settings.currency} {balance}</h3>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border border-emerald-500/30">
                    <p className="text-white/70 text-sm">Available Credit</p>
                    <h3 className="text-4xl font-bold text-white mt-2">{settings.currency} {availableCredit}</h3>
                    <p className="text-white/50 text-xs mt-2">Limit: {settings.currency} {currentUser.creditLimit}</p>
                </Card>
                <Card className="border border-white/20 bg-black/20">
                     <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                         <i className="fas fa-university text-yellow-300"></i> Bank Transfer Instructions
                     </h4>
                     {settings.bankDetails ? (
                         <p className="text-white/80 text-sm whitespace-pre-line leading-relaxed">{settings.bankDetails}</p>
                     ) : (
                         <p className="text-white/40 text-sm italic">No bank details configured. Please contact support.</p>
                     )}
                </Card>
            </div>
        </div>
      )}

      {/* ORDER VIEW (Delivery Only) */}
      {activeTab === 'ORDER' && currentUser.role === UserRole.CUSTOMER_DELIVERY && (
        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
            <div className="flex-1 space-y-4">
                <h3 className="text-white font-bold text-xl">Catalog</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {inventory.map(item => (
                        <div key={item.id} className="glass p-4 rounded-xl flex justify-between items-start group hover:bg-white/10 transition">
                            <div>
                                <p className="text-white font-bold">{item.name}</p>
                                <p className="text-white/60 text-sm">{item.details}</p>
                                <p className="text-blue-300 font-bold mt-2">{settings.currency} {item.price}</p>
                            </div>
                            <Button onClick={() => addToCart(item)} disabled={item.qty < 1} className="w-10 h-10 !p-0 flex items-center justify-center rounded-full disabled:opacity-50">
                                <i className="fas fa-plus"></i>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-full lg:w-80">
                <Card className="sticky top-6 bg-black/20">
                    <h3 className="text-white font-bold mb-4">Your Cart</h3>
                    {cart.length === 0 ? (
                        <p className="text-white/50 text-sm text-center py-4">Cart is empty</p>
                    ) : (
                        <div className="space-y-2">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-white text-sm bg-white/5 p-2 rounded">
                                    <span>{item.itemName} <span className="text-white/50 text-xs">x{item.qty}</span></span>
                                    <span>{item.total}</span>
                                </div>
                            ))}
                            <div className="border-t border-white/20 pt-3 mt-4 flex justify-between text-white font-bold text-lg">
                                <span>Total</span>
                                <span>{settings.currency} {cart.reduce((a,b)=>a+b.total,0)}</span>
                            </div>
                            <Button className="w-full mt-4 shadow-lg shadow-blue-500/20" onClick={placeOrder}>Place Order</Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
      )}

      {/* DELIVERY REQUESTS (Delivery Only) */}
      {activeTab === 'DELIVERY_REQUESTS' && currentUser.role === UserRole.CUSTOMER_DELIVERY && (
          <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
              {/* Request Form / Profile Prompt */}
              <div className="w-full lg:w-1/3">
                  {!isProfileComplete ? (
                      <Card className="bg-red-500/10 border border-red-500/30">
                          <div className="mb-4">
                              <i className="fas fa-exclamation-circle text-red-400 text-2xl mb-2"></i>
                              <h3 className="text-xl font-bold text-white">Profile Incomplete</h3>
                              <p className="text-white/60 text-sm mt-1">You must complete your delivery profile before requesting deliveries.</p>
                          </div>
                          <div className="space-y-3">
                              <Input 
                                  label="Delivery Address Line" 
                                  value={profileEdit.deliveryAddressLine || ''} 
                                  onChange={e => setProfileEdit({...profileEdit, deliveryAddressLine: e.target.value})}
                                  placeholder="H. Example House, 2nd Floor"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                  <Input 
                                      label="Area" 
                                      value={profileEdit.deliveryArea || ''} 
                                      onChange={e => setProfileEdit({...profileEdit, deliveryArea: e.target.value})}
                                      placeholder="Henveiru"
                                  />
                                  <Input 
                                      label="City" 
                                      value={profileEdit.deliveryCity || ''} 
                                      onChange={e => setProfileEdit({...profileEdit, deliveryCity: e.target.value})}
                                      placeholder="Male"
                                  />
                              </div>
                              <Input 
                                  label="Default Instructions (Optional)" 
                                  value={profileEdit.deliveryNotes || ''} 
                                  onChange={e => setProfileEdit({...profileEdit, deliveryNotes: e.target.value})}
                              />
                              <Button onClick={saveDeliveryProfile} className="w-full mt-2">Save Profile</Button>
                          </div>
                      </Card>
                  ) : (
                      <Card>
                          <h3 className="text-xl font-bold text-white mb-4">Request Delivery</h3>
                          
                          {/* Profile Address Display */}
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                              <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Delivering To</p>
                              <p className="text-white font-bold">{currentUser.deliveryAddressLine}</p>
                              <p className="text-white/80 text-sm">{currentUser.deliveryArea}, {currentUser.deliveryCity}</p>
                              {currentUser.deliveryNotes && <p className="text-white/50 text-xs mt-2 italic">"{currentUser.deliveryNotes}"</p>}
                          </div>

                          <div className="space-y-4">
                              <Input 
                                  label="Preferred Time" 
                                  value={reqTime} 
                                  onChange={e => setReqTime(e.target.value)}
                                  placeholder="e.g. Tomorrow 10 AM" 
                              />
                              <div>
                                  <label className="block text-white/80 text-sm font-medium mb-1 ml-1">Extra Notes (Optional)</label>
                                  <textarea 
                                      className="w-full glass-input rounded-xl p-3 h-24 resize-none"
                                      value={reqNotes}
                                      onChange={e => setReqNotes(e.target.value)}
                                      placeholder="Specific to this order..."
                                  />
                              </div>
                              <Button onClick={submitDeliveryRequest} className="w-full shadow-lg shadow-blue-500/20">
                                  <i className="fas fa-truck mr-2"></i> Submit Request
                              </Button>
                          </div>
                      </Card>
                  )}
              </div>

              {/* Request List */}
              <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-4">My Requests</h3>
                  <div className="space-y-3">
                      {myDeliveries.length === 0 && <p className="text-white/40 italic">No delivery requests yet.</p>}
                      {myDeliveries.map(req => (
                          <div key={req.id} className="glass p-4 rounded-xl flex justify-between items-center">
                              <div>
                                  <div className="flex items-center gap-3 mb-1">
                                      <Badge color={req.status === 'NEW' ? 'blue' : req.status === 'COMPLETED' ? 'green' : 'yellow'}>
                                          {req.status}
                                      </Badge>
                                      <span className="text-white/40 text-xs">{new Date(req.date).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-white font-bold">{req.deliveryAddressLine}</p>
                                  <p className="text-white/60 text-sm mt-1">Time: {req.requestedTime}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* INVOICES VIEW */}
      {activeTab === 'INVOICES' && (
        <Card className="animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-6">My Invoices</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-white">
                    <thead>
                        <tr className="border-b border-white/20 text-white/60">
                            <th className="p-3">Invoice #</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {myInvoices.map(inv => (
                            <tr key={inv.id} className="hover:bg-white/5 transition">
                                <td className="p-3 font-mono text-sm text-white/70">{inv.id}</td>
                                <td className="p-3">{new Date(inv.date).toLocaleDateString()}</td>
                                <td className="p-3 font-bold">{settings.currency} {inv.totalAmount}</td>
                                <td className="p-3">
                                    <Badge color={inv.status === 'PAID' ? 'green' : inv.status === 'UNPAID' ? 'red' : 'yellow'}>
                                        {inv.status.replace('_', ' ')}
                                    </Badge>
                                </td>
                                <td className="p-3">
                                    {inv.status === 'UNPAID' && (
                                        <div>
                                            {uploadingId === inv.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="text-xs text-white/70 file:bg-white/10 file:border-0 file:rounded file:text-white file:text-xs file:px-2 file:py-1" 
                                                        onChange={(e) => handleFileUpload(e, inv.id)}
                                                    />
                                                    <button onClick={() => setUploadingId(null)} className="text-[10px] text-red-300 text-left hover:underline">Cancel</button>
                                                </div>
                                            ) : (
                                                <Button variant="secondary" className="text-xs py-1" onClick={() => setUploadingId(inv.id)}>
                                                    Upload Receipt
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {inv.status === 'PENDING_APPROVAL' && <span className="text-xs text-white/50 italic">Verification Pending...</span>}
                                    {inv.status === 'PAID' && <span className="text-xs text-green-300"><i className="fas fa-check-circle"></i> Completed</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
      )}
    </div>
  );
};
