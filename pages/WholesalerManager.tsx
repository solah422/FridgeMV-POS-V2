
import React, { useState, useEffect } from 'react';
import { useStore } from '../services/store';
import { Card, Button, Input, Select, Badge, GlassDatePicker } from '../components/GlassComponents';
import { Wholesaler, PurchaseOrder, POItem, InventoryItem } from '../types';

// Declare html2pdf global
declare var html2pdf: any;

export const WholesalerManager: React.FC = () => {
  const { wholesalers, addWholesaler, updateWholesaler, inventory, purchaseOrders, createPurchaseOrder, updatePurchaseOrderStatus, addInventoryItem, settings } = useStore();

  // --- STATE ---
  const [selectedWholesalerId, setSelectedWholesalerId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'POS' | 'NOTES'>('POS');

  // Modals
  const [showWholesalerModal, setShowWholesalerModal] = useState(false);
  const [showPOCreateModal, setShowPOCreateModal] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null); // Triggers PO Detail Modal

  // PO Detail Tabs
  const [poDetailTab, setPoDetailTab] = useState<'SUMMARY' | 'ITEMS' | 'TIMELINE'>('SUMMARY');

  // Forms
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE'>('ALL');

  const [wholesalerForm, setWholesalerForm] = useState<Wholesaler>({
    id: '', name: '', code: '', contact: '', phone: '', email: '', 
    address: '', city: '', itemsSupplied: '', linkedInventoryIds: [], tags: [], 
    paymentTerms: 'Cash on Pickup', status: 'ACTIVE', notes: ''
  });

  // Sub-state for Wholesaler Form (Adding Items)
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ name: '', price: 0, category: 'Other' });
  const [itemSelectId, setItemSelectId] = useState('');

  // Sub-state for PO Item Receiving
  const [receiveInputs, setReceiveInputs] = useState<{[key: string]: number}>({});


  // PO Create Form
  const [poForm, setPoForm] = useState<Partial<PurchaseOrder>>({
      poNumber: '', date: new Date().toISOString().split('T')[0], expectedDeliveryDate: '',
      items: [], notes: '', shipping: 0, tax: 0, discount: 0, wholesalerId: ''
  });
  const [poItemInput, setPoItemInput] = useState<{id: string, qty: number, cost: number}>({ id: '', qty: 1, cost: 0 });

  // --- DERIVED DATA ---
  const selectedWholesaler = wholesalers.find(w => w.id === selectedWholesalerId);
  const selectedPO = purchaseOrders.find(p => p.id === selectedPOId);

  const filteredWholesalers = wholesalers.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (w.code && w.code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filterType === 'ALL' ? true : 
                            filterType === 'ACTIVE' ? w.status === 'ACTIVE' : true;
      return matchesSearch && matchesFilter;
  });

  const wholesalerPOs = selectedWholesalerId ? purchaseOrders.filter(p => p.wholesalerId === selectedWholesalerId) : [];

  // PO Summary Stats
  const totalOpenPOs = purchaseOrders.filter(p => p.status === 'SENT' || p.status === 'PARTIALLY_RECEIVED').length;
  const totalOverdue = purchaseOrders.filter(p => {
      if (!p.expectedDeliveryDate) return false;
      return new Date(p.expectedDeliveryDate) < new Date() && p.status !== 'RECEIVED' && p.status !== 'CANCELLED';
  }).length;
  const totalPartial = purchaseOrders.filter(p => p.status === 'PARTIALLY_RECEIVED').length;

  // --- EFFECTS ---
  useEffect(() => {
      setReceiveInputs({});
  }, [selectedPOId]);

  const getLastPODate = (wholesalerId: string) => {
      const pos = purchaseOrders.filter(p => p.wholesalerId === wholesalerId);
      if (pos.length === 0) return 'N/A';
      const dates = pos.map(p => new Date(p.date).getTime());
      const maxDate = Math.max(...dates);
      return new Date(maxDate).toLocaleDateString();
  };

  // --- ACTIONS ---
  
  const handleEditWholesaler = () => {
      if (selectedWholesaler) {
          setWholesalerForm(selectedWholesaler);
          setIsAddingNewItem(false);
          setShowWholesalerModal(true);
      }
  };

  const handleAddNewWholesaler = () => {
      setWholesalerForm({
        id: '', name: '', code: '', contact: '', phone: '', email: '', 
        address: '', city: '', itemsSupplied: '', linkedInventoryIds: [], tags: [], 
        paymentTerms: 'Cash on Pickup', status: 'ACTIVE', notes: ''
      });
      setIsAddingNewItem(false);
      setShowWholesalerModal(true);
  };

  // Manage Linked Items in Wholesaler Form
  const handleLinkItem = (id: string) => {
      if (!id) return;
      const currentLinks = wholesalerForm.linkedInventoryIds || [];
      if (!currentLinks.includes(id)) {
          const item = inventory.find(i => i.id === id);
          // Update both the ID list and the visual string
          const newLinks = [...currentLinks, id];
          const newString = item 
            ? (wholesalerForm.itemsSupplied ? `${wholesalerForm.itemsSupplied}, ${item.name}` : item.name)
            : wholesalerForm.itemsSupplied;

          setWholesalerForm({ ...wholesalerForm, linkedInventoryIds: newLinks, itemsSupplied: newString });
      }
      setItemSelectId('');
  };

  const handleUnlinkItem = (id: string) => {
      const newLinks = (wholesalerForm.linkedInventoryIds || []).filter(lid => lid !== id);
      // Regenerate string summary
      const summary = newLinks.map(lid => inventory.find(i => i.id === lid)?.name).filter(Boolean).join(', ');
      setWholesalerForm({ ...wholesalerForm, linkedInventoryIds: newLinks, itemsSupplied: summary });
  };

  const handleQuickAddItem = () => {
      if (!newItemForm.name || newItemForm.price <= 0) return alert("Name and Price required");
      
      const newItem: InventoryItem = {
          id: Date.now().toString(),
          name: newItemForm.name,
          price: newItemForm.price,
          category: newItemForm.category,
          qty: 0,
          details: 'Quick added from Wholesaler',
          status: 'OUT_OF_STOCK'
      };
      
      addInventoryItem(newItem);
      handleLinkItem(newItem.id); // Link it immediately
      setIsAddingNewItem(false);
      setNewItemForm({ name: '', price: 0, category: 'Other' });
  };

  const handleSaveWholesaler = () => {
      if (!wholesalerForm.name) return alert("Name required");
      
      // Ensure itemsSupplied string is synced if user didn't manually edit it
      const summary = (wholesalerForm.linkedInventoryIds || [])
          .map(lid => inventory.find(i => i.id === lid)?.name)
          .filter(Boolean)
          .join(', ');

      const finalForm = { ...wholesalerForm, itemsSupplied: summary || wholesalerForm.itemsSupplied };

      if (wholesalerForm.id) {
          updateWholesaler(finalForm);
      } else {
          addWholesaler({ ...finalForm, id: Date.now().toString() });
      }
      setShowWholesalerModal(false);
  };

  const handleInitPO = (wholesaler?: Wholesaler) => {
      const targetWholesaler = wholesaler || selectedWholesaler;
      setPoForm({
          poNumber: `PO-${Date.now().toString().slice(-6)}`,
          date: new Date().toISOString().split('T')[0],
          expectedDeliveryDate: '',
          items: [],
          wholesalerId: targetWholesaler?.id || '',
          notes: '',
          shipping: 0, tax: 0, discount: 0
      });
      setPoItemInput({ id: '', qty: 1, cost: 0 });
      setShowPOCreateModal(true);
  };

  const handleAddItemToPO = () => {
      if (!poItemInput.id) return;
      const invItem = inventory.find(i => i.id === poItemInput.id);
      if (!invItem) return;
      
      const newItem: POItem = {
          inventoryItemId: invItem.id,
          name: invItem.name,
          qty: poItemInput.qty,
          unitCost: poItemInput.cost,
          total: poItemInput.qty * poItemInput.cost
      };
      
      setPoForm(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
      setPoItemInput({ id: '', qty: 1, cost: 0 });
  };

  // Helper to pre-fill cost if item selected
  const handleItemSelection = (itemId: string) => {
      const item = inventory.find(i => i.id === itemId);
      // Prioritize last purchase price, else use current selling price (fallback)
      const cost = item?.lastPurchasePrice ? item.lastPurchasePrice : (item?.price || 0);
      setPoItemInput({
          id: itemId,
          qty: 1,
          cost: cost
      });
  };

  const handleRemovePOItem = (index: number) => {
      setPoForm(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== index) }));
  };

  const handleCreatePO = (status: 'DRAFT' | 'SENT') => {
      if (!poForm.wholesalerId) return alert("Select a wholesaler");
      const w = wholesalers.find(w => w.id === poForm.wholesalerId);
      if (!w) return;

      if (!poForm.items?.length) return alert("Add at least one item");
      
      // Store will handle 8% GST calculation
      createPurchaseOrder({
          id: `PO-ID-${Date.now()}`,
          poNumber: poForm.poNumber || 'N/A',
          wholesalerId: w.id,
          wholesalerName: w.name,
          date: poForm.date || new Date().toISOString(),
          expectedDeliveryDate: poForm.expectedDeliveryDate,
          status: status,
          items: poForm.items,
          subtotal: 0, // Calculated in store
          tax: 0, // Calculated in store
          shipping: poForm.shipping || 0,
          discount: poForm.discount || 0,
          totalCost: 0, // Calculated in store
          notes: poForm.notes,
          timeline: []
      });

      setShowPOCreateModal(false);
      if (selectedWholesalerId !== w.id) {
          setSelectedWholesalerId(w.id);
      }
  };

  const handleReceiveItemsSave = () => {
      if (!selectedPOId) return;
      
      const itemsToReceive: {itemId: string, qty: number}[] = [];
      
      Object.entries(receiveInputs).forEach(([itemId, qty]) => {
          const quantity = qty as number;
          if (quantity > 0) {
              itemsToReceive.push({ itemId, qty: quantity });
          }
      });

      if (itemsToReceive.length === 0) return alert("No items to receive.");

      updatePurchaseOrderStatus(selectedPOId, 'PARTIALLY_RECEIVED', itemsToReceive);
      setReceiveInputs({}); // Reset inputs
      alert("Items received and inventory updated.");
  };

  // --- PDF PRINT LOGIC ---
  const handlePrintPO = () => {
      const element = document.getElementById('po-print-area');
      if (!element) {
          alert("Print area not found. Please switch to 'Document View' tab.");
          return;
      }
      
      const filename = `PO_${selectedPO?.poNumber || 'Draft'}.pdf`;

      if (typeof html2pdf !== 'undefined') {
          const opt = {
              margin: 0,
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };
          
          // Remove shadows for cleaner PDF
          const originalBoxShadow = element.style.boxShadow;
          element.style.boxShadow = 'none';

          html2pdf().set(opt).from(element).save().then(() => {
              element.style.boxShadow = originalBoxShadow;
          }).catch((err: any) => {
              console.error("PDF Error", err);
              element.style.boxShadow = originalBoxShadow;
              window.print();
          });
      } else {
          window.print();
      }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'DRAFT': return 'yellow';
          case 'SENT': return 'blue';
          case 'PARTIALLY_RECEIVED': return 'yellow';
          case 'RECEIVED': return 'green';
          case 'CANCELLED': return 'red';
          default: return 'blue';
      }
  };

  const inventoryOptions = [
      { value: '', label: '-- Select Item --' },
      ...inventory.map(i => ({ 
          value: i.id, 
          label: `${i.name} (Stock: ${i.qty})` 
      }))
  ];

  const categoryOptions = [
      { value: 'Other', label: 'Other' },
      { value: 'Electronics', label: 'Electronics' },
      { value: 'Drinks', label: 'Drinks' },
      { value: 'Snacks', label: 'Snacks' },
  ];

  const wholesalerOptions = [
      { value: '', label: '-- Select Wholesaler --' },
      ...wholesalers.filter(w => w.status === 'ACTIVE').map(w => ({ value: w.id, label: w.name }))
  ];

  // Live Tax Calculation for UI Display in Create Modal
  const currentSubtotal = poForm.items?.reduce((a,b)=>a+b.total,0) || 0;
  const currentGST = currentSubtotal * 0.08;
  const currentTotal = currentSubtotal + currentGST + (poForm.shipping || 0) - (poForm.discount || 0);

  return (
    <div className="space-y-6 pb-10">
      
      {/* 1. HEADER BAR & PO TRACKER */}
      <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-4">
          <div className="flex-1 w-full">
              <h1 className="text-3xl font-bold text-white mb-4">Wholesaler Management</h1>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="relative flex-1 w-full md:w-auto">
                      <i className="fas fa-search absolute left-3 top-3.5 text-white/50"></i>
                      <input 
                          className="w-full pl-9 pr-4 py-3 rounded-xl glass-input"
                          placeholder="Search Wholesalers..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                      />
                  </div>
                  <div className="flex gap-2 w-full md:w-auto justify-center">
                      <button onClick={() => setFilterType('ALL')} className={`px-4 py-2 rounded-lg text-sm border transition ${filterType === 'ALL' ? 'bg-white/20 text-white border-white/20' : 'text-white/50 border-transparent hover:bg-white/5'}`}>All</button>
                      <button onClick={() => setFilterType('ACTIVE')} className={`px-4 py-2 rounded-lg text-sm border transition ${filterType === 'ACTIVE' ? 'bg-blue-500/20 text-blue-200 border-blue-500/30' : 'text-white/50 border-transparent hover:bg-white/5'}`}>Active</button>
                  </div>
              </div>
          </div>

          {/* PO Tracker Strip */}
          <div className="glass rounded-xl p-3 flex gap-4 items-center shadow-lg">
              <div className="flex flex-col items-center px-4 border-r border-white/10">
                  <span className="text-xs text-white/50 uppercase font-bold">Open POs</span>
                  <span className="text-xl font-bold text-blue-300">{totalOpenPOs}</span>
              </div>
              <div className="flex flex-col items-center px-4 border-r border-white/10">
                  <span className="text-xs text-white/50 uppercase font-bold">Overdue</span>
                  <span className="text-xl font-bold text-red-300">{totalOverdue}</span>
              </div>
              <div className="flex flex-col items-center px-4">
                  <span className="text-xs text-white/50 uppercase font-bold">Partial</span>
                  <span className="text-xl font-bold text-yellow-300">{totalPartial}</span>
              </div>
          </div>

          <div className="flex gap-3">
              <Button onClick={handleAddNewWholesaler}>
                  <i className="fas fa-plus mr-2"></i> Wholesaler
              </Button>
              <Button variant="secondary" onClick={() => handleInitPO()}>
                  <i className="fas fa-file-contract mr-2"></i> New PO
              </Button>
          </div>
      </div>

      {/* 2. WHOLESALERS TABLE */}
      <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-white">
                  <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-white/60 uppercase text-xs font-bold">
                          <th className="p-4">Wholesaler</th>
                          <th className="p-4">Contact</th>
                          <th className="p-4">Phone</th>
                          <th className="p-4">City</th>
                          <th className="p-4">Last PO</th>
                          <th className="p-4">Status</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredWholesalers.length === 0 && (
                          <tr><td colSpan={6} className="p-8 text-center text-white/40">No wholesalers found.</td></tr>
                      )}
                      {filteredWholesalers.map(w => (
                          <tr 
                              key={w.id}
                              onClick={() => setSelectedWholesalerId(w.id)}
                              className={`
                                  border-b border-white/5 cursor-pointer transition-all duration-200
                                  ${selectedWholesalerId === w.id ? 'bg-white/20 shadow-inner' : 'hover:bg-white/5 hover:pl-1'}
                              `}
                          >
                              <td className="p-4">
                                  <div className="font-bold">{w.name}</div>
                                  {w.code && <div className="text-xs text-white/50">{w.code}</div>}
                              </td>
                              <td className="p-4 text-sm">{w.contact}</td>
                              <td className="p-4 text-sm font-mono">{w.phone || '-'}</td>
                              <td className="p-4 text-sm">{w.city || '-'}</td>
                              <td className="p-4 text-sm text-white/60">{getLastPODate(w.id)}</td>
                              <td className="p-4">
                                  <Badge color={w.status === 'ACTIVE' ? 'green' : 'red'}>{w.status}</Badge>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </Card>

      {/* 3. DETAIL SECTION (EXPANDABLE) */}
      {selectedWholesaler && (
          <div className="animate-slide-down glass rounded-2xl overflow-hidden border-t-4 border-blue-500/50">
               {/* Info Header */}
               <div className="p-6 flex flex-col md:flex-row justify-between items-start gap-6 border-b border-white/10 bg-white/5">
                   <div className="flex gap-4">
                       <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl text-white font-bold shadow-lg">
                           {selectedWholesaler.name.charAt(0)}
                       </div>
                       <div>
                           <h2 className="text-2xl font-bold text-white">{selectedWholesaler.name}</h2>
                           <p className="text-white/60 max-w-md">{selectedWholesaler.itemsSupplied || 'No items listed'}</p>
                           <div className="flex gap-2 mt-2">
                               {selectedWholesaler.tags?.map((t, i) => (
                                   <span key={i} className="text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/10 text-white/80">{t}</span>
                               ))}
                           </div>
                       </div>
                   </div>
                   <div className="flex gap-4 text-right">
                       <div>
                           <p className="text-xs text-white/50 uppercase">Terms</p>
                           <p className="text-white font-medium">{selectedWholesaler.paymentTerms}</p>
                       </div>
                   </div>
               </div>

               {/* Tabs & Content */}
               <div className="p-6">
                   <div className="flex items-center justify-between mb-4">
                       <div className="flex gap-4 border-b border-white/10">
                           <button 
                               onClick={() => setDetailTab('POS')} 
                               className={`pb-2 px-3 text-sm font-bold transition-colors ${detailTab === 'POS' ? 'text-white border-b-2 border-blue-500' : 'text-white/50 hover:text-white'}`}
                           >
                               Purchase Orders
                           </button>
                           <button 
                               onClick={() => setDetailTab('NOTES')} 
                               className={`pb-2 px-3 text-sm font-bold transition-colors ${detailTab === 'NOTES' ? 'text-white border-b-2 border-blue-500' : 'text-white/50 hover:text-white'}`}
                           >
                               Notes
                           </button>
                       </div>
                       <div className="flex gap-2">
                           <Button variant="secondary" className="text-xs" onClick={handleEditWholesaler}>Edit Info</Button>
                           <Button className="text-xs" onClick={() => handleInitPO(selectedWholesaler)}>Create New PO</Button>
                       </div>
                   </div>

                   {detailTab === 'POS' && (
                       <div className="overflow-x-auto">
                           <table className="w-full text-left text-white text-sm">
                               <thead>
                                   <tr className="text-white/40 border-b border-white/10">
                                       <th className="pb-2">PO Number</th>
                                       <th className="pb-2">Date</th>
                                       <th className="pb-2">Expected</th>
                                       <th className="pb-2 text-center">Received</th>
                                       <th className="pb-2 text-right">Total (Inc GST)</th>
                                       <th className="pb-2 text-center">Status</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {wholesalerPOs.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-white/40">No Orders History</td></tr>}
                                   {wholesalerPOs.map(po => {
                                       const totalQty = po.items.reduce((a,b)=>a+b.qty,0);
                                       const totalReceived = po.items.reduce((a,b)=>a+(b.receivedQty||0),0);
                                       const pct = totalQty > 0 ? Math.round((totalReceived/totalQty)*100) : 0;
                                       const isOverdue = po.expectedDeliveryDate && new Date(po.expectedDeliveryDate) < new Date() && po.status !== 'RECEIVED';

                                       return (
                                           <tr key={po.id} onClick={() => {setSelectedPOId(po.id); setPoDetailTab('SUMMARY')}} className="border-b border-white/5 hover:bg-white/5 cursor-pointer group">
                                               <td className="py-3 font-medium text-blue-200 group-hover:text-blue-300 transition-colors">
                                                   {po.poNumber}
                                                   {isOverdue && <span className="ml-2 text-[10px] bg-red-500 text-white px-1 rounded">Overdue</span>}
                                               </td>
                                               <td className="py-3">{new Date(po.date).toLocaleDateString()}</td>
                                               <td className="py-3">{po.expectedDeliveryDate || '-'}</td>
                                               <td className="py-3 text-center">
                                                    <div className="w-24 h-2 bg-white/10 rounded-full mx-auto overflow-hidden relative">
                                                        <div className="h-full bg-green-400" style={{width: `${pct}%`}}></div>
                                                    </div>
                                                    <span className="text-[10px] text-white/50">{pct}%</span>
                                               </td>
                                               <td className="py-3 text-right font-bold">{settings.currency} {po.totalCost.toFixed(2)}</td>
                                               <td className="py-3 text-center"><Badge color={getStatusColor(po.status) as any}>{po.status.split('_')[0]}</Badge></td>
                                           </tr>
                                       )
                                   })}
                               </tbody>
                           </table>
                       </div>
                   )}

                   {detailTab === 'NOTES' && (
                       <div className="bg-black/20 rounded-xl p-4 min-h-[150px] text-white/80 whitespace-pre-wrap border border-white/10">
                           {selectedWholesaler.notes || "No notes available for this wholesaler."}
                       </div>
                   )}
               </div>
          </div>
      )}

      {/* --- MODAL: PO DETAIL (ENHANCED) --- */}
      {selectedPO && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="glass-heavy rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl shadow-black/50 border border-white/20">
                   {/* Header */}
                   <div className="p-6 border-b border-white/10 flex justify-between items-start bg-white/5 rounded-t-2xl no-print">
                       <div className="flex gap-4 items-center">
                           <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                               <i className="fas fa-box-open text-white/80"></i>
                           </div>
                           <div>
                               <div className="flex items-center gap-3 mb-1">
                                   <h2 className="text-2xl font-bold text-white">{selectedPO.poNumber}</h2>
                                   <Badge color={getStatusColor(selectedPO.status) as any}>{selectedPO.status.replace('_', ' ')}</Badge>
                               </div>
                               <p className="text-white/60">Vendor: <span className="text-white font-bold">{selectedPO.wholesalerName}</span></p>
                           </div>
                       </div>
                       <div className="flex items-center gap-4">
                           <div className="text-right">
                               <p className="text-xs text-white/50 uppercase">Total Cost</p>
                               <p className="text-2xl font-bold text-white">{settings.currency} {selectedPO.totalCost.toFixed(2)}</p>
                           </div>
                           <Button onClick={handlePrintPO} className="bg-blue-600/40 border-blue-500/40">
                               <i className="fas fa-print mr-2"></i> Print / PDF
                           </Button>
                           <button onClick={() => setSelectedPOId(null)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                               <i className="fas fa-times"></i>
                           </button>
                       </div>
                   </div>

                   {/* Detail Tabs */}
                   <div className="flex border-b border-white/10 px-6 bg-black/20 no-print">
                       <button onClick={() => setPoDetailTab('SUMMARY')} className={`py-4 mr-6 text-sm font-bold border-b-2 transition-colors ${poDetailTab === 'SUMMARY' ? 'text-white border-blue-400' : 'text-white/50 border-transparent hover:text-white'}`}>Document View</button>
                       <button onClick={() => setPoDetailTab('ITEMS')} className={`py-4 mr-6 text-sm font-bold border-b-2 transition-colors ${poDetailTab === 'ITEMS' ? 'text-white border-blue-400' : 'text-white/50 border-transparent hover:text-white'}`}>Items & Receiving</button>
                       <button onClick={() => setPoDetailTab('TIMELINE')} className={`py-4 text-sm font-bold border-b-2 transition-colors ${poDetailTab === 'TIMELINE' ? 'text-white border-blue-400' : 'text-white/50 border-transparent hover:text-white'}`}>Timeline</button>
                   </div>

                   {/* Content */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                       
                       {/* --- SUMMARY / DOCUMENT VIEW --- */}
                       {poDetailTab === 'SUMMARY' && (
                           <div className="animate-fade-in flex justify-center">
                                <div id="po-print-area" className="bg-white text-black font-sans w-full max-w-[210mm] p-10 min-h-[297mm] relative shadow-xl flex flex-col">
                                    
                                    {/* 1. Header (UPDATED) */}
                                    <div className="flex justify-between items-start mb-10">
                                        <div className="flex gap-4">
                                             {settings.logo ? (
                                                <img src={settings.logo} className="w-16 h-16 object-contain" alt="Logo" />
                                            ) : (
                                                <div className="w-16 h-16 bg-gray-900 text-white flex items-center justify-center rounded-lg text-2xl font-bold shadow-sm">
                                                    {settings.shopName.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <h1 className="text-xl font-bold text-gray-900 tracking-tight">{settings.shopName}</h1>
                                                <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                                                    <p>{settings.island || "Male'"}, {settings.country || "Maldives"}</p>
                                                    <p>Contact: {settings.contactNumber || "+960 777-0000"}</p>
                                                    <p>Email: {settings.email || "admin@fridgemv.com"}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Purchase Order</h2>
                                            <p className="text-2xl font-bold text-gray-900">{selectedPO.poNumber}</p>
                                            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                                <p>Date: {new Date(selectedPO.date).toLocaleDateString()}</p>
                                                <p>Delivery: {selectedPO.expectedDeliveryDate || 'N/A'}</p>
                                                <p className={`font-bold uppercase ${selectedPO.status === 'RECEIVED' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                                    Status: {selectedPO.status.replace('_', ' ')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Details Block */}
                                    <div className="grid grid-cols-2 gap-10 mb-10 border-t border-b border-gray-100 py-6">
                                        {/* Vendor */}
                                        <div>
                                            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Vendor (From)</h3>
                                            <p className="font-bold text-gray-900 text-lg">{selectedWholesaler.name}</p>
                                            <p className="text-sm text-gray-600 mt-1">{selectedWholesaler.address || 'No Address'}</p>
                                            <div className="mt-3 space-y-1 text-sm text-gray-600">
                                                <div className="flex gap-2">
                                                    <span className="w-20 text-gray-400">Contact:</span>
                                                    <span className="font-medium">{selectedWholesaler.contact}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="w-20 text-gray-400">Phone:</span>
                                                    <span className="font-medium">{selectedWholesaler.phone || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ship To */}
                                        <div>
                                            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-3">Ship To (Store)</h3>
                                            <p className="font-bold text-gray-900 text-lg">{settings.shopName}</p>
                                            <p className="text-sm text-gray-600 mt-1">Main Warehouse / Store Location</p>
                                            <p className="text-sm text-gray-600">{settings.island || "Male'"}, {settings.country || "Maldives"}</p>
                                        </div>
                                    </div>

                                    {/* 3. Item Table */}
                                    <div className="mb-6">
                                        <table className="w-full text-sm border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] tracking-wider font-bold">
                                                    <th className="py-3 px-4 text-left rounded-l-lg">Item Description</th>
                                                    <th className="py-3 px-4 text-center">Qty</th>
                                                    <th className="py-3 px-4 text-right">Unit Cost</th>
                                                    <th className="py-3 px-4 text-right rounded-r-lg">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-gray-700">
                                                {selectedPO.items.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <p className="font-bold text-gray-900">{item.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                                ID: {item.inventoryItemId}
                                                            </p>
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-medium">{item.qty}</td>
                                                        <td className="py-3 px-4 text-right">{settings.currency} {item.unitCost.toFixed(2)}</td>
                                                        <td className="py-3 px-4 text-right font-bold text-gray-900">{settings.currency} {item.total.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* 4. Totals Section */}
                                    <div className="flex justify-end mb-10">
                                        <div className="w-72 bg-gray-50 rounded-lg p-6 border border-gray-100">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>Subtotal</span>
                                                    <span className="font-medium">{settings.currency} {selectedPO.subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm text-gray-600">
                                                    <span>GST (8%)</span>
                                                    <span className="font-medium">{settings.currency} {selectedPO.tax.toFixed(2)}</span>
                                                </div>
                                                {selectedPO.shipping > 0 && (
                                                    <div className="flex justify-between text-sm text-gray-600">
                                                        <span>Shipping</span>
                                                        <span className="font-medium">{settings.currency} {selectedPO.shipping.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {selectedPO.discount > 0 && (
                                                    <div className="flex justify-between text-sm text-emerald-600">
                                                        <span>Discount</span>
                                                        <span>- {settings.currency} {selectedPO.discount.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="h-px bg-gray-200 my-2"></div>
                                                <div className="flex justify-between text-lg font-bold text-gray-900">
                                                    <span>Total Payable</span>
                                                    <span>{settings.currency} {selectedPO.totalCost.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5. Footer / Signatures */}
                                    <div className="mt-auto mb-8">
                                        <div className="grid grid-cols-2 gap-20">
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Notes</h4>
                                                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 min-h-[60px]">
                                                    {selectedPO.notes || 'No additional notes.'}
                                                </div>
                                            </div>
                                            <div className="text-center pt-10">
                                                <div className="border-b border-gray-300 w-3/4 mx-auto mb-2"></div>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider">Authorized Signature</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center border-t border-gray-100 pt-6">
                                        <p className="text-xs text-gray-400">Generated by Fridge MV POS</p>
                                    </div>
                                </div>
                           </div>
                       )}

                       {poDetailTab === 'ITEMS' && (
                           <div className="animate-fade-in space-y-4">
                               <div className="glass rounded-xl overflow-hidden border border-white/10">
                                    <table className="w-full text-left text-white text-sm">
                                        <thead className="bg-black/20 border-b border-white/10">
                                            <tr className="text-white/60">
                                                <th className="p-4 pl-6 font-medium">Item</th>
                                                <th className="p-4 text-center font-medium">Ordered Qty</th>
                                                <th className="p-4 text-center font-medium">Progress</th>
                                                <th className="p-4 text-center font-medium">Previously<br/>Received</th>
                                                {(selectedPO.status === 'SENT' || selectedPO.status === 'PARTIALLY_RECEIVED') && (
                                                    <th className="p-4 text-center font-medium bg-blue-500/10 text-blue-200">Receive Now<br/>(Input Qty)</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {selectedPO.items.map((item, idx) => {
                                                const received = item.receivedQty || 0;
                                                const pct = item.qty > 0 ? Math.round((received / item.qty) * 100) : 0;
                                                const isReceivable = (selectedPO.status === 'SENT' || selectedPO.status === 'PARTIALLY_RECEIVED');
                                                const remaining = item.qty - received;

                                                return (
                                                    <tr key={idx} className="hover:bg-white/5">
                                                        <td className="p-4 pl-6 font-medium">
                                                            {item.name}
                                                            <div className="text-xs text-white/40">SKU: {inventory.find(i => i.id === item.inventoryItemId)?.sku || 'N/A'}</div>
                                                        </td>
                                                        <td className="p-4 text-center text-lg font-bold">{item.qty}</td>
                                                        <td className="p-4 align-middle">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                                    <div className={`h-full ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{width: `${Math.min(pct, 100)}%`}}></div>
                                                                </div>
                                                                <span className="text-xs text-white/60 w-8 text-right">{pct}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center font-medium text-white/80">{received}</td>
                                                        {isReceivable && (
                                                            <td className="p-4 text-center bg-blue-500/5">
                                                                <input 
                                                                    type="number" 
                                                                    min="0" 
                                                                    max={remaining}
                                                                    className="w-20 px-2 py-1 text-center rounded-lg bg-white/10 border border-white/20 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    placeholder="0"
                                                                    value={receiveInputs[item.inventoryItemId] !== undefined ? receiveInputs[item.inventoryItemId] : ''}
                                                                    onChange={(e) => {
                                                                        const val = Math.min(parseInt(e.target.value) || 0, remaining);
                                                                        setReceiveInputs(prev => ({ ...prev, [item.inventoryItemId]: val }));
                                                                    }}
                                                                />
                                                                {remaining > 0 && (
                                                                    <div className="text-[10px] text-white/30 mt-1">Max: {remaining}</div>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                               </div>

                               {(selectedPO.status === 'SENT' || selectedPO.status === 'PARTIALLY_RECEIVED') && (
                                   <div className="flex justify-end mt-4">
                                       <Button 
                                           onClick={handleReceiveItemsSave}
                                           className="bg-green-600/40 hover:bg-green-600/60 border-green-500/50 shadow-lg"
                                        >
                                           <i className="fas fa-check mr-2"></i> Confirm Receiving
                                       </Button>
                                   </div>
                               )}
                           </div>
                       )}

                       {poDetailTab === 'TIMELINE' && (
                           <div className="max-w-2xl mx-auto animate-fade-in pt-4">
                               <div className="space-y-6 relative">
                                   {/* Vertical Line */}
                                   <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-white/10"></div>
                                   
                                   {selectedPO.timeline.map((evt, i) => (
                                       <div key={i} className="relative pl-12">
                                           <div className="absolute left-[11px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border border-white/50 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                           <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-white font-bold text-sm">{evt.status}</span>
                                                    <span className="text-white/40 text-xs">{new Date(evt.date).toLocaleString()}</span>
                                                </div>
                                                <p className="text-white/70 text-sm">{evt.note}</p>
                                                {evt.user && <p className="text-white/30 text-xs mt-2">by {evt.user}</p>}
                                           </div>
                                       </div>
                                   ))}
                                   {selectedPO.timeline.length === 0 && <p className="text-center text-white/50">No history found.</p>}
                               </div>
                           </div>
                       )}

                   </div>

                   {/* Footer Actions based on State Machine */}
                   <div className="p-6 border-t border-white/10 bg-white/5 flex justify-between items-center rounded-b-2xl no-print">
                       <div className="text-xs text-white/40">
                           Current Status: <span className="font-bold text-white/70">{selectedPO.status}</span>
                       </div>
                       <div className="flex gap-3">
                           {selectedPO.status === 'DRAFT' && (
                              <>
                                <Button variant="danger" onClick={() => updatePurchaseOrderStatus(selectedPO.id, 'CANCELLED')}>Cancel Order</Button>
                                <Button onClick={() => updatePurchaseOrderStatus(selectedPO.id, 'SENT')}>Send Order</Button>
                              </>
                          )}
                          {selectedPO.status === 'SENT' && (
                              <>
                                 <Button variant="danger" onClick={() => updatePurchaseOrderStatus(selectedPO.id, 'CANCELLED')}>Cancel Order</Button>
                                 <Button variant="primary" className="bg-green-600/40 hover:bg-green-600/60 border-green-500/50" onClick={() => updatePurchaseOrderStatus(selectedPO.id, 'RECEIVED')}>Receive Full Order</Button>
                              </>
                          )}
                          {selectedPO.status === 'PARTIALLY_RECEIVED' && (
                              <Button variant="primary" className="bg-green-600/40 hover:bg-green-600/60 border-green-500/50" onClick={() => updatePurchaseOrderStatus(selectedPO.id, 'RECEIVED')}>Complete Receiving</Button>
                          )}
                          {(selectedPO.status === 'RECEIVED' || selectedPO.status === 'CANCELLED') && (
                              <span className="text-white/50 italic text-sm flex items-center px-4">
                                  <i className="fas fa-lock mr-2"></i> Order is closed.
                              </span>
                          )}
                       </div>
                   </div>
              </div>
          </div>
      )}

      {/* --- MODAL: ADD/EDIT WHOLESALER (UPDATED) --- */}
      {showWholesalerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="glass-heavy rounded-2xl w-full max-w-2xl animate-slide-down shadow-2xl flex flex-col max-h-[85vh]">
                  <div className="p-6 border-b border-white/10 bg-white/5 rounded-t-2xl">
                      <h3 className="text-xl font-bold text-white">{wholesalerForm.id ? 'Edit Wholesaler' : 'Add New Wholesaler'}</h3>
                  </div>
                  
                  <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                      {/* Section 1: Basic Details */}
                      <div className="grid grid-cols-2 gap-4">
                          <Input label="Name" value={wholesalerForm.name} onChange={e => setWholesalerForm({...wholesalerForm, name: e.target.value})} />
                          <Input label="Code" value={wholesalerForm.code || ''} onChange={e => setWholesalerForm({...wholesalerForm, code: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <Input label="Contact Person" value={wholesalerForm.contact} onChange={e => setWholesalerForm({...wholesalerForm, contact: e.target.value})} />
                          <Input label="Phone" value={wholesalerForm.phone || ''} onChange={e => setWholesalerForm({...wholesalerForm, phone: e.target.value})} />
                      </div>
                      <Input label="Email" value={wholesalerForm.email || ''} onChange={e => setWholesalerForm({...wholesalerForm, email: e.target.value})} />
                      
                      <div className="h-px bg-white/10 my-2"></div>
                      
                      {/* Section 2: Location & Terms */}
                      <div className="grid grid-cols-2 gap-4">
                           <Input label="City" value={wholesalerForm.city || ''} onChange={e => setWholesalerForm({...wholesalerForm, city: e.target.value})} />
                           <Input label="Payment Terms" value={wholesalerForm.paymentTerms || ''} onChange={e => setWholesalerForm({...wholesalerForm, paymentTerms: e.target.value})} />
                      </div>

                      <div className="h-px bg-white/10 my-2"></div>

                      {/* Section 3: Items Supplied (Linking Logic) */}
                      <div>
                          <label className="block text-white/80 text-sm font-medium mb-2">Items Supplied</label>
                          
                          {/* Toggle Switch for View */}
                          <div className="flex gap-2 mb-3">
                              <button 
                                  onClick={() => setIsAddingNewItem(false)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${!isAddingNewItem ? 'bg-blue-500/30 border-blue-400 text-white' : 'border-white/10 text-white/50'}`}
                              >
                                  Select Existing
                              </button>
                              <button 
                                  onClick={() => setIsAddingNewItem(true)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border transition ${isAddingNewItem ? 'bg-green-500/30 border-green-400 text-white' : 'border-white/10 text-white/50'}`}
                              >
                                  + Add New Item
                              </button>
                          </div>

                          {/* Mode: Select Existing */}
                          {!isAddingNewItem && (
                              <div className="bg-black/20 p-3 rounded-xl border border-white/10">
                                  <Select 
                                      placeholder="Search Inventory to Link..."
                                      value={itemSelectId}
                                      onChange={(e) => handleLinkItem(e.target.value as string)}
                                      options={inventoryOptions}
                                      className="mb-2"
                                  />
                              </div>
                          )}

                          {/* Mode: Add New Item */}
                          {isAddingNewItem && (
                              <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 space-y-3 animate-fade-in">
                                   <p className="text-xs text-green-200 font-bold uppercase">Quick Add Inventory Item</p>
                                   <div className="grid grid-cols-2 gap-3">
                                       <Input 
                                          placeholder="Item Name" 
                                          value={newItemForm.name} 
                                          onChange={e => setNewItemForm({...newItemForm, name: e.target.value})} 
                                          className="mb-0 bg-black/20"
                                       />
                                       <Select 
                                          value={newItemForm.category}
                                          onChange={e => setNewItemForm({...newItemForm, category: e.target.value as string})}
                                          options={categoryOptions}
                                          className="mb-0"
                                       />
                                   </div>
                                   <div className="flex gap-3">
                                       <div className="flex-1">
                                            <Input 
                                                type="number" 
                                                placeholder="Selling Price" 
                                                value={newItemForm.price} 
                                                onChange={e => setNewItemForm({...newItemForm, price: Number(e.target.value)})} 
                                                className="mb-0 bg-black/20"
                                            />
                                       </div>
                                       <Button onClick={handleQuickAddItem} className="h-[46px] bg-green-500/40 hover:bg-green-500/60 border-green-500/50">
                                           Add & Link
                                       </Button>
                                   </div>
                              </div>
                          )}

                          {/* Linked Items Tags Display */}
                          <div className="flex flex-wrap gap-2 mt-3">
                              {wholesalerForm.linkedInventoryIds && wholesalerForm.linkedInventoryIds.length > 0 ? (
                                  wholesalerForm.linkedInventoryIds.map(lid => {
                                      const item = inventory.find(i => i.id === lid);
                                      if (!item) return null;
                                      return (
                                          <span key={lid} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm text-white">
                                              {item.name}
                                              <button onClick={() => handleUnlinkItem(lid)} className="hover:text-red-400 transition"><i className="fas fa-times text-xs"></i></button>
                                          </span>
                                      )
                                  })
                              ) : (
                                  <p className="text-white/30 text-xs italic">No items linked yet.</p>
                              )}
                          </div>
                      </div>

                      <div>
                          <label className="block text-white/80 text-sm font-medium mb-1 ml-1">Private Notes</label>
                          <textarea 
                             className="w-full glass-input rounded-xl p-3 h-20 resize-none"
                             value={wholesalerForm.notes || ''}
                             onChange={e => setWholesalerForm({...wholesalerForm, notes: e.target.value})}
                          />
                      </div>
                  </div>
                  
                  <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-white/5 rounded-b-2xl">
                      <Button variant="secondary" onClick={() => setShowWholesalerModal(false)}>Cancel</Button>
                      <Button onClick={handleSaveWholesaler}>Save Wholesaler</Button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: CREATE PO (MISSING IN PREVIOUS CODE) --- */}
      {showPOCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-heavy rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-down">
                <div className="p-6 border-b border-white/10 bg-white/5 rounded-t-2xl flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Create Purchase Order</h3>
                    <div className="text-right">
                        <p className="text-xs text-white/50 uppercase">Est. Total</p>
                        <p className="text-xl font-bold text-white">{settings.currency} {currentTotal.toFixed(2)}</p>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select 
                            label="Wholesaler"
                            value={poForm.wholesalerId || ''}
                            onChange={e => setPoForm({...poForm, wholesalerId: e.target.value as string})}
                            options={wholesalerOptions}
                            disabled={!!selectedWholesalerId} // Lock if launched from context
                        />
                        <Input 
                            label="PO Number" 
                            value={poForm.poNumber} 
                            onChange={e => setPoForm({...poForm, poNumber: e.target.value})} 
                        />
                        <GlassDatePicker 
                            label="Order Date"
                            value={poForm.date || ''}
                            onChange={date => setPoForm({...poForm, date})}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <GlassDatePicker 
                            label="Expected Delivery"
                            value={poForm.expectedDeliveryDate || ''}
                            onChange={date => setPoForm({...poForm, expectedDeliveryDate: date})}
                        />
                        <Input 
                            label="Reference / Notes" 
                            value={poForm.notes || ''} 
                            onChange={e => setPoForm({...poForm, notes: e.target.value})} 
                            placeholder="e.g. Urgent Order"
                        />
                    </div>

                    <div className="h-px bg-white/10"></div>

                    {/* Item Entry */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <h4 className="text-xs font-bold uppercase text-white/50 mb-3">Add Items</h4>
                        <div className="flex flex-col md:flex-row gap-3 items-end">
                            <div className="flex-1 w-full">
                                <Select 
                                    label="Item"
                                    value={poItemInput.id}
                                    onChange={e => handleItemSelection(e.target.value as string)}
                                    options={inventoryOptions}
                                    className="mb-0"
                                />
                            </div>
                            <div className="w-24">
                                <Input 
                                    label="Qty" 
                                    type="number" 
                                    value={poItemInput.qty} 
                                    onChange={e => setPoItemInput({...poItemInput, qty: Number(e.target.value)})} 
                                    className="mb-0"
                                />
                            </div>
                            <div className="w-32">
                                <Input 
                                    label="Unit Cost" 
                                    type="number" 
                                    value={poItemInput.cost} 
                                    onChange={e => setPoItemInput({...poItemInput, cost: Number(e.target.value)})} 
                                    className="mb-0"
                                />
                            </div>
                            <Button onClick={handleAddItemToPO} className="h-[48px] bg-blue-600/40 border-blue-500/40">
                                <i className="fas fa-plus"></i>
                            </Button>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-black/20 rounded-xl overflow-hidden border border-white/10 min-h-[150px]">
                        <table className="w-full text-left text-sm text-white">
                            <thead className="bg-white/5 text-white/50 uppercase text-xs font-bold">
                                <tr>
                                    <th className="p-3">Item</th>
                                    <th className="p-3 text-center">Qty</th>
                                    <th className="p-3 text-right">Cost</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {(!poForm.items || poForm.items.length === 0) && (
                                    <tr><td colSpan={5} className="p-4 text-center text-white/30">No items added yet.</td></tr>
                                )}
                                {poForm.items?.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-white/5">
                                        <td className="p-3">{item.name}</td>
                                        <td className="p-3 text-center">{item.qty}</td>
                                        <td className="p-3 text-right">{item.unitCost.toFixed(2)}</td>
                                        <td className="p-3 text-right font-bold">{item.total.toFixed(2)}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleRemovePOItem(idx)} className="text-red-400 hover:text-red-200"><i className="fas fa-times"></i></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Financials */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-white/70 text-sm">
                                <span>Subtotal</span>
                                <span>{currentSubtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-white/70 text-sm">
                                <span>GST (8%)</span>
                                <span>{currentGST.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white/70 text-sm flex-1">Shipping</span>
                                <input 
                                    type="number" 
                                    className="w-20 bg-black/20 border border-white/10 rounded px-2 py-1 text-right text-white text-sm"
                                    value={poForm.shipping}
                                    onChange={e => setPoForm({...poForm, shipping: Number(e.target.value)})}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white/70 text-sm flex-1">Discount</span>
                                <input 
                                    type="number" 
                                    className="w-20 bg-black/20 border border-white/10 rounded px-2 py-1 text-right text-white text-sm"
                                    value={poForm.discount}
                                    onChange={e => setPoForm({...poForm, discount: Number(e.target.value)})}
                                />
                            </div>
                            <div className="h-px bg-white/20 my-2"></div>
                            <div className="flex justify-between text-white font-bold text-lg">
                                <span>Total</span>
                                <span>{settings.currency} {currentTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 bg-white/5 rounded-b-2xl flex justify-between">
                    <Button variant="secondary" onClick={() => setShowPOCreateModal(false)}>Cancel</Button>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => handleCreatePO('DRAFT')}>Save Draft</Button>
                        <Button onClick={() => handleCreatePO('SENT')} className="shadow-lg shadow-blue-500/20">Create & Send</Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};