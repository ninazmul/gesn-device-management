# ISP ERP Application Documentation

## Overview

ISP ERP is a web application for managing the core operations of an internet service provider. It helps an ISP team manage customers, generate monthly bills, record payments, track expenses, review financial reports, configure invoice details, and manage admin access.

The application is built with Next.js App Router, React, TypeScript, Clerk authentication, MongoDB, and Mongoose. Most business operations are implemented as Next.js server actions under `lib/actions`.

## What The App Does

The app covers these main business areas:

- Admin authentication and authorization
- Customer database management
- Monthly invoice and bill generation
- Payment status tracking
- Invoice download and print support
- Expense tracking
- Dashboard metrics and charts
- Income, expense, profit, and due reports
- Company settings for invoice identity
- Admin user management

## User Roles And Access

The app uses Clerk for user authentication and a local MongoDB `Admin` collection for authorization.

Authentication answers: "Who is signed in?"

Authorization answers: "Is this signed-in user allowed to use the ERP?"

The protected app lives under the `(root)` route group. The root layout checks:

1. Whether the user is signed in with Clerk.
2. Whether the signed-in user's primary email exists in the `Admin` collection.
3. If there are no admins yet, the first signed-in user is automatically saved as the first admin.

If a user is not signed in, they are redirected to `/sign-in`.

If a signed-in user is not an admin, they are redirected to `/access-denied`.

## Main Routes

### `/`

Dashboard page.

Shows:

- Total customers
- Active customers
- Inactive customers
- Disconnected customers
- Current month collection
- Current month due
- Current month expenses
- Current month profit
- Monthly income chart
- Monthly expenses chart
- Recent payments
- Recent expenses

Main files:

- `app/(root)/page.tsx`
- `app/(root)/components/DashboardClient.tsx`
- `lib/actions/dashboard.actions.ts`

### `/customers`

Customer management page.

Allows admins to:

- View customers
- Search customers
- Filter customers by status
- Add a customer
- Edit a customer
- Soft-delete a customer
- Download Excel template, import bulk customer records, and export customer data

Customer fields include:

- Customer code
- Name
- Phone
- Email
- Location
- Package name
- Monthly fee
- Connection date
- Router
- IP address
- Status
- Notes

Main files:

- `app/(root)/customers/page.tsx`
- `app/(root)/customers/components/CustomersClient.tsx`
- `app/(root)/customers/components/CustomerForm.tsx`
- `lib/actions/customer.actions.ts`
- `lib/database/models/customer.model.ts`

### `/billing`

Billing and invoice management page.

Allows admins to:

- View bills
- Search bills
- Filter by month, year, and status
- Generate monthly bills
- Mark an unpaid bill as paid
- Download an invoice PDF
- Print an invoice

Monthly bill generation works by finding active customers and creating one bill per customer for the selected month and year. Existing bills for the same customer, month, and year are skipped.

Bill status can be:

- `Unpaid`
- `Paid`

Main files:

- `app/(root)/billing/page.tsx`
- `app/(root)/billing/components/BillingClient.tsx`
- `app/(root)/billing/components/GenerateBillsForm.tsx`
- `app/(root)/billing/components/MarkPaidForm.tsx`
- `app/(root)/components/InvoiceDownloader.tsx`
- `app/(root)/components/InvoiceTemplate.tsx`
- `lib/actions/bill.actions.ts`
- `lib/database/models/bill.model.ts`

### `/expenses`

Expense management page.

Allows admins to:

- View expenses
- Search expenses
- Filter by category, month, and year
- Add an expense
- Edit an expense
- Delete an expense

Expense categories:

- Bandwidth
- Electricity
- Salary
- Maintenance
- Equipment
- Rent
- Transport
- Miscellaneous

Main files:

- `app/(root)/expenses/page.tsx`
- `app/(root)/expenses/components/ExpensesClient.tsx`
- `app/(root)/expenses/components/ExpenseForm.tsx`
- `lib/actions/expense.actions.ts`
- `lib/database/models/expense.model.ts`

### `/reports`

Financial reports page.

Shows:

- Income report
- Expense report
- Profit report
- Due report

Reports can be filtered by month and year. Income, expense, and due data can be exported as CSV.

