# x10Hosting Deployment Guide - Fridge MV POS

This guide explains how to deploy the Fridge MV POS system to x10Hosting.

> **Note:** The current version of Fridge MV POS is built as a Single Page Application (SPA) with a mock local storage backend. This allows it to run on x10Hosting immediately without complex PHP setup. However, the SQL schema below is provided if you decide to connect a real backend later.

## Phase 1: Prepare the Build

1.  Open your terminal in the project folder.
2.  Run the build command:
    ```bash
    npm run build
    ```
    *(This generates a `dist` or `build` folder containing `index.html`, CSS, and JS files).*

## Phase 2: Database Setup (Future Proofing)

Even though the current version uses local storage, set up the database now for future backend integration.

1.  Log into your **x10Hosting cPanel**.
2.  Go to **MySQL® Databases**.
3.  **Create New Database**:
    *   Name: `yourusername_fridgemv`
4.  **Create New User**:
    *   Username: `yourusername_pos_admin`
    *   Password: *(Generate a strong password)*
5.  **Add User to Database**:
    *   Select User and Database created above.
    *   Check **ALL PRIVILEGES**.
    *   Click **Make Changes**.

### SQL Schema (For Future Backend)

If you implement a PHP/Node backend later, use this schema:

```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    redbox_id VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role ENUM('ADMIN', 'FINANCE', 'CASHIER', 'CUSTOMER_INHOUSE', 'CUSTOMER_DELIVERY') NOT NULL,
    credit_limit DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0,
    is_registered BOOLEAN DEFAULT FALSE,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE verification_codes (
    redbox_id VARCHAR(50) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    PRIMARY KEY (redbox_id)
);
```

## Phase 3: Uploading to x10Hosting

1.  Log into **x10Hosting cPanel** -> **File Manager**.
2.  Navigate to `public_html`.
3.  (Optional) Create a subfolder like `pos` if you don't want it on the main domain.
4.  Click **Upload**.
5.  Select all files **inside** your local `build` or `dist` folder (index.html, assets folder, etc.).
    *   *Do not upload the `build` folder itself, upload its contents.*
6.  Once uploaded, your site is live!

## Phase 4: Client-Side Routing Fix

Since this is a React SPA, you need to tell the server to redirect all requests to `index.html` so routing works.

1.  In **File Manager** (`public_html`), create a new file named `.htaccess`.
2.  Edit it and paste the following:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

*If you uploaded to a subfolder (e.g., `/pos`), change `RewriteBase /` to `RewriteBase /pos/` and the last rule to `/pos/index.html`.*

## Phase 5: Post-Deployment Checklist

1.  Visit your URL (e.g., `yourdomain.x10.mx`).
2.  Ensure the **Login Screen** appears with "Fridge MV POS" branding.
3.  Login with Admin credentials (`ADMIN01` / `admin`).
4.  Navigate to **Settings** and verify Company Name is "Fridge MV POS".
5.  Go to **Dashboard** -> **Account Setup** and test generating a verification code.
6.  Logout and try the **Sign Up** flow with a new code.

Your system is now deployed! 🚀
