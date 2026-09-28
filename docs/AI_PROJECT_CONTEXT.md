# AI Project Context — GESN Device Management System

> **Purpose**: Persistent project context for AI assistants. This file captures the architecture, conventions, and key decisions of the DMS codebase so that any AI agent can onboard quickly without re-auditing the entire repo.

---

## 1. Project Overview

**GESN Device Management System (DMS)** is a Next.js 15 (App Router) application for managing ISP network hardware — Access Points, Routers, Switches, Antennas, and Servers — along with customers, billing, and staff administration.

| Layer        | Stack                                                     |
| ------------ | --------------------------------------------------------- |
| Framework    | Next.js 15 (App Router, Server Actions, React 19)        |
| Language     | TypeScript 5                                              |
| Database     | MongoDB via Mongoose 8                                    |
| Auth         | Clerk (`@clerk/nextjs`)                                   |
| UI           | shadcn/ui, Radix primitives, Tailwind CSS 4, Lucide icons |
| Toasts       | `react-hot-toast`                                         |
| State        | React Context (`PermissionContext`) + Server Components   |

---

## 2. Directory Structure

```
app/
  (root)/                    # Authenticated layout group
    admins/                  # Admin / Staff management
      components/AdminsClient.tsx
    devices/                 # Device listing & details
      [type]/page.tsx        # Dynamic device-type pages
    customers/, billing/, catalog/, settings/, activity-logs/
  sign-in/, sign-up/         # Clerk auth pages
components/
  devices/                   # Device UI components
    DeviceFormDialog.tsx      # Create / Edit device modal
    DeviceTable.tsx           # Desktop table view
    DeviceMobileCards.tsx     # Mobile card view
    DeviceDetailsView.tsx     # Single device detail view
    DeviceFilters.tsx         # Filters, search, status tabs
    RejectDeviceDialog.tsx    # Rejection reason modal
  layout/                    # App shell (Sidebar, Navbar, NotificationDropdown)
  providers/
    PermissionContext.tsx     # Client-side RBAC context
  ui/                        # shadcn/ui primitives
lib/
  actions/                   # Server Actions ("use server")
    device.actions.ts         # CRUD + approve/reject + bulk import
    admin.actions.ts          # Admin CRUD + role/permission updates
    notification.actions.ts   # Notification read/fetch
    customer.actions.ts, billing.actions.ts, catalog.actions.ts, …
  database/
    index.ts                 # MongoDB connection singleton
    models/                  # Mongoose schemas
      device.model.ts, admin.model.ts, activityLog.model.ts, notification.model.ts, …
  auth-guard.ts              # Permission enforcement helpers (server-side)
  rbac-utils.ts              # Role defaults, granular permissions, resolvers
  constants.ts               # Status enums, styling maps
  utils.ts                   # Shared utilities (formatSL, normalizeMAC, …)
types/
  index.ts                   # All shared TypeScript interfaces & types
docs/
  APP_DOCUMENTATION.md       # Full app documentation
  DMS_DEVICE_ROLE_UPDATE_CHECKLIST.md
  AI_PROJECT_CONTEXT.md      # ← This file
```

---

## 3. Roles & Permissions Architecture

### 3.1 Roles (`AdminRole`)

```
super_admin → engineer → admin → editor → moderator → viewer → custom
```

| Role          | Summary                                                    |
| ------------- | ---------------------------------------------------------- |
| `super_admin` | Full immutable access; exclusively manages users, roles, permissions, and settings |
| `engineer`   | Full operational access and device approval; no user, role, permission, or critical-settings control |
| `admin`       | No automatic access; Super Admin configures sections and actions per account |
| `editor`      | Adds devices, manages billing, and can freeze or archive devices |
| `moderator`   | Adds devices and manages billing; no archive/freeze unless explicitly granted |
| `viewer`      | Super Admin-configured, strictly read-only section access  |
| `custom`      | Fully configurable by Super Admin                          |

### 3.2 Module Permissions (`ModulePermissions`)

Each role has a default `Record<AppModule, PermissionLevel>` where `PermissionLevel = "none" | "read" | "write"`. Modules: `dashboard`, `devices`, `customers`, `billing`, `catalog`, `admins`, `activity_logs`, `settings`.

