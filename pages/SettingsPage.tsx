
import React, { useState, useRef } from 'react';
import { useStore } from '../services/store';
import { Card, Button, Input } from '../components/GlassComponents';
import { UserRole, User, InventoryItem } from '../types';

// --- HELPER: ROBUST CSV PARSER ---
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
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());
        result.push(row);
    }
    return result;
};

// --- COMPONENT: BULK UPLOAD CARD ---
interface BulkUploadCardProps {
    title: string;
    description: string;
    templateHeaders: string[];
    templateFilename: string;
    onProcess: (rows: string[][]) => { valid: any[], errors: { row: number, reason: string }[] };
    onImport: (validRows: any[]) => void;
}

const BulkUploadCard: React.FC<BulkUploadCardProps> = ({ title, description, templateHeaders, templateFilename, onProcess, onImport }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [errorData, setErrorData] = useState<{ row: number, reason: string }[]>([]);
    const [step, setStep] = useState<'IDLE' | 'PREVIEW' | 'COMPLETE'>('IDLE');
    const [importCount, setImportCount] = useState(0);

    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," + templateHeaders.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", templateFilename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const rows = parseCSV(text);
            
            // Remove Header Row (Assume first row is header)
            const dataRows = rows.slice(1);
            
            const { valid, errors } = onProcess(dataRows);
            setPreviewData(valid);
            setErrorData(errors);
            setStep('PREVIEW');
        };
        reader.readAsText(file);
        // Reset input to allow re-uploading same file if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmImport = () => {
        onImport(previewData);
        setImportCount(previewData.length);
        setStep('COMPLETE');
        setPreviewData([]);
        setErrorData([]);
    };

    const handleCancel = () => {
        setStep('IDLE');
        setPreviewData([]);
        setErrorData([]);
    };

    return (
        <div className="glass p-6 rounded-3xl border border-white/30 shadow-xl backdrop-blur-xl bg-white/10">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                    <i className={`fas ${title.includes('Customer') ? 'fa-users' : 'fa-boxes'}`}></i>
                </div>
                <h3 className="text-xl font-bold text-white">{title}</h3>
            </div>
            
            <p className="text-white/60 text-sm mb-6 min-h-[40px]">{description}</p>

            {step === 'IDLE' && (
                <div className="space-y-4 animate-fade-in">
                     <Button variant="secondary" onClick={handleDownloadTemplate} className="w-full border-dashed border-white/30 bg-white/5 hover:bg-white/10">
                        <i className="fas fa-download mr-2 text-blue-300"></i> Download CSV Template
                    </Button>

                    <div 
                        className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:bg-white/5 transition-all cursor-pointer relative group bg-black/10"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload}
                        />
                        <div className="flex flex-col items-center gap-3 pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/60 group-hover:scale-110 transition-transform shadow-inner">
                                <i className="fas fa-cloud-upload-alt text-xl"></i>
                            </div>
                            <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">Drop CSV here or Click to Upload</span>
                        </div>
                    </div>
                </div>
            )}

            {step === 'PREVIEW' && (
                <div className="space-y-4 animate-slide-down">
                    <div className="flex gap-3 text-sm">
                        <div className="bg-green-500/10 text-green-300 px-4 py-3 rounded-xl flex-1 text-center border border-green-500/20 shadow-inner">
                            <span className="block font-bold text-2xl">{previewData.length}</span>
                            <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Valid Rows</span>
                        </div>
                        <div className="bg-red-500/10 text-red-300 px-4 py-3 rounded-xl flex-1 text-center border border-red-500/20 shadow-inner">
                            <span className="block font-bold text-2xl">{errorData.length}</span>
                            <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">Invalid Rows</span>
                        </div>
                    </div>

                    {errorData.length > 0 && (
                        <div className="bg-black/30 rounded-xl p-4 max-h-40 overflow-y-auto custom-scrollbar border border-white/5">
                            <p className="text-xs text-red-300 font-bold uppercase mb-3 sticky top-0 bg-transparent">Validation Errors:</p>
                            <div className="space-y-2">
                                {errorData.map((err, idx) => (
                                    <div key={idx} className="text-xs text-white/70 border-b border-white/5 last:border-0 pb-2 flex gap-2">
                                        <span className="text-white/30 font-mono whitespace-nowrap">Row {err.row}:</span>
                                        <span className="text-red-200">{err.reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {previewData.length > 0 && (
                        <div className="bg-white/5 rounded-xl p-3 text-xs text-white/50 text-center border border-white/5">
                            Ready to import {previewData.length} records.
                        </div>
                    )}

                    <div className="flex gap-3 mt-2">
                        <Button variant="secondary" onClick={handleCancel} className="flex-1">Cancel</Button>
                        <Button onClick={handleConfirmImport} disabled={previewData.length === 0} className="flex-1 shadow-lg shadow-green-500/20 bg-green-600/30 border-green-500/40 hover:bg-green-600/50">
                            Confirm Import
                        </Button>
                    </div>
                </div>
            )}

            {step === 'COMPLETE' && (
                <div className="text-center py-8 animate-slide-down">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400 border border-green-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <i className="fas fa-check text-3xl"></i>
                    </div>
                    <h4 className="text-white font-bold text-xl">Import Successful!</h4>
                    <p className="text-white/60 text-sm mt-2 mb-6">Successfully added <span className="text-white font-bold">{importCount}</span> records to the database.</p>
                    <Button onClick={() => setStep('IDLE')} className="w-full">Upload Another File</Button>
                </div>
            )}
        </div>
    );
};


export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, currentUser, users, bulkAddUsers, wholesalers, bulkAddInventoryItem } = useStore();
  const [form, setForm] = useState(settings);
  const [isEditing, setIsEditing] = useState(false);

  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isFinance = currentUser?.role === UserRole.FINANCE;
  const hasAccess = isAdmin || isFinance;

  const handleSave = () => {
    updateSettings(form);
    setIsEditing(false);
    alert('Settings Updated Successfully');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setForm({...form, logo: reader.result as string});
        };
        reader.readAsDataURL(file);
    }
  };

  // --- LOGIC: CUSTOMER IMPORT ---
  const customerHeaders = ["name", "mobile_number", "address", "redbox_id", "email_address", "telegram_id"];
  
  const processCustomers = (rows: string[][]) => {
      const valid: User[] = [];
      const errors: { row: number, reason: string }[] = [];

      rows.forEach((row, idx) => {
          const rowNum = idx + 2; // Adjust for header + 0-index

          // Safe destructure with defaults to avoid undefined errors on short rows
          const name = row[0]?.trim();
          const mobile = row[1]?.trim();
          const address = row[2]?.trim();
          const redboxId = row[3]?.trim();
          const email = row[4]?.trim();
          const telegramId = row[5]?.trim();

          // 1. Validation: Required Fields
          if (!name) {
              errors.push({ row: rowNum, reason: "Name is required" });
              return;
          }
          if (!redboxId) {
              errors.push({ row: rowNum, reason: "Redbox ID is required" });
              return;
          }

          // 2. Validation: Contact Logic
          // Logic: if telegram_id == "" AND mobile_number == "" → invalid
          if (!mobile && !telegramId) {
              errors.push({ row: rowNum, reason: "Must provide either Mobile Number or Telegram ID" });
              return;
          }

          // 3. Check Duplicates (Optional but good)
          // We check mobile if it exists
          if (mobile && users.some(u => u.mobile === mobile)) {
              // Depending on requirement, we might skip or update. For now, skip with error.
              errors.push({ row: rowNum, reason: `Mobile ${mobile} already exists in system` });
              return;
          }

          const newUser: User = {
              id: `BULK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name,
              mobile: mobile || "", // Fallback to empty string if using telegram only
              telegramId: telegramId || undefined,
              email: email || undefined,
              address: address || undefined,
              redboxId: redboxId,
              role: UserRole.CUSTOMER_INHOUSE,
              creditLimit: settings.defaultCreditLimit,
              currentBalance: 0,
              status: 'ACTIVE',
              joinedDate: new Date().toISOString(),
              notes: telegramId ? `Primary Contact: Telegram (${telegramId})` : undefined,
              isRegistered: false
          };
          valid.push(newUser);
      });

      return { valid, errors };
  };

  // --- LOGIC: ITEM IMPORT ---
  const itemHeaders = ["item_name", "sku", "barcode", "category", "selling_price", "cost_price", "initial_quantity", "default_wholesaler_name", "status"];

  const processItems = (rows: string[][]) => {
      const valid: InventoryItem[] = [];
      const errors: { row: number, reason: string }[] = [];

      rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          
          const name = row[0]?.trim();
          const sku = row[1]?.trim();
          const barcode = row[2]?.trim();
          const category = row[3]?.trim();
          const sellPriceStr = row[4]?.trim();
          const costPriceStr = row[5]?.trim();
          const qtyStr = row[6]?.trim();
          const wholesalerName = row[7]?.trim();
          const statusStr = row[8]?.trim();

          if (!name) { errors.push({ row: rowNum, reason: "Missing item_name" }); return; }
          
          const price = parseFloat(sellPriceStr);
          if (isNaN(price)) { errors.push({ row: rowNum, reason: "Invalid selling_price" }); return; }

          let supplierData = {};
          if (wholesalerName) {
              const w = wholesalers.find(wh => wh.name.toLowerCase() === wholesalerName.toLowerCase());
              if (w) {
                  supplierData = { lastSupplierId: w.id, lastSupplierName: w.name };
              }
          }

          const qty = parseInt(qtyStr) || 0;

          const newItem: InventoryItem = {
              id: `BULK-ITM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name,
              sku: sku || barcode || undefined,
              category: category || 'Uncategorized',
              price: price,
              qty: qty,
              minStock: 5,
              details: 'Imported via Bulk Upload',
              status: qty > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
              lastPurchasePrice: parseFloat(costPriceStr) || undefined,
              ...supplierData
          };
          valid.push(newItem);
      });

      return { valid, errors };
  };

  return (
    <div className="space-y-8 pb-24">
        
        {/* Header */}
        <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white">App Settings</h2>
            <div className="px-4 py-1.5 bg-white/10 rounded-full border border-white/10 text-xs text-white/50 font-mono">
                {currentUser?.role} VIEW
            </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* General Settings */}
            <Card>
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-bold text-white">Configuration</h3>
                    {hasAccess && !isEditing && (
                        <Button variant="secondary" onClick={() => setIsEditing(true)} className="text-xs">
                            <i className="fas fa-pencil-alt mr-2"></i> Edit Defaults
                        </Button>
                    )}
                </div>

                <div className="space-y-5">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <h4 className="text-white/70 text-xs font-bold uppercase tracking-wider mb-4">Company Profile</h4>
                        
                        {/* Logo Upload */}
                        <div className="flex items-center gap-4 mb-4">
                             <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden border border-white/20">
                                 {form.logo ? (
                                     <img src={form.logo} alt="Logo" className="w-full h-full object-contain" />
                                 ) : (
                                     <span className="text-white/30 text-xs">No Logo</span>
                                 )}
                             </div>
                             <div className="flex-1">
                                 <label className="block text-white/80 text-sm font-medium mb-1">Company Logo</label>
                                 <input 
                                     type="file" 
                                     accept="image/*"
                                     className="block w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all"
                                     onChange={handleLogoUpload}
                                     disabled={!isEditing}
                                 />
                             </div>
                        </div>

                        <Input 
                            label="Shop Name" 
                            value={form.shopName} 
                            onChange={(e) => setForm({...form, shopName: e.target.value})} 
                            disabled={!isEditing}
                        />
                        <div className="grid grid-cols-2 gap-4">
                             <Input 
                                label="Island / City" 
                                value={form.island || ''} 
                                onChange={(e) => setForm({...form, island: e.target.value})} 
                                disabled={!isEditing}
                            />
                             <Input 
                                label="Country" 
                                value={form.country || ''} 
                                onChange={(e) => setForm({...form, country: e.target.value})} 
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <Input 
                                label="Contact Number" 
                                value={form.contactNumber || ''} 
                                onChange={(e) => setForm({...form, contactNumber: e.target.value})} 
                                disabled={!isEditing}
                            />
                             <Input 
                                label="Email Address" 
                                value={form.email || ''} 
                                onChange={(e) => setForm({...form, email: e.target.value})} 
                                disabled={!isEditing}
                            />
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                         <h4 className="text-white/70 text-xs font-bold uppercase tracking-wider mb-4">Financial Defaults</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <Input 
                                label="Currency" 
                                value={form.currency} 
                                onChange={(e) => setForm({...form, currency: e.target.value})} 
                                disabled={!isEditing}
                            />
                            <Input 
                                label="Default Credit Limit" 
                                type="number"
                                value={form.defaultCreditLimit} 
                                onChange={(e) => setForm({...form, defaultCreditLimit: parseFloat(e.target.value)})} 
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block text-white/80 text-sm font-medium mb-1 ml-1">Bank Transfer Instructions</label>
                            <textarea 
                                className={`w-full px-4 py-3 rounded-xl glass-input h-28 resize-none text-sm leading-relaxed ${!isEditing ? 'opacity-70 cursor-not-allowed bg-black/10' : ''}`}
                                value={form.bankDetails} 
                                onChange={(e) => setForm({...form, bankDetails: e.target.value})} 
                                disabled={!isEditing}
                            />
                        </div>
                    </div>

                    {isEditing && (
                        <div className="flex gap-3 pt-2 animate-fade-in">
                            <Button onClick={handleSave} className="flex-1 bg-blue-600/40 border-blue-500/50 shadow-lg shadow-blue-500/20">Save Changes</Button>
                            <Button variant="secondary" onClick={() => {setIsEditing(false); setForm(settings);}} className="flex-1">Cancel</Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* System Info */}
            <Card>
                <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">System Diagnostics</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-white/60 text-sm">Version</span>
                        <span className="text-white font-mono font-bold text-sm bg-black/20 px-2 py-1 rounded">v2.1.0</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-white/60 text-sm">Active User</span>
                        <div className="text-right">
                            <div className="text-white font-bold text-sm">{currentUser?.name}</div>
                            <div className="text-[10px] text-white/40">{currentUser?.email || 'No email'}</div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-white/60 text-sm">Session ID</span>
                        <span className="text-white/40 font-mono text-xs">{currentUser?.id}</span>
                    </div>
                    
                    {!hasAccess && (
                         <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200 flex gap-3 items-start">
                            <i className="fas fa-info-circle mt-0.5"></i>
                            <p>Administrative settings are locked. Please contact a Finance Manager or Administrator to update shop details.</p>
                         </div>
                    )}
                </div>
            </Card>
        </div>

        {/* --- BULK UPLOAD SECTION (ADMIN ONLY) --- */}
        {isAdmin && (
            <div className="mt-12 animate-fade-in">
                 <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/5"></div>
                    <span className="px-4 py-1 rounded-full border border-blue-400/30 bg-blue-500/10 text-blue-300 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        Admin Zone
                    </span>
                    <h2 className="text-2xl font-bold text-white">Bulk Data Management</h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/5"></div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <BulkUploadCard 
                        title="Customer Bulk Upload"
                        description="Import customers via CSV. Required: Name, Redbox ID. Must have either Mobile or Telegram ID."
                        templateHeaders={customerHeaders}
                        templateFilename="customer_template.csv"
                        onProcess={processCustomers}
                        onImport={bulkAddUsers}
                     />

                     <BulkUploadCard 
                        title="Item Bulk Upload"
                        description="Import inventory items. Stock will be initialized immediately. Wholesalers are linked by name."
                        templateHeaders={itemHeaders}
                        templateFilename="item_template.csv"
                        onProcess={processItems}
                        onImport={bulkAddInventoryItem}
                     />
                 </div>
            </div>
        )}
    </div>
  );
};