Main files:

- `app/(root)/reports/page.tsx`
- `lib/actions/bill.actions.ts`
- `lib/actions/expense.actions.ts`

### `/settings`

Company and invoice settings page.

Allows admins to configure:

- Company name
- Logo URL
- Phone
- Email
- Address
- Invoice prefix
- Currency

The billing module uses the invoice prefix when generating invoice numbers.

Main files:

- `app/(root)/settings/page.tsx`
- `app/(root)/settings/components/SettingsClient.tsx`
- `lib/actions/setting.actions.ts`
- `lib/database/models/setting.model.ts`

### `/admins`

Admin management page.

Allows existing admins to:

- View admin users
- Add another admin by email
- Remove an admin

An admin cannot remove their own admin record.

Main files:

- `app/(root)/admins/page.tsx`
- `app/(root)/admins/components/AdminsClient.tsx`
- `lib/actions/admin.actions.ts`
- `lib/database/models/admin.model.ts`

### `/sign-in` and `/sign-up`

Authentication pages powered by Clerk.

Main files:

- `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx`

### `/access-denied`

Shown when a signed-in user does not have admin access.

Main file:

- `app/access-denied/page.tsx`

## How The App Works

### Request Flow

1. A user opens the app.
2. Clerk middleware and protected route logic verify authentication.
3. The `(root)` layout checks admin authorization.
4. Server pages load initial data by calling server actions.
5. Client components render tables, forms, filters, buttons, and charts.
6. User actions call server actions for database writes.
7. Server actions connect to MongoDB, read or update data, and revalidate affected routes.
8. Client components refresh local state by calling the related load function again.

### Server Actions

Server actions are stored in `lib/actions`.

They are responsible for:

- Connecting to MongoDB
- Validating authorization where needed
- Creating, reading, updating, and deleting records
- Revalidating pages after writes
- Returning serialized data to client components

Action files:

- `admin.actions.ts`
- `bill.actions.ts`
- `customer.actions.ts`
- `dashboard.actions.ts`
- `expense.actions.ts`
- `setting.actions.ts`
- `index.ts`

### Database Connection

The MongoDB connection is defined in `lib/database/index.ts`.

It reads `MONGODB_URI` from environment variables and connects using Mongoose. The connection is cached on the global object so repeated server action calls can reuse the same connection during the server process lifetime.

The app uses the MongoDB database name:

```text
gesn-device-management
```

### Authentication And Authorization

Clerk handles sign-in, sign-up, sessions, and current user lookup.

The local `Admin` model stores the emails of users allowed into the ERP.

Important behavior:

- `checkIsAdmin()` checks the signed-in Clerk user's primary email.
- If no admins exist, the current signed-in user becomes the first admin.
- `addAdmin()`, `removeAdmin()`, and `getAllAdmins()` require the current user to already be an admin.

### Dynamic Rendering

The protected root layout uses Clerk auth and request cookies, so the route segment is marked as dynamic:

```ts
export const dynamic = "force-dynamic";
```

This prevents Next.js from trying to prerender authenticated pages statically.

## Data Models

### Admin

Stores emails allowed to access the ERP.

Fields:

- `email`
- `createdAt`
- `updatedAt`

### Customer

Stores ISP customer details.

Fields:

- `customerCode`
- `name`
- `phone`
- `email`
- `location`
- `packageName`
- `monthlyFee`
- `connectionDate`
- `router`
- `ipAddress`
- `status`
- `notes`
- `isDeleted`
- `createdAt`
- `updatedAt`

Customer status values:

- `Active`
- `Inactive`
- `Disconnected`

Customers are soft-deleted by setting `isDeleted` to `true`.

### Bill

Stores monthly customer bills.

Fields:

- `customer`
- `month`
- `year`
- `amount`
- `paidAmount`
- `dueAmount`
- `advanceAmount`
- `status`
- `paymentDate`
- `paymentMethod`
- `remarks`
- `invoiceNumber`
- `createdAt`
- `updatedAt`

Bill status values:

- `Paid`
- `Unpaid`

The schema has a unique index on:

```text
customer + month + year
```

This prevents duplicate monthly bills for the same customer.