Defined in: `lib/rbac-utils.ts → DEFAULT_ROLE_PERMISSIONS`

### 3.3 Granular Permissions (`GranularPermissionKey`)

Fine-grained boolean flags overlaid on module permissions. Keys:

```
device_add, device_view, device_edit, device_delete, device_approve, device_archive,
server_view, server_manage, customer_view, user_manage, report_view, setting_manage
```

- Defaults per role: `lib/rbac-utils.ts → DEFAULT_GRANULAR_PERMISSIONS`
- Resolver: `resolveEffectiveGranularPermissions(role, customOverrides)`
- **Engineer role always forces `device_approve: true`** (enforced in resolver).
- User, role, and permission administration is always reserved for `super_admin`; Viewer granular actions are always disabled.
- Super Admin overrides are immutable (always all `true`).

### 3.4 Permission Enforcement

| Layer    | Mechanism                                                      | File                                 |
| -------- | -------------------------------------------------------------- | ------------------------------------ |
| Backend  | `requirePermission(module, level)` — module-level guard        | `lib/auth-guard.ts`                  |
| Backend  | `requireGranularPermission(key)` — granular guard              | `lib/auth-guard.ts`                  |
| Frontend | `usePermissions()` hook → `can()`, `canApproveDevice`, etc.    | `components/providers/PermissionContext.tsx` |

---

## 4. Device Submission & Approval Flow

### 4.1 Submission

1. Any authorized user calls `createDevice(data)`.
2. Backend validates MAC, type-specific required fields, and IP format.
3. **Non-super-admins**: status forced to `"Pending"`, `submittedBy` recorded.
4. **Super Admins**: can set status directly (defaults to `"Active"`).
5. On `Pending` submission, a `Notification` is created targeting Super Admin + Engineer.

### 4.2 Required Fields by Device Type (Backend Enforced)

| Type         | Required Fields                                                          |
| ------------ | ------------------------------------------------------------------------ |
| Access Point | MAC, AP Number, Connected Server, Customer Name, Mobile, GPS Link, Desc |
| Router       | MAC, Connected Server, Customer Name, Mobile, GPS Link, Description      |
| Switch       | MAC, Connected Server, GPS Link / Location, Description                  |
| Antenna      | MAC, Connected Server, Location / GPS Link, Description                  |

### 4.3 Approval / Rejection

- `approveDevice(id)`: Sets status to `"Active"`, records `approvedBy`, clears rejection.
- `rejectDevice(id, reason)`: Sets status to `"Rejected"`, records `rejectedBy` + `rejectionReason`.
- Both are **idempotent** (no error if already in target state).
- Authorized for: `super_admin`, `engineer`, or anyone with `device_approve` granular permission.

### 4.4 Device Statuses

```
"Pending" | "Active" | "Available" | "Offline" | "Maintenance" | "Inactive" | "Retired" | "Rejected"
```

---

## 5. Database Schemas — Key Fields

### Device (`lib/database/models/device.model.ts`)

Notable fields beyond basic device data:
- `submittedBy: { email, name, role, userId, date }` — who submitted the device
- `approvedBy: { email, name, role, userId, date }` — who approved
- `rejectedBy: { email, name, role, userId, date, reason }` — who rejected
- `rejectionReason: String` — top-level rejection reason

### Admin (`lib/database/models/admin.model.ts`)

- `role: AdminRole` — enum includes `engineer`
- `permissions: Map<String, String>` — module-level overrides
- `granularPermissions: Map<String, Boolean>` — granular overrides

---

## 6. UI Component Patterns

### DeviceFormDialog

- Renders as a `Dialog` or `Sheet` depending on mode (create vs edit).
- **Main form**: type-specific required fields only.
- **"More (Optional)"**: collapsible section with Brand, Model, IP, Uplink Switch, etc.
- Collapsed by default; toggling preserves field data.
- Status selector filtered: non-super-admins cannot select `"Active"` directly.

### DeviceTable / DeviceMobileCards

- Approve button (✓ green) shown when `device.status === "Pending" && canApproveDevice`.
- Reject button opens `RejectDeviceDialog` (reason input).
- "Submitted by you" badge shown when `submittedBy.email === admin.email`.
- "My Submissions" filter in `DeviceFilters.tsx`.

