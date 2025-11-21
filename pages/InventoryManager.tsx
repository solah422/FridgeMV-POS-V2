
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { Card, Button, Input, Select, Badge } from '../components/GlassComponents';
import { InventoryItem } from '../types';

export const InventoryManager: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, settings } = useStore();

  // --- VIEW STATES ---
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // --- FILTER STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // --- FORM STATE ---
  const emptyItem: InventoryItem = {
    id: '',
    name: '',
    sku: '',
    category: '',
    qty: 0,
    minStock: 5,
    price: 0,
    details: '',
    status: 'IN_STOCK'
  };

  const [formData, setFormData] = useState<InventoryItem>(emptyItem);

  // --- EFFECTS ---
  useEffect(() => {
    if (selectedItemId) {
      const item = inventory.find(i => i.id === selectedItemId);
      if (item) {
        setFormData(item);
        setIsEditing(false);
        setIsAdding(false);
      }
    }
  }, [selectedItemId, inventory]);

  // --- DERIVED DATA ---
  // Extract unique categories from inventory
  const categories = Array.from(new Set(inventory.map(i => i.category).filter(Boolean)));
  
  // Helper to calculate status dynamically based on qty
  const getStockStatus = (qty: number, min: number = 0) => {
      if (qty <= 0) return 'OUT_OF_STOCK';
      if (qty <= min) return 'LOW_STOCK';
      return 'IN_STOCK';
  };

  const filteredItems = inventory.filter(item => {
    const currentStatus = getStockStatus(item.qty, item.minStock);
    const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const lowStockCount = inventory.filter(i => getStockStatus(i.qty, i.minStock) === 'LOW_STOCK').length;
  const outOfStockCount = inventory.filter(i => i.qty <= 0).length;

  // --- ACTIONS ---
  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setIsEditing(true);
    setSelectedItemId(null);
    setFormData({ ...emptyItem, id: Date.now().toString() });
  };

  const handleSave = () => {
      if (!formData.name || !formData.price) {
          alert("Name and Price are required");
          return;
      }
      
      const finalItem = {
          ...formData,
          status: getStockStatus(formData.qty, formData.minStock)
      };

      if (isAdding) {
          addInventoryItem(finalItem);
          setIsAdding(false);
          setSelectedItemId(finalItem.id);
      } else {
          updateInventoryItem(finalItem);
      }
      setIsEditing(false);
  };

  const handleDelete = () => {
      if(confirm("Are you sure you want to delete this item? This cannot be undone.")) {
          // In a real app, we would call deleteInventoryItem here.
          // For now, we'll just visually reset as the prompt didn't explicitly ask for a delete function in the store,
          // but the UI requires it.
           alert("Item deletion would happen here. (Mock)");
           setSelectedItemId(null);
           setIsEditing(false);
      }
  };

  const handleCancel = () => {
      if (isAdding) {
          setIsAdding(false);
          setIsEditing(false);
          setSelectedItemId(null);
      } else {
          const item = inventory.find(i => i.id === selectedItemId);
          if (item) setFormData(item);
          setIsEditing(false);
      }
  };

  // Quick Action: Adjust Qty from Editor
  const adjustQty = (delta: number) => {
      setFormData(prev => ({ ...prev, qty: Math.max(0, prev.qty + delta) }));
  };

  const categoryOptions = [
    { value: 'ALL', label: 'All Categories' },
    ...categories.map(c => ({ value: c, label: c }))
  ];

  const formCategoryOptions = [
      { value: '', label: 'Select Category' },
      { value: 'Electronics', label: 'Electronics' },
      { value: 'Drinks', label: 'Drinks' },
      { value: 'Snacks', label: 'Snacks' },
      { value: 'Accessories', label: 'Accessories' },
      { value: 'Other', label: 'Other' }
  ];

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-12 gap-6">
      
      {/* --- LEFT PANEL: SIDEBAR / FILTERS (3 COLS) --- */}
      <div className="col-span-12 md:col-span-3 flex flex-col gap-4 h-full">
        
        <Button onClick={handleAddNew} className="py-4 text-lg shadow-xl shadow-blue-900/20 mb-2">
          <i className="fas fa-plus mr-3"></i> Add New Item
        </Button>

        <div className="glass rounded-2xl p-4 flex-col gap-4 overflow-y-auto custom-scrollbar hidden md:flex">
             {/* Mini Stats */}
             <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-red-500/20 rounded-xl p-3 text-center border border-red-500/30">
                    <p className="text-xs text-red-200 uppercase font-bold">Low Stock</p>
                    <p className="text-2xl font-bold text-white">{lowStockCount}</p>
                </div>
                <div className="bg-gray-500/20 rounded-xl p-3 text-center border border-white/10">
                    <p className="text-xs text-white/50 uppercase font-bold">Empty</p>
                    <p className="text-2xl font-bold text-white">{outOfStockCount}</p>
                </div>
             </div>

             <div className="h-px bg-white/10 my-2"></div>

             {/* Filters */}
             <div className="space-y-4">
                <div>
                    <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2 block">Search</label>
                    <div className="relative">
                        <i className="fas fa-search absolute left-3 top-3.5 text-white/50"></i>
                        <input 
                            type="text" 
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-sm"
                            placeholder="Name, SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2 block">Category</label>
                    <div className="space-y-1">
                        {categoryOptions.map(cat => (
                            <button
                                key={cat.value}
                                onClick={() => setCategoryFilter(cat.value)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex justify-between items-center ${
                                    categoryFilter === cat.value 
                                    ? 'bg-white/20 text-white font-bold border border-white/20' 
                                    : 'text-white/70 hover:bg-white/10'
                                }`}
                            >
                                <span>{cat.label}</span>
                                {cat.value !== 'ALL' && (
                                    <span className="text-xs bg-white/10 px-1.5 rounded text-white/50">
                                        {inventory.filter(i => i.category === cat.value).length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2 block">Stock Status</label>
                    <div className="flex flex-wrap gap-2">
                         <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'text-white/50 border-white/10'}`}>All</button>
                         <button onClick={() => setStatusFilter('IN_STOCK')} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${statusFilter === 'IN_STOCK' ? 'bg-green-500/20 text-green-200 border-green-500/30' : 'text-white/50 border-white/10'}`}>In Stock</button>
                         <button onClick={() => setStatusFilter('LOW_STOCK')} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${statusFilter === 'LOW_STOCK' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30' : 'text-white/50 border-white/10'}`}>Low</button>
                         <button onClick={() => setStatusFilter('OUT_OF_STOCK')} className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${statusFilter === 'OUT_OF_STOCK' ? 'bg-red-500/20 text-red-200 border-red-500/30' : 'text-white/50 border-white/10'}`}>Empty</button>
                    </div>
                </div>
             </div>
        </div>
      </div>

      {/* --- MIDDLE PANEL: LIST (5 COLS) --- */}
      <div className="col-span-12 md:col-span-5 h-full flex flex-col">
         <div className="glass rounded-2xl flex-1 overflow-hidden flex flex-col">
             {/* Table Header */}
             <div className="grid grid-cols-12 gap-2 p-4 border-b border-white/10 text-xs font-bold text-white/50 uppercase tracking-wider bg-white/5">
                 <div className="col-span-6">Item Details</div>
                 <div className="col-span-3 text-right">Price</div>
                 <div className="col-span-3 text-center">Stock</div>
             </div>

             {/* Table Rows */}
             <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
                 {filteredItems.map(item => {
                     const status = getStockStatus(item.qty, item.minStock);
                     return (
                        <div 
                            key={item.id}
                            onClick={() => handleSelectItem(item.id)}
                            className={`
                                grid grid-cols-12 gap-2 p-3 rounded-xl cursor-pointer border transition-all duration-200 items-center
                                ${selectedItemId === item.id 
                                    ? 'bg-white/20 border-white/40 shadow-lg z-10' 
                                    : 'bg-transparent border-transparent hover:bg-white/10 hover:border-white/10'
                                }
                            `}
                        >
                            <div className="col-span-6 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-inner
                                    ${status === 'OUT_OF_STOCK' ? 'bg-red-500/20' : 'bg-blue-500/20'}
                                `}>
                                    {item.category ? item.category.charAt(0) : 'I'}
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="text-white font-medium text-sm truncate">{item.name}</h4>
                                    <p className="text-white/50 text-xs truncate">{item.sku || 'No SKU'} • {item.category}</p>
                                </div>
                            </div>
                            <div className="col-span-3 text-right font-mono text-white text-sm">
                                {settings.currency} {item.price}
                            </div>
                            <div className="col-span-3 flex flex-col items-center justify-center">
                                <span className={`text-sm font-bold ${status === 'LOW_STOCK' ? 'text-yellow-300' : status === 'OUT_OF_STOCK' ? 'text-red-400' : 'text-white'}`}>
                                    {item.qty}
                                </span>
                                {status !== 'IN_STOCK' && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${status === 'LOW_STOCK' ? 'bg-yellow-500/20 text-yellow-200' : 'bg-red-500/20 text-red-200'}`}>
                                        {status.replace('_', ' ')}
                                    </span>
                                )}
                            </div>
                        </div>
                     );
                 })}
                 {filteredItems.length === 0 && (
                     <div className="text-center py-10 text-white/30">
                         <i className="fas fa-box-open text-3xl mb-3"></i>
                         <p>No items found</p>
                     </div>
                 )}
             </div>
         </div>
      </div>

      {/* --- RIGHT PANEL: EDITOR (4 COLS) --- */}
      <div className="col-span-12 md:col-span-4 h-full">
          {isAdding || selectedItemId ? (
              <div className="glass rounded-2xl h-full flex flex-col overflow-hidden animate-slide-down relative">
                  
                  {/* Header */}
                  <div className="p-6 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent flex justify-between items-start">
                      <div>
                           {isEditing ? (
                               <span className="text-xs text-blue-300 font-bold uppercase tracking-wider">
                                   {isAdding ? 'Creating New Item' : 'Editing Item'}
                               </span>
                           ) : (
                               <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border
                                   ${getStockStatus(formData.qty, formData.minStock) === 'IN_STOCK' ? 'bg-green-500/20 text-green-200 border-green-500/30' : 
                                     getStockStatus(formData.qty, formData.minStock) === 'LOW_STOCK' ? 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30' : 
                                     'bg-red-500/20 text-red-200 border-red-500/30'}
                               `}>
                                   {getStockStatus(formData.qty, formData.minStock).replace('_', ' ')}
                               </span>
                           )}
                           <h2 className="text-2xl font-bold text-white mt-2 leading-tight">
                               {formData.name || 'New Item'}
                           </h2>
                           {!isEditing && <p className="text-white/50 text-sm mt-1">SKU: {formData.sku || 'N/A'}</p>}
                      </div>
                      <div className="flex gap-2">
                          {isEditing ? (
                              <>
                                  <Button variant="secondary" onClick={handleCancel} className="w-8 h-8 !p-0 flex items-center justify-center rounded-lg">
                                      <i className="fas fa-times"></i>
                                  </Button>
                                  <Button onClick={handleSave} className="w-8 h-8 !p-0 flex items-center justify-center rounded-lg bg-green-500/40 border-green-400/50">
                                      <i className="fas fa-check"></i>
                                  </Button>
                              </>
                          ) : (
                              <>
                                  <Button variant="secondary" onClick={() => setIsEditing(true)} className="w-8 h-8 !p-0 flex items-center justify-center rounded-lg">
                                      <i className="fas fa-pencil-alt"></i>
                                  </Button>
                                  <Button variant="danger" onClick={handleDelete} className="w-8 h-8 !p-0 flex items-center justify-center rounded-lg">
                                      <i className="fas fa-trash"></i>
                                  </Button>
                              </>
                          )}
                      </div>
                  </div>

                  {/* Form Content */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                      
                      {/* Section: Basic Info */}
                      <div className="space-y-4">
                          <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider border-b border-white/10 pb-2">Basic Information</h4>
                          <div className="grid grid-cols-1 gap-4">
                               <Input 
                                  label="Item Name" 
                                  value={formData.name} 
                                  onChange={e => setFormData({...formData, name: e.target.value})}
                                  disabled={!isEditing}
                               />
                               <div className="grid grid-cols-2 gap-4">
                                   <Input 
                                      label="SKU / Barcode" 
                                      value={formData.sku || ''} 
                                      onChange={e => setFormData({...formData, sku: e.target.value})}
                                      disabled={!isEditing}
                                   />
                                   <Select 
                                      label="Category"
                                      value={formData.category}
                                      onChange={e => setFormData({...formData, category: e.target.value})}
                                      options={formCategoryOptions}
                                      disabled={!isEditing}
                                   />
                               </div>
                          </div>
                      </div>

                      {/* Section: Pricing */}
                      <div className="space-y-4">
                          <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider border-b border-white/10 pb-2">Pricing</h4>
                          <div className="grid grid-cols-2 gap-4">
                               <Input 
                                  label="Selling Price" 
                                  type="number"
                                  value={formData.price} 
                                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                                  disabled={!isEditing}
                               />
                               {/* Add cost price here later if needed */}
                          </div>
                      </div>

                      {/* Section: Inventory */}
                      <div className="space-y-4">
                          <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider border-b border-white/10 pb-2">Stock Management</h4>
                          
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-4">
                               <div className="flex justify-between items-center">
                                   <span className="text-white font-medium">Current Quantity</span>
                                   <div className="flex items-center gap-3">
                                       {isEditing && (
                                            <button onClick={() => adjustQty(-1)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white">-</button>
                                       )}
                                       <span className="text-2xl font-bold text-white min-w-[40px] text-center">{formData.qty}</span>
                                       {isEditing && (
                                            <button onClick={() => adjustQty(1)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white">+</button>
                                       )}
                                   </div>
                               </div>
                               <Input 
                                  label="Low Stock Alert Level" 
                                  type="number"
                                  value={formData.minStock || 0} 
                                  onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})}
                                  disabled={!isEditing}
                                  className="bg-black/20"
                               />
                          </div>
                      </div>

                       {/* Section: Details */}
                       <div className="space-y-4">
                          <h4 className="text-white/50 text-xs font-bold uppercase tracking-wider border-b border-white/10 pb-2">Additional Details</h4>
                          <textarea 
                              className={`w-full px-4 py-3 rounded-xl glass-input h-24 resize-none ${!isEditing ? 'opacity-70' : ''}`}
                              value={formData.details || ''}
                              onChange={(e) => setFormData({...formData, details: e.target.value})}
                              disabled={!isEditing}
                              placeholder="Description, supplier notes, etc."
                          />
                      </div>

                  </div>
              </div>
          ) : (
              <div className="glass rounded-2xl h-full flex flex-col items-center justify-center text-center p-8">
                   <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/10 text-5xl mb-4 animate-pulse">
                      <i className="fas fa-boxes"></i>
                  </div>
                  <h3 className="text-white font-bold text-xl">Inventory Manager</h3>
                  <p className="text-white/50 mt-2 max-w-xs">Select an item from the list to view details, adjust stock, or edit pricing.</p>
              </div>
          )}
      </div>

    </div>
  );
};
