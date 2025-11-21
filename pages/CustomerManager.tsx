
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { Card, Button, Input, Select, Badge } from '../components/GlassComponents';
import { User, UserRole } from '../types';

export const CustomerManager: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, invoices, settings, currentUser } = useStore();
  
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  // -- VIEW STATES --
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // -- FILTER STATES --
  const [searchTerm, setSearchTerm] = useState('');

  // -- FORM STATE --
  const emptyUser: User = {
    id: '',
    name: '',
    mobile: '',
    email: '',
    address: '',
    username: '',
    role: UserRole.CUSTOMER,
    creditLimit: settings.defaultCreditLimit,
    currentBalance: 0,
    status: 'ACTIVE',
    notes: '',
  };
  
  const [formData, setFormData] = useState<User>(emptyUser);

  useEffect(() => {
    if (selectedUserId) {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        setFormData(user);
        setIsEditing(false);
        setIsAdding(false);
      }
    }
  }, [selectedUserId, users]);

  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setIsEditing(true);
    setSelectedUserId(null);
    setFormData({ ...emptyUser, id: Date.now().toString() });
  };

  const handleSave = () => {
    if (!formData.name) return alert("Name is required");

    if (isAdding) {
      // Auto-generate username for customers if empty
      const finalData = {
          ...formData,
          username: formData.username || `CUST-${Date.now()}`
      }
      addUser(finalData);
      setIsAdding(false);
      setSelectedUserId(finalData.id);
    } else {
      updateUser(formData);
    }
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (selectedUserId && confirm("Are you sure you want to delete this user?")) {
        deleteUser(selectedUserId);
        setSelectedUserId(null);
    }
  };

  const handleCancel = () => {
      if (isAdding) {
          setIsAdding(false);
          setIsEditing(false);
          setSelectedUserId(null);
      } else {
          const user = users.find(u => u.id === selectedUserId);
          if (user) setFormData(user);
          setIsEditing(false);
      }
  };

  const filteredUsers = users.filter(u => {
    // Filter logic
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.mobile.includes(searchTerm) ||
                          u.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const customerInvoices = invoices.filter(i => i.customerId === formData.id);

  const roleOptions = [
      { value: UserRole.CUSTOMER, label: 'Customer' },
      { value: UserRole.ADMIN, label: 'Administrator' },
      { value: UserRole.CASHIER, label: 'Cashier' }
  ];

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-12 gap-6">
      
      {/* --- LEFT PANEL: LIST --- */}
      <div className="col-span-12 md:col-span-4 flex flex-col gap-4 h-full">
        <Button onClick={handleAddNew} className="py-4 text-lg shadow-xl shadow-blue-900/20">
          <i className="fas fa-user-plus mr-3"></i> Add Customer / User
        </Button>

        <div className="relative">
            <i className="fas fa-search absolute left-4 top-3.5 text-white/50"></i>
            <input 
                type="text" 
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input"
                placeholder="Search by Name, Mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="glass rounded-2xl flex-1 overflow-hidden flex flex-col">
            <div className="overflow-y-auto custom-scrollbar p-2 space-y-2 flex-1">
                {filteredUsers.map(user => (
                    <div 
                        key={user.id}
                        onClick={() => handleSelectUser(user.id)}
                        className={`
                            p-4 rounded-xl cursor-pointer border transition-all duration-200 group
                            ${selectedUserId === user.id 
                                ? 'bg-white/20 border-white/40 shadow-lg' 
                                : 'bg-transparent border-transparent hover:bg-white/10 hover:border-white/10'
                            }
                        `}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="text-white font-medium leading-tight">{user.name}</h4>
                                <p className="text-white/50 text-xs">{user.mobile || 'No Mobile'}</p>
                            </div>
                            <Badge color={user.role === 'ADMIN' ? 'red' : user.role === 'CASHIER' ? 'blue' : 'green'}>
                                {user.role}
                            </Badge>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: DETAILS & EDITOR --- */}
      <div className="col-span-12 md:col-span-8 h-full">
          {isAdding || selectedUserId ? (
              <div className="glass rounded-2xl h-full flex flex-col overflow-hidden animate-slide-down">
                   
                   {/* Header */}
                   <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl text-white font-bold shadow-lg">
                                {formData.name ? formData.name.charAt(0) : '+'}
                            </div>
                            <div>
                                {isEditing ? (
                                    <input 
                                        className="bg-transparent border-b border-white/30 text-white text-xl font-bold focus:outline-none w-full"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        placeholder="User Name"
                                    />
                                ) : (
                                    <h2 className="text-2xl font-bold text-white">{formData.name}</h2>
                                )}
                                <p className="text-white/60 text-sm">{formData.username}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                                    <Button onClick={handleSave}>Save</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="secondary" onClick={() => setIsEditing(true)}>Edit</Button>
                                    {isAdmin && <Button variant="danger" onClick={handleDelete}>Delete</Button>}
                                </>
                            )}
                        </div>
                   </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                       
                       <div className="grid grid-cols-2 gap-6">
                           {/* Basic Info */}
                           <div className="space-y-4">
                               <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider border-b border-white/10 pb-2">Contact Info</h4>
                               <Input label="Mobile Number" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} disabled={!isEditing} />
                               <Input label="Email" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={!isEditing} placeholder="Optional" />
                               <div>
                                   <label className="block text-white/80 text-sm font-medium mb-1 ml-1">Address</label>
                                   <textarea 
                                       className={`w-full px-4 py-3 rounded-xl glass-input h-20 resize-none ${!isEditing ? 'opacity-70' : ''}`}
                                       value={formData.address || ''}
                                       onChange={(e) => setFormData({...formData, address: e.target.value})}
                                       disabled={!isEditing}
                                   />
                               </div>
                           </div>

                           {/* Account & Financial */}
                           <div className="space-y-4">
                               <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider border-b border-white/10 pb-2">Account Settings</h4>
                               {isAdmin && (
                                   <Select 
                                       label="Role" 
                                       value={formData.role} 
                                       onChange={(e) => setFormData({...formData, role: e.target.value as any})} 
                                       options={roleOptions} 
                                       disabled={!isEditing} 
                                   />
                               )}
                               <Input 
                                    label="Username (Login ID)" 
                                    value={formData.username} 
                                    onChange={(e) => setFormData({...formData, username: e.target.value})} 
                                    disabled={!isEditing} 
                                />
                               {formData.role !== UserRole.CUSTOMER && (
                                   <Input 
                                        label="Password" 
                                        type="password"
                                        value={formData.password || ''} 
                                        onChange={(e) => setFormData({...formData, password: e.target.value})} 
                                        disabled={!isEditing}
                                        placeholder="Set Password" 
                                    />
                               )}

                               <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-4">
                                   <h4 className="text-white font-bold mb-2">Credit Management</h4>
                                   <Input 
                                       label="Credit Limit"
                                       type="number"
                                       value={formData.creditLimit}
                                       onChange={(e) => setFormData({...formData, creditLimit: parseFloat(e.target.value)})}
                                       disabled={!isEditing}
                                   />
                                   <div className="flex justify-between items-center mt-2 text-sm">
                                       <span className="text-white/60">Balance Due:</span>
                                       <span className={`font-bold ${formData.currentBalance > 0 ? 'text-red-300' : 'text-green-300'}`}>
                                           {settings.currency} {formData.currentBalance}
                                       </span>
                                   </div>
                               </div>
                           </div>
                       </div>

                       {/* Recent History */}
                       <div className="space-y-3 pt-6 border-t border-white/10">
                           <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider">Recent Invoices</h4>
                           {customerInvoices.length === 0 ? (
                               <div className="text-white/40 text-sm italic">No purchase history.</div>
                           ) : (
                               customerInvoices.slice(0, 5).map(inv => (
                                   <div key={inv.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                                       <div>
                                           <p className="text-white font-medium text-sm">Invoice #{inv.id}</p>
                                           <p className="text-white/50 text-xs">{new Date(inv.date).toLocaleDateString()}</p>
                                       </div>
                                       <div className="text-right">
                                           <p className="text-white font-bold text-sm">{settings.currency} {inv.totalAmount}</p>
                                           <Badge color={inv.status === 'PAID' ? 'green' : 'red'}>{inv.status}</Badge>
                                       </div>
                                   </div>
                               ))
                           )}
                       </div>

                   </div>
              </div>
          ) : (
              <div className="glass rounded-2xl h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20 text-4xl mb-4">
                      <i className="fas fa-user"></i>
                  </div>
                  <h3 className="text-white font-bold text-xl">No Customer Selected</h3>
              </div>
          )}
      </div>
    </div>
  );
};
