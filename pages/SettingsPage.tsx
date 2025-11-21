
import React, { useState, useRef } from 'react';
import { useStore } from '../services/store';
import { Card, Button, Input } from '../components/GlassComponents';
import { UserRole, User, InventoryItem } from '../types';

const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    const result: string[][] = [];
    for (let line of lines) {
        if (!line.trim()) continue;
        const row: string[] = [];
        let current = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') { inQuote = !inQuote; } 
            else if (char === ',' && !inQuote) { row.push(current.trim()); current = ''; } 
            else { current += char; }
        }
        row.push(current.trim());
        result.push(row);
    }
    return result;
};

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, currentUser, wholesalers, bulkAddInventoryItem } = useStore();
  const [form, setForm] = useState(settings);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateSettings(form);
    setIsEditing(false);
    alert('Settings Saved Locally.');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setForm({...form, logo: reader.result as string});
        reader.readAsDataURL(file);
    }
  };

  // Item Import Logic
  const processItems = (text: string) => {
      const rows = parseCSV(text).slice(1); // Skip header
      const valid: InventoryItem[] = [];
      
      rows.forEach(row => {
          if (!row[0]) return;
          valid.push({
              id: `IMP-${Date.now()}-${Math.random()}`,
              name: row[0],
              sku: row[1],
              category: row[3] || 'Uncategorized',
              price: parseFloat(row[4]) || 0,
              qty: parseInt(row[6]) || 0,
              minStock: 5,
              details: 'Imported',
              status: 'IN_STOCK'
          });
      });
      
      if (valid.length > 0) {
          bulkAddInventoryItem(valid);
          alert(`Imported ${valid.length} items.`);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => processItems(evt.target?.result as string);
      reader.readAsText(file);
  };

  return (
    <div className="space-y-8 pb-24">
        <h2 className="text-3xl font-bold text-white">Settings (Offline Mode)</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white">Shop Configuration</h3>
                    {!isEditing && (
                        <Button variant="secondary" onClick={() => setIsEditing(true)} className="text-xs">
                            <i className="fas fa-pencil-alt mr-2"></i> Edit
                        </Button>
                    )}
                </div>

                <div className="space-y-5">
                     <div className="flex items-center gap-4 mb-4">
                         <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden border border-white/20">
                             {form.logo ? <img src={form.logo} className="w-full h-full object-contain" /> : <span className="text-white/30 text-xs">No Logo</span>}
                         </div>
                         <div className="flex-1">
                             <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={!isEditing} className="text-sm text-white/60" />
                         </div>
                    </div>

                    <Input label="Shop Name" value={form.shopName} onChange={(e) => setForm({...form, shopName: e.target.value})} disabled={!isEditing} />
                    <div className="grid grid-cols-2 gap-4">
                         <Input label="Contact" value={form.contactNumber || ''} onChange={(e) => setForm({...form, contactNumber: e.target.value})} disabled={!isEditing} />
                         <Input label="Email" value={form.email || ''} onChange={(e) => setForm({...form, email: e.target.value})} disabled={!isEditing} />
                    </div>
                    <Input label="Currency" value={form.currency} onChange={(e) => setForm({...form, currency: e.target.value})} disabled={!isEditing} />
                    
                    {isEditing && (
                        <div className="flex gap-3 pt-2">
                            <Button onClick={handleSave} className="flex-1">Save Changes</Button>
                            <Button variant="secondary" onClick={() => {setIsEditing(false); setForm(settings);}} className="flex-1">Cancel</Button>
                        </div>
                    )}
                </div>
            </Card>

            {currentUser?.role === UserRole.ADMIN && (
                <Card>
                     <h3 className="text-xl font-bold text-white mb-4">Data Management</h3>
                     <p className="text-white/60 text-sm mb-4">Import inventory from CSV. Format: Name, SKU, Barcode, Category, Price, Cost, Qty.</p>
                     <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                        <i className="fas fa-upload mr-2"></i> Import Inventory CSV
                     </Button>
                     <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                </Card>
            )}
        </div>
    </div>
  );
};
