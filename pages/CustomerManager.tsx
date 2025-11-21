
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
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'FINANCIAL' | 'PERMISSIONS' | 'HISTORY'>('PROFILE');

  // -- FILTER STATES --
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // -- FORM STATE --
  const emptyUser: User = {
    id: '',
    name: '',
    mobile: '',
    email: '',
    address: '',
    deliveryAddressLine: '',
    deliveryArea: '',
    deliveryCity: '',
    deliveryNotes: '',
    redboxId: '',
    telegramId: '',
    role: UserRole.CUSTOMER_INHOUSE,
    creditLimit: settings.defaultCreditLimit,
    currentBalance: 0,
    status: 'ACTIVE',
    notes: '',
    isRegistered: false
  };
  
  const [formData, setFormData] = useState<User>(emptyUser);

  // -- EFFECTS --
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

  // -- ACTIONS --
  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
    setActiveTab('PROFILE');
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setIsEditing(true);
    setSelectedUserId(null);
    setFormData({ ...emptyUser, id: Date.now().toString() });
    setActiveTab('PROFILE');
  };

  const handleSave = () => {
    if (!formData.name) {
        alert("Name is required");
        return;
    }

    if (isAdding) {
      addUser(formData);
      setIsAdding(false);
      setSelectedUserId(formData.id);
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

  // -- DERIVED DATA --
  const filteredUsers = users.filter(u => {
    if (!isAdmin && (u.role === UserRole.ADMIN || u.role === UserRole.FINANCE || u.role === UserRole.CASHIER)) {
        return false;
    }

    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.mobile.includes(searchTerm) || 
                          u.redboxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.telegramId && u.telegramId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const customerInvoices = invoices.filter(i => i.customerId === formData.id);

  const roleOptions = [
    { value: UserRole.CUSTOMER_INHOUSE, label: 'Customer (In-House)' },
    { value: UserRole.CUSTOMER_DELIVERY, label: 'Customer (Delivery)' },
  ];
  
  if (isAdmin) {
      roleOptions.unshift(
          { value: UserRole.ADMIN, label: 'Administrator' },
          { value: UserRole.FINANCE, label: 'Finance Manager' },
          { value: UserRole.CASHIER, label: 'Cashier' }
      );
  }

  const statusOptions = [
      { value: 'ACTIVE', label: 'Active' },
      { value: 'INACTIVE', label: 'Inactive' }
  ];

  const getRoleColor = (role: UserRole) => {
      switch(role) {
          case UserRole.ADMIN: return 'red';
          case UserRole.FINANCE: return 'yellow';
          case UserRole.CASHIER: return 'blue';
          case UserRole.CUSTOMER_DELIVERY: return 'blue';
          default: return 'green';
      }
  };

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-12 gap-6">
      
      {/* --- LEFT PANEL: SIDEBAR / FILTERS --- */}
      <div className="col-span-12 md:col-span-3 flex flex-col gap-4 h-full">
        <Button onClick={handleAddNew} className="py-4 text-lg shadow-xl shadow-blue-900/20">
          <i className="fas fa-user-plus mr-3"></i> Add User
        </Button>

        <div className="glass rounded-2xl p-4 flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider">Quick Filters</h3>
            
            <div className="space-y-1">
                <button onClick={() => setRoleFilter('ALL')} className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${roleFilter === 'ALL' ? 'bg-white/20 text-white font-bold border border-white/20' : 'text-white/70 hover:bg-white/10'}`}>All Users</button>
                
                <div className="h-2"></div>
                <p className="text-[10px] text-white/40 uppercase px-2 font-bold">Customers</p>
                <button onClick={() => setRoleFilter(UserRole.CUSTOMER_INHOUSE)} className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${roleFilter === UserRole.CUSTOMER_INHOUSE ? 'bg-white/20 text-white font-bold border border-white/20' : 'text-white/70 hover:bg-white/10'}`}>In-House</button>
                <button onClick={() => setRoleFilter(UserRole.CUSTOMER_DELIVERY)} className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${roleFilter === UserRole.CUSTOMER_DELIVERY ? 'bg-white/20 text-white font-bold border border-white/20' : 'text-white/70 hover:bg-white/10'}`}>Delivery</button>
                
                {isAdmin && (
                    <>
                        <div className="h-2"></div>
                        <p className="text-[10px] text-white/40 uppercase px-2 font-bold">Staff</p>
                        <button onClick={() => setRoleFilter(UserRole.ADMIN)} className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${roleFilter === UserRole.ADMIN ? 'bg-white/20 text-white font-bold border border-white/20' : 'text-white/70 hover:bg-white/10'}`}>Admins</button>
                        <button onClick={() => setRoleFilter(UserRole.FINANCE)} className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${roleFilter === UserRole.FINANCE ? 'bg-white/20 text-white font-bold border border-white/20' : 'text-white/70 hover:bg-white/10'}`}>Finance</button>
                        <button onClick={() => setRoleFilter(UserRole.CASHIER)} className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${roleFilter === UserRole.CASHIER ? 'bg-white/20 text-white font-bold border border-white/20' : 'text-white/70 hover:bg-white/10'}`}>Cashiers</button>
                    </>
                )}
            </div>

            <div className="h-px bg-white/10 my-2"></div>

            <div className="space-y-2">
                <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Status</h3>
                <div className="flex gap-2">
                    <button onClick={() => setStatusFilter('ACTIVE')} className={`flex-1 py-2 rounded-lg text-xs border transition-all ${statusFilter === 'ACTIVE' ? 'bg-green-500/20 border-green-500/40 text-white' : 'border-transparent text-white/50 hover:bg-white/5'}`}>Active</button>
                    <button onClick={() => setStatusFilter('INACTIVE')} className={`flex-1 py-2 rounded-lg text-xs border transition-all ${statusFilter === 'INACTIVE' ? 'bg-red-500/20 border-red-500/40 text-white' : 'border-transparent text-white/50 hover:bg-white/5'}`}>Inactive</button>
                </div>
            </div>
        </div>
      </div>

      {/* --- MIDDLE PANEL: USER LIST --- */}
      <div className="col-span-12 md:col-span-4 flex flex-col gap-4 h-full">
          <div className="relative">
              <i className="fas fa-search absolute left-4 top-3.5 text-white/50"></i>
              <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass-input"
                  placeholder="Search by Name, ID or Mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>

          <div className="glass rounded-2xl flex-1 overflow-hidden flex flex-col">
              <div className="overflow-y-auto custom-scrollbar p-2 space-y-2 flex-1">
                  {filteredUsers.length === 0 && (
                      <div className="text-center py-10 text-white/40 text-sm">No users found.</div>
                  )}
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
                          <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg
                                      ${selectedUserId === user.id ? 'bg-blue-500' : 'bg-white/10'}
                                  `}>
                                      {user.name.charAt(0)}
                                  </div>
                                  <div>
                                      <h4 className="text-white font-medium leading-tight">{user.name}</h4>
                                      <div className="flex items-center gap-2 mt-0.5">
                                          <p className="text-white/50 text-xs">{user.mobile}</p>
                                          {user.telegramId && (
                                              <i className="fab fa-telegram text-blue-400 text-xs" title={user.telegramId}></i>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              {user.status === 'INACTIVE' && <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>}
                          </div>
                          <div className="mt-3 flex justify-between items-center">
                               <span className="text-xs text-white/40 font-mono">{user.redboxId}</span>
                               <Badge color={getRoleColor(user.role)}>
                                   {user.role.replace('CUSTOMER_', '').replace('_', ' ')}
                               </Badge>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="p-3 bg-white/5 text-center text-xs text-white/40 border-t border-white/10">
                  {filteredUsers.length} Users Listed
              </div>
          </div>
      </div>

      {/* --- RIGHT PANEL: DETAILS & EDITOR --- */}
      <div className="col-span-12 md:col-span-5 h-full">
          {isAdding || selectedUserId ? (
              <div className="glass rounded-2xl h-full flex flex-col overflow-hidden animate-slide-down relative">
                   
                   {/* Header Section */}
                   <div className="p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
                        <div className="flex justify-between items-start mb-4">
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
                                    <p className="text-white/60 text-sm flex items-center gap-2">
                                        {formData.redboxId || 'New User'}
                                        {!isEditing && formData.telegramId && (
                                            <span className="text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full text-xs">
                                                <i className="fab fa-telegram"></i> {formData.telegramId}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <Button variant="secondary" onClick={handleCancel} className="w-10 h-10 !p-0 flex items-center justify-center rounded-full">
                                            <i className="fas fa-times"></i>
                                        </Button>
                                        <Button onClick={handleSave} className="w-10 h-10 !p-0 flex items-center justify-center rounded-full bg-green-500/40 border-green-400/50">
                                            <i className="fas fa-check"></i>
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="secondary" onClick={() => setIsEditing(true)} className="w-10 h-10 !p-0 flex items-center justify-center rounded-full">
                                            <i className="fas fa-pencil-alt"></i>
                                        </Button>
                                        {isAdmin && (
                                            <Button variant="danger" onClick={handleDelete} className="w-10 h-10 !p-0 flex items-center justify-center rounded-full">
                                                <i className="fas fa-trash"></i>
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {!isAdding && !formData.role.includes('ADMIN') && (
                            <div className="flex gap-4 mt-2">
                                <div className="flex-1 bg-white/5 rounded-lg p-2 text-center border border-white/5">
                                    <p className="text-xs text-white/50 uppercase">Balance</p>
                                    <p className={`font-bold ${formData.currentBalance > 0 ? 'text-red-300' : 'text-green-300'}`}>
                                        {settings.currency} {formData.currentBalance}
                                    </p>
                                </div>
                                <div className="flex-1 bg-white/5 rounded-lg p-2 text-center border border-white/5">
                                    <p className="text-xs text-white/50 uppercase">Credit Limit</p>
                                    <p className="text-white font-bold">{settings.currency} {formData.creditLimit}</p>
                                </div>
                            </div>
                        )}
                   </div>

                   {/* Tabs */}
                   <div className="flex border-b border-white/10 px-6 overflow-x-auto">
                       <button onClick={() => setActiveTab('PROFILE')} className={`py-4 mr-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PROFILE' ? 'text-white border-blue-400' : 'text-white/50 border-transparent hover:text-white'}`}>Profile</button>
                       <button onClick={() => setActiveTab('FINANCIAL')} className={`py-4 mr-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'FINANCIAL' ? 'text-white border-blue-400' : 'text-white/50 border-transparent hover:text-white'}`}>Credit & Status</button>
                       {isAdmin && (
                           <button onClick={() => setActiveTab('PERMISSIONS')} className={`py-4 mr-6 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PERMISSIONS' ? 'text-white border-blue-400' : 'text-white/50 border-transparent hover:text-white'}`}>Permissions</button>
                       )}
                       <button onClick={() => setActiveTab('HISTORY')} className={`py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'HISTORY' ? 'text-white border-blue-400' : 'text-white/50 border-transparent hover:text-white'}`}>History</button>
                   </div>

                   {/* Tab Content */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                       
                       {/* --- PROFILE TAB --- */}
                       {activeTab === 'PROFILE' && (
                           <div className="space-y-6 animate-fade-in">
                               {/* Basic Info */}
                               <div className="space-y-4">
                                   <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider border-b border-white/10 pb-2">Basic Info</h4>
                                   <div className="grid grid-cols-2 gap-4">
                                       <Input label="Mobile Number" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} disabled={!isEditing} />
                                       <Input label="Redbox / ID" value={formData.redboxId} onChange={(e) => setFormData({...formData, redboxId: e.target.value})} disabled={!isEditing} />
                                   </div>
                                   <div className="grid grid-cols-2 gap-4">
                                       <Input label="Email Address" value={formData.email || ''} onChange={(e) => setFormData({...formData, email: e.target.value})} disabled={!isEditing} placeholder="Optional" />
                                       <Input label="Telegram ID" value={formData.telegramId || ''} onChange={(e) => setFormData({...formData, telegramId: e.target.value})} disabled={!isEditing} placeholder="@username" />
                                   </div>
                                   <div>
                                       <label className="block text-white/80 text-sm font-medium mb-1 ml-1">Billing/General Address</label>
                                       <textarea 
                                           className={`w-full px-4 py-3 rounded-xl glass-input h-20 resize-none ${!isEditing ? 'opacity-70' : ''}`}
                                           value={formData.address || ''}
                                           onChange={(e) => setFormData({...formData, address: e.target.value})}
                                           disabled={!isEditing}
                                           placeholder="Contact Address..."
                                       />
                                   </div>
                               </div>

                               {/* Delivery Profile Section */}
                               <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20 space-y-4">
                                    <h4 className="text-blue-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                        <i className="fas fa-truck"></i> Delivery Profile
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                         <Input label="Delivery Area" value={formData.deliveryArea || ''} onChange={(e) => setFormData({...formData, deliveryArea: e.target.value})} disabled={!isEditing} placeholder="e.g. Henveiru" className="bg-black/20"/>
                                         <Input label="City / Island" value={formData.deliveryCity || ''} onChange={(e) => setFormData({...formData, deliveryCity: e.target.value})} disabled={!isEditing} placeholder="e.g. Male" className="bg-black/20"/>
                                    </div>
                                    <Input label="Delivery Address Line" value={formData.deliveryAddressLine || ''} onChange={(e) => setFormData({...formData, deliveryAddressLine: e.target.value})} disabled={!isEditing} placeholder="House Name / Street" className="bg-black/20"/>
                                    <div>
                                       <label className="block text-white/80 text-sm font-medium mb-1 ml-1">Default Delivery Instructions</label>
                                       <textarea 
                                           className={`w-full px-4 py-3 rounded-xl glass-input h-20 resize-none bg-black/20 ${!isEditing ? 'opacity-70' : ''}`}
                                           value={formData.deliveryNotes || ''}
                                           onChange={(e) => setFormData({...formData, deliveryNotes: e.target.value})}
                                           disabled={!isEditing}
                                           placeholder="e.g. Ring bell, drop at reception..."
                                       />
                                    </div>
                               </div>

                               <div>
                                   <label className="block text-white/80 text-sm font-medium mb-1 ml-1">Private Admin Notes</label>
                                   <textarea 
                                       className={`w-full px-4 py-3 rounded-xl glass-input h-24 resize-none ${!isEditing ? 'opacity-70' : ''}`}
                                       value={formData.notes || ''}
                                       onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                       disabled={!isEditing}
                                       placeholder="Internal notes about this user..."
                                   />
                               </div>
                           </div>
                       )}

                       {/* --- FINANCIAL TAB --- */}
                       {activeTab === 'FINANCIAL' && (
                           <div className="space-y-6 animate-fade-in">
                               <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                   <h4 className="text-white font-bold mb-4">Credit Management</h4>
                                   <Input 
                                       label="Credit Limit Amount (MVR)"
                                       type="number"
                                       value={formData.creditLimit}
                                       onChange={(e) => setFormData({...formData, creditLimit: parseFloat(e.target.value)})}
                                       disabled={!isEditing || (!isAdmin && currentUser?.role !== UserRole.FINANCE)}
                                   />
                                   <div className="flex justify-between items-center mt-2 text-sm">
                                       <span className="text-white/60">Current Usage:</span>
                                       <span className={`${(formData.currentBalance / formData.creditLimit) > 0.9 ? 'text-red-400' : 'text-white'}`}>
                                           {Math.round((formData.currentBalance / (formData.creditLimit || 1)) * 100)}%
                                       </span>
                                   </div>
                                   <div className="w-full bg-black/20 rounded-full h-2 mt-1">
                                        <div 
                                            className={`h-2 rounded-full transition-all duration-500 ${formData.currentBalance > formData.creditLimit ? 'bg-red-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${Math.min((formData.currentBalance / (formData.creditLimit || 1)) * 100, 100)}%` }}
                                        ></div>
                                   </div>
                               </div>

                               <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                   <h4 className="text-white font-bold mb-4">Account Status</h4>
                                   <Select 
                                       label="Status"
                                       value={formData.status}
                                       onChange={(e) => setFormData({...formData, status: e.target.value})}
                                       options={statusOptions}
                                       disabled={!isEditing}
                                   />
                               </div>
                           </div>
                       )}

                       {/* --- PERMISSIONS TAB --- */}
                       {activeTab === 'PERMISSIONS' && isAdmin && (
                           <div className="space-y-6 animate-fade-in">
                               <div className="bg-blue-500/10 p-6 rounded-xl border border-blue-500/30">
                                   <h4 className="text-blue-200 font-bold mb-2 text-lg"><i className="fas fa-shield-alt mr-2"></i> Role & Permissions</h4>
                                   <p className="text-white/60 text-sm mb-6">Assigning a role defines what this user can access.</p>
                                   <Select label="Assigned Role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} options={roleOptions} disabled={!isEditing} />
                               </div>
                           </div>
                       )}

                       {/* --- HISTORY TAB --- */}
                       {activeTab === 'HISTORY' && (
                           <div className="space-y-3 animate-fade-in">
                               {customerInvoices.length === 0 ? (
                                   <div className="text-center py-8 text-white/40">No purchase history available.</div>
                               ) : (
                                   customerInvoices.map(inv => (
                                       <div key={inv.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition">
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
                       )}
                   </div>
              </div>
          ) : (
              <div className="glass rounded-2xl h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white/20 text-4xl mb-4">
                      <i className="fas fa-user"></i>
                  </div>
                  <h3 className="text-white font-bold text-xl">No User Selected</h3>
                  <p className="text-white/50 mt-2 max-w-xs">Select a user from the list to view details or click 'Add User'.</p>
              </div>
          )}
      </div>
    </div>
  );
};