### DeviceDetailsView

- Full submission/approval/rejection audit trail section.
- Approve and Reject action buttons for authorized users.

### AdminsClient

- Role selector includes `engineer` with Terminal icon.
- Granular permissions accordion for configuring per-user overrides.
- Super Admin permissions are read-only / immutable in the UI.

### NotificationDropdown

- Accessible to `super_admin` and `engineer` roles.
- Shows device submission notifications with action links.
- Bell badge with unread count; refreshes on tab visibility change.

---

## 7. Conventions & Patterns

1. **Server Actions**: All data mutations are `"use server"` functions in `lib/actions/`.
2. **Auth**: Always call `getCurrentAdminProfile()` or `requirePermission()` at the top of server actions.
3. **Activity Logging**: Use `logActivityAndNotify()` which creates an `ActivityLog` AND a `Notification` (if actor is not super_admin).
4. **Revalidation**: After mutations, call `revalidatePath()` for affected routes.
5. **MAC normalization**: Always use `normalizeMAC()` before storing.
6. **SL generation**: Auto-incrementing via `Counter` model (`getNextSL()`).
7. **Toasts**: Use `react-hot-toast` for user feedback on actions.
8. **Styling**: Tailwind CSS 4 with shadcn/ui components. Status-specific colors in `lib/constants.ts → STATUS_STYLES`.

---

## 8. Key Files Quick Reference

| What                          | Where                                                    |
| ----------------------------- | -------------------------------------------------------- |
| All TypeScript types          | `types/index.ts`                                         |
| Role defaults & permissions   | `lib/rbac-utils.ts`                                      |
| Server-side auth guards       | `lib/auth-guard.ts`                                      |
| Client-side permission hook   | `components/providers/PermissionContext.tsx`              |
| Device CRUD + approve/reject  | `lib/actions/device.actions.ts`                          |
| Admin CRUD + role updates     | `lib/actions/admin.actions.ts`                           |
| Notification fetch/read       | `lib/actions/notification.actions.ts`                    |
| Device form (create/edit)     | `components/devices/DeviceFormDialog.tsx`                |
| Device table (desktop)        | `components/devices/DeviceTable.tsx`                     |
| Device cards (mobile)         | `components/devices/DeviceMobileCards.tsx`                |
| Device detail view            | `components/devices/DeviceDetailsView.tsx`               |
| Rejection dialog              | `components/devices/RejectDeviceDialog.tsx`              |
| Device filters + search       | `components/devices/DeviceFilters.tsx`                   |
| Admin management              | `app/(root)/admins/components/AdminsClient.tsx`          |
| Notification dropdown         | `components/layout/NotificationDropdown.tsx`             |
| Mongoose device schema        | `lib/database/models/device.model.ts`                    |
| Mongoose admin schema         | `lib/database/models/admin.model.ts`                     |
| Pending devices page          | `app/(root)/devices/pending/page.tsx`                    |
| Pending devices client UI     | `app/(root)/devices/pending/PendingDevicesClient.tsx`     |
| Status enums & styling        | `lib/constants.ts`                                       |

---

## 9. Layout & Auth Wiring

The authenticated layout chain in `app/(root)/layout.tsx`:

```
Clerk auth → getCurrentAdminProfile() → redirect if null → PermissionProvider(admin) → SidebarProvider → AdminSidebar + Header + children
```

- `export const dynamic = "force-dynamic"` ensures fresh auth on every request.
- `PermissionProvider` wraps the entire authenticated shell, so all child components can call `usePermissions()`.
- Unauthenticated users → `/sign-in`. Authenticated but not in Admin DB → `/access-denied`.

---

## 10. Bulk Import (`importDevicesBulk`)

Located at: `lib/actions/device.actions.ts:1040`

```ts
importDevicesBulk(rows: Record<string, unknown>[], defaultDeviceType?: string)
```

- Accepts parsed Excel/CSV rows (column headers like `"Device Type"`, `"MAC Address"`, `"IP Address"`, etc.).
- Pre-fetches all servers, switches, and existing devices for O(1) duplicate detection.
- Per-row: validates type, MAC, resolves server/switch by name or SL, skips duplicates.
- Returns `{ created: number, skipped: number, errors: string[] }`.
- Fires `"bulk-import-complete"` custom event for `NotificationDropdown` to refresh.
- Non-super-admins' imports are set to `"Pending"` status.

