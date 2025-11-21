# Fridge MV POS - Point of Sale System

A modern, glassmorphism-styled Point of Sale (POS) and Inventory Management System designed for wholesalers and retail operations.

## 🚀 Features

*   **Role-Based Dashboards**: Admin, Finance, Cashier, and Customer (In-House & Delivery).
*   **Inventory Management**: Real-time stock tracking, SKU management, and low-stock alerts.
*   **POS Terminal**: Fast checkout with barcode support, credit sales, and cash sales.
*   **Invoicing**: PDF invoice generation, credit tracking, and payment verification (Cash/Bank Transfer).
*   **Purchase Orders (PO)**: Wholesaler management, PO creation, GST calculation, and stock receiving.
*   **Delivery System**: Dedicated flow for delivery customers to request deliveries based on their profile address.
*   **Secure Auth**: Redbox ID + One-Time Verification Code system for account creation.

## 🛠 Tech Stack

*   **Frontend**: React (TypeScript)
*   **Styling**: Tailwind CSS
*   **Build Tool**: Vite (implied via Create React App or similar)
*   **Persistence**: Local Storage (Mock Service for Demo)

## 📦 Installation & Local Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-repo/fridgemv-pos.git
    cd fridgemv-pos
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Start Dev Server**
    ```bash
    npm start
    ```

4.  **Build for Production**
    ```bash
    npm run build
    ```

## 🔐 Authentication Flow (Important)

This system uses a restricted sign-up process:

1.  **Admin** creates a user profile in the `Users` tab.
2.  **Admin** generates a **Verification Code** from the Admin Dashboard for that specific Redbox ID.
3.  **User** goes to the Sign Up page, enters their Redbox ID, the Code, and sets their password.
4.  **User** can now log in.

*Default Demo Credentials:*
*   **Admin**: ID: `ADMIN01` | Pass: `admin`
*   **Cashier**: ID: `POS-01` | Pass: `123`

## 📝 License

MIT License.