### Expense

Stores business expenses.

Fields:

- `title`
- `category`
- `amount`
- `expenseDate`
- `description`
- `createdAt`
- `updatedAt`

### Setting

Stores company and invoice settings.

Fields:

- `companyName`
- `logo`
- `phone`
- `email`
- `address`
- `invoicePrefix`
- `currency`
- `createdAt`
- `updatedAt`

If no settings document exists, the app creates one with default values.

## Core Business Workflows

### First Admin Setup

1. Configure Clerk and MongoDB.
2. Start the app.
3. Sign in with Clerk.
4. If the `Admin` collection is empty, the signed-in user's primary email is inserted as the first admin.
5. That user can then open `/admins` and add more admin emails.

### Add A Customer

1. Open `/customers`.
2. Click `Add Customer`.
3. Fill in customer details.
4. Submit the form.
5. The server creates a customer code like `CUST001`, `CUST002`, and so on.
6. The customer appears in the customer table.

### Generate Monthly Bills

1. Open `/billing`.
2. Click `Generate Monthly Bills`.
3. Select month and year.
4. The server finds active customers.
5. For each active customer, the app checks whether a bill already exists for that month and year.
6. If no bill exists, the app creates a new unpaid bill using the customer's monthly fee.
7. Existing bills are skipped.
8. The UI shows how many bills were generated and skipped.

### Mark A Bill As Paid

1. Open `/billing`.
2. Find an unpaid bill.
3. Click `Mark Paid`.
4. Enter payment date, method, and optional remarks.
5. The bill status becomes `Paid`.
6. Payment date and method are saved.

### Download Or Print An Invoice

1. Open `/billing`.
2. Use the download or print button beside a bill.
3. The app renders a hidden invoice template.
4. Download uses `html2canvas` to capture the invoice and `jsPDF` to generate a PDF.
5. Print opens a print window containing the invoice markup and current styles.

### Record An Expense

1. Open `/expenses`.
2. Click `Add Expense`.
3. Enter title, category, amount, date, and optional description.
4. Submit the form.
5. The expense is stored in MongoDB and appears in reports and dashboard totals.

### Review Reports

1. Open `/reports`.
2. Select month and year.
3. Review income, expenses, profit, or due tabs.
4. Export report tables as CSV where available.

## Environment Variables

Create `.env.local` in the project root.

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
MONGODB_URI=
```

Only variable names are documented here. Do not commit real secrets.

## Installation

Install packages:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production app:

```bash
npm run build
```

Start production server:

```bash
npm run start
```

Run TypeScript check:

```bash
npx tsc --noEmit
```

## Folder Structure

```text
app/
  (auth)/
    sign-in/
    sign-up/
  (root)/
    admins/
    billing/
    components/
    customers/
    expenses/
    reports/
    settings/
  access-denied/
components/
  shared/
  ui/
hooks/
lib/
  actions/
  database/
    models/
types/
```

## UI Structure

The app uses a protected dashboard layout with:

- Sidebar navigation
- Top bar
- Clerk user button
- Toast notifications
- Page-specific tables and forms

The sidebar sections are:

- Overview
- Management
- Admin
- Settings

UI primitives live under `components/ui`. These are reusable components such as buttons, cards, dialogs, forms, inputs, selects, tables, tabs, textarea, sidebar, and tooltips.

## Validation And Feedback

Forms use React Hook Form, and admin email creation uses Zod validation.

User feedback is shown with `react-hot-toast` for success and error states.

## Known Operational Notes

- Authenticated pages must render dynamically because they use Clerk request data and cookies.
- `npm run build` needs a valid environment configuration.
- Pages that load database-backed data require `MONGODB_URI` to be reachable.
- Customer deletion is soft delete.
- Expense deletion is permanent.
- Invoice generation happens in the browser because it captures rendered HTML.

## Suggested Future Improvements

- Add pagination controls to customers, bills, and expenses.
- Add stronger form schemas for all create and update operations.
- Add role levels beyond basic admin access.
- Add audit logs for billing, payment, and admin changes.
- Add automated tests for server actions.
- Add metadata `metadataBase` in `app/layout.tsx` for production social images.