---

## 11. Customer, Billing & Catalog Actions

### Customer (`lib/actions/customer.actions.ts`)
`getCustomers`, `getCustomerById`, `createCustomer`, `updateCustomer`, `updateCustomerStatus`, `deleteCustomer`, `searchActiveCustomers`, `getAllCustomersForExport`, `importCustomersBulk`

### Billing (`lib/actions/billing.actions.ts`)
`getBillings`, `getCustomerBillingHistory`, `generateMonthlyBills`, `updatePayment`, `updateBillingStatus`, `deleteBilling`, `getAllBillingsForExport`

- `generateMonthlyBills(targetMonth?)` auto-creates billing records for all active customers for the target month.

### Catalog (`lib/actions/catalog.actions.ts`)
`seedDefaultCatalog`, `getDeviceTypes`, `createDeviceType`, `updateDeviceType`, `deleteDeviceType`, `getBrands`, `createBrand`, `updateBrand`, `deleteBrand`, `getModels`, `createModel`, `updateModel`, `deleteModel`

- `seedDefaultCatalog()` initializes default device types (Access Point, Router, Switch, Antenna, Server) and common brands.
- All catalog items are soft-deletable via `isActive` flag.

---

## 12. Device Actions — Full API Surface

| Function                  | Auth                          | Description                                    |
| ------------------------- | ----------------------------- | ---------------------------------------------- |
| `getAvailableSwitches()`  | `devices:read`                | Active switches with port availability         |
| `getAvailableServers()`   | `devices:read`                | Active servers for form dropdowns              |
| `getDevices(params?)`     | `devices:read`                | Paginated list with filters, search, sort      |
| `getDeviceById(id)`       | `devices:read`                | Single device with populated refs              |
| `createDevice(data)`      | `devices:write`               | Create + type validation + submittedBy         |
| `updateDevice(id, data)`  | `devices:write`               | Update fields, re-validate MAC/IP              |
| `approveDevice(id)`       | `device_approve` granular     | Pending → Active, idempotent                   |
| `rejectDevice(id, reason)`| `device_approve` granular     | Pending → Rejected, idempotent                 |
| `updateDeviceStatus(id, status)` | `devices:write`        | General status change (approval-gated for Active/Rejected) |
| `toggleDeviceActive(id)`  | `devices:write`               | Toggle Active ↔ Inactive                       |
| `deleteDevice(id)`        | `device_delete` granular      | Hard delete (blocks if has connected children) |
| `searchGlobalDevices(q)`  | `devices:read`                | Global search across all types                 |
| `getDeviceFilterOptions(type?)` | `devices:read`           | Distinct brands/models for filter dropdowns    |
| `getAllDevicesForExport()` | `devices:read`                | Full dataset for Excel/CSV export              |
| `getPendingDevices(params?)` | `devices:read`             | Pending devices with pagination and type counts |
| `getPendingDevicesCount()` | `none` (internal/fast)         | Total pending count for badges & alerts        |
| `importDevicesBulk(rows)` | `devices:write`               | Batch import from parsed spreadsheet           |

---

## 13. RejectDeviceDialog Component

**File**: `components/devices/RejectDeviceDialog.tsx`

```ts
interface RejectDeviceDialogProps {
  device: IDevice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}
```

- Renders a modal with a required `Textarea` for rejection reason.
- Calls `rejectDevice(device._id, reason)` on submit.
- Shows toast on success/error. Clears reason on close.
- Used in: `DeviceTable`, `DeviceMobileCards`, `DeviceDetailsView`.

---

## 14. Environment Variables

| Variable                                   | Purpose                        |
| ------------------------------------------ | ------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`        | Clerk frontend auth            |
| `CLERK_SECRET_KEY`                         | Clerk server-side auth         |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`            | `/sign-in`                     |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`            | `/sign-up`                     |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`      | `/dashboard`                   |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`      | `/dashboard`                   |
| `MONGODB_URI`                              | MongoDB Atlas connection string |

---

*Last updated: 2026-09-27*
