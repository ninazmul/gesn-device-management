# ISP ERP

ISP ERP is a full-featured, modern Next.js 15 application designed for managing Internet Service Provider (ISP) business operations. It provides protected administrative access, customer record management with bulk Excel import/export, automated monthly bill generation, payment tracking with partial/advance calculations, expense management, real-time analytics, company settings, and custom invoice exports (PDF/Print).

For comprehensive technical documentation, refer to [docs/APP_DOCUMENTATION.md](docs/APP_DOCUMENTATION.md).

---

## 🚀 Features

- **Authentication & Authorization**: Integrated Clerk authentication with MongoDB email role verification to protect administrative routes.
- **Dashboard & Analytics**: Real-time metrics for total/active/inactive/disconnected customers, monthly collections, dues, expenses, net profit, and interactive income/expense charts.
- **Customer Management**:
  - Full CRUD operations with soft-delete capabilities.
  - Search, filter by status, and track connection date, package name, monthly fee, router details, and IP address.
  - **Bulk Data Operations**: Download sample Excel template, bulk import customer records, and export customer data to `.xlsx`.
- **Billing & Invoice System**:
  - One-click monthly bill generation for active customers.
  - Granular payment tracking supporting bill amount, paid amount, due amount, and advance amounts.
  - Automatic invoice number generation based on customizable prefix settings.
  - Single-click invoice PDF download (`jsPDF`/`html2canvas`) and browser print support.
- **Expense Tracking**: Categorized expense management (Bandwidth, Electricity, Salary, Maintenance, Equipment, Rent, Transport, Misc) with month/year filtering.
- **Financial Reports**: Multi-tab financial reporting (Income, Expense, Profit, Dues) with CSV data export.
- **Settings & Identity**: Global settings store for company details, logo, contact information, currency, and invoice numbering.
- **Admin Management**: Multi-admin access control with email-based authorization.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router) & React 19
- **Language**: TypeScript
- **Styling & UI**: Tailwind CSS, Radix UI Primitives, Lucide Icons, `tailwindcss-animate`
- **Authentication**: Clerk (`@clerk/nextjs`)
- **Database & ORM**: MongoDB with Mongoose
- **Charts & Data Visualization**: Recharts
- **Excel & Document Generation**: `xlsx` (SheetJS), `html2canvas`, `jspdf`
- **Form Management**: React Hook Form & Zod
- **Notifications**: `react-hot-toast`

---

## 💻 Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB instance (local or MongoDB Atlas cluster)
- Clerk account for authentication keys

### Installation

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory:

   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/gesn-device-management
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

- `npm run dev` - Starts the development server with Turbopack enabled.
- `npm run build` - Creates an optimized production build (runs Next.js type and lint checks).
- `npm run start` - Starts the production server after a successful build.
- `npm run lint` - Runs the configured Next.js ESLint rules.
- `npx tsc --noEmit` - Performs static type checking across the codebase.

---

## 📁 Project Structure

```text
app/
  (auth)/              # Public authentication routes (Sign-in / Sign-up)
  (root)/              # Protected ERP dashboard and module routes
    admins/            # Admin user management
    billing/           # Monthly billing & payment tracking
    components/        # Page-specific client components & invoice helpers
    customers/         # Customer database & bulk import/export
    expenses/          # Expense tracking & categorization
    reports/           # Financial reports & CSV export
    settings/          # Company identity & invoice prefix configuration
  access-denied/       # Access denied fallback page
components/
  shared/              # Reusable layout structures (Sidebar, Header, Cards)
  ui/                  # Radix UI primitives and styled UI components
hooks/                 # Custom React hooks
lib/
  actions/             # Next.js Server Actions for database CRUD
  database/            # Mongoose models & database connection handler
types/                 # Shared TypeScript interfaces & types
```

---

## 🌐 Main Routes

- `/` - **Dashboard Overview** (Key financial metrics, customer stats, recent activity & charts)
- `/customers` - **Customer Directory** (Manage customers, import Excel, download template, export `.xlsx`)
- `/billing` - **Billing Management** (Generate monthly bills, record payments with paid/due/advance breakdown, print/download invoices)
- `/expenses` - **Expense Management** (Record and monitor operational expenses by category)
- `/reports` - **Financial Reporting** (Income, Expense, Net Profit, and Due reports with CSV export)
- `/settings` - **Settings** (Customize company details, contact info, logo, currency, and invoice prefix)
- `/admins` - **Admin Control** (Grant or revoke admin access)

---

## 🗄️ Database Models

The app uses MongoDB via Mongoose. Core models defined under `lib/database/models/`:

- **Customer**: Stores customer profile, connection dates, package, monthly fee, router info, IP address, and soft-delete status (`isDeleted`).
- **Bill**: Stores monthly bill records tied to a customer with unique `(customer, month, year)` indexing, tracking `amount`, `paidAmount`, `dueAmount`, `advanceAmount`, payment status, payment date, method, remarks, and `invoiceNumber`.
- **Expense**: Tracks operational expenses with category, date, and description.
- **Setting**: Holds global business metadata, logo URL, contact info, currency, and invoice prefix configuration.
- **Admin**: Contains authorized emails for ERP access control.

---

## 📄 License

This project is licensed under the MIT License.

