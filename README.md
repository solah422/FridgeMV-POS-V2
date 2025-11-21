
# Fridge MV POS (Offline Edition) - v2.0.0

A lightweight, fully offline Point of Sale (POS) system designed for local deployment.

## 🚀 Features (Offline Edition)
*   **100% Offline**: No internet required. Data saved to browser Local Storage.
*   **Roles**: Admin (Management) and Cashier (POS Only).
*   **POS Terminal**: Fast checkout, barcode support (via SKU input), and receipt generation.
*   **Inventory**: Track stock, low stock alerts, and bulk CSV import.
*   **Invoicing**: Generate PDF invoices locally.
*   **Purchase Orders**: Manage wholesalers and receiving.

## 🛠 Installation Guide (Local)

### Prerequisites
*   Node.js installed on your computer.

### Step 1: Install & Build
1.  Open terminal in project folder.
2.  Run `npm install`
3.  Run `npm run build`
4.  The `dist` (or `build`) folder now contains your standalone app.

### Step 2: Run Locally
You need a simple static file server to run the app.

**Option A: Use `serve` (Recommended)**
1.  Run `npm install -g serve`
2.  Run `serve -s dist`
3.  Open browser at `http://localhost:3000`

**Option B: Standard Web Server (XAMPP/WAMP)**
1.  Copy the contents of `dist` into your `htdocs` or `www` folder.
2.  Access via `http://localhost/fridgemvpos`

## 🔐 Default Login Credentials
Since this is an offline app, default accounts are hardcoded for initial access. You can change passwords in the Users settings.

*   **Admin**: 
    *   Username: `admin`
    *   Password: `admin`
*   **Cashier**:
    *   Username: `cashier`
    *   Password: `123`

## ⚠️ Data Persistence Note
Data is stored in your **Browser's Local Storage**. 
*   If you clear your browser cache/data, you will **LOSE** all POS data.
*   We recommend using a dedicated browser profile for the POS to prevent accidental clearing.

## 📝 License
MIT License
