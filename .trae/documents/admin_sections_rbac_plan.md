# Administration Sections Super-Admin-Only Lockdown — Implementation Plan

## Repository Research

### Target: Three sections must be `super_admin` exclusive (read + write)

1. **Manage Admins** (`/admins`)
   - Backend (admin.actions.ts): ✅ Already uses `requireSuperAdmin()` for `getAllAdmins`, `addAdmin`, `updateAdminRoleAndPermissions`, `removeAdmin`.
   - Route page (`/admins/page.tsx`): ❌ NO server-side redirect guard (calls `getAllAdmins()` which throws, but should redirect to `/access-denied` for UX).
   - Client (`AdminsClient.tsx`): ❌ Renders unconditionally; no `isSuperAdmin` gate.
   - Sidebar (AdminSidebar.tsx): Uses `canRead("admins")` — this already works because only super_admin passes, BUT any future admin record with `admins: read` effective perms would leak it. Need explicit super_admin-only gate.

2. **Activity Logs** (`/activity-logs`) — **BIGGEST GAP**
   - Backend (activityLog.actions.ts): ❌ Uses `requirePermission("activity_logs", "read")` — `engineer` role has `activity_logs: read` DEFAULT, so engineers can READ activity logs today. Must swap to `requireSuperAdmin()`.
   - Route page (`/activity-logs/page.tsx`): ❌ No redirect guard.
   - Client (`ActivityLogsClient.tsx`): ❌ No super_admin gate.
   - Sidebar: ❌ Uses `canRead("activity_logs")` — engineer would see it.
   - Default role perms: `rbac-utils.ts` line 39: `engineer.activity_logs: "read"` → must be `"none"`.

3. **Settings** (`/settings`)
   - Backend: No server actions currently (client is static cards linking to `/catalog` and `/admins`).
   - Route page (`/settings/page.tsx`): ❌ No redirect guard.
   - Client (`SettingsClient.tsx`): ❌ No super_admin gate. Has a link to `/admins` (so it would leak the existence of admin page even if link is broken by other gates).
   - Sidebar: ❌ Uses `canRead("settings")` module check. Needs explicit super_admin-only.

### Existing helpers
- `requireSuperAdmin()` in `auth-guard.ts` — returns profile or throws. ✅
- `getCurrentAdminProfile()` in same file — returns profile or null. ✅ Safe for route redirects.
- PermissionContext exposes `isSuperAdmin`. ✅
- Sidebar supports `granular?: GranularPermissionKey` AND already checks `isSuperAdmin`. We'll add explicit role gating for the three admin-section sidebar items (not relying on module checks, since module-level perms for `engineer: activity_logs: read` still exist and can leak).

## Files and Modules

### RBAC defaults
- `lib/rbac-utils.ts`: Set `engineer.activity_logs` from `"read"` → `"none"`. (Defense in depth — even if we missed a `requirePermission` call, the default is blocked.)

### Server actions
- `lib/actions/activityLog.actions.ts`: Swap both `requirePermission("activity_logs", "read")` → `requireSuperAdmin()`.

### Route-page redirect guards (server layer redirect, not just throw on action)
- `app/(root)/admins/page.tsx`: Import `getCurrentAdminProfile` and redirect `/sign-in` or `/access-denied` if not super_admin.
- `app/(root)/activity-logs/page.tsx`: Same redirect pattern.
- `app/(root)/settings/page.tsx`: Same redirect pattern. (Mark `dynamic = "force-dynamic"` too since it currently isn't.)

### Sidebar (AdminSidebar.tsx)
- `app/(root)/components/AdminSidebar.tsx`: Add explicit role gating for the three items. Simplest: add a new optional `superAdminOnly?: boolean` to SidebarItem. Filter with `if (item.superAdminOnly && !isSuperAdmin) return false` in the existing filter block. (Current `granular` field won't cleanly map to "super_admin only".) Apply to: Manage Admins, Activity Logs, Settings.

### Client components (UI layer — render nothing / show "Access Denied" if non-super_admin somehow reaches the page)
- `app/(root)/admins/components/AdminsClient.tsx`: At top, destructure `isSuperAdmin` from `usePermissions()`. If `!isSuperAdmin`, render a minimal "Insufficient permissions" placeholder (never render form/table). Also disable `loadAdmins` effect unless super_admin.
- `app/(root)/activity-logs/components/ActivityLogsClient.tsx`: Same — gate with `isSuperAdmin`, show placeholder, skip data fetches.
- `app/(root)/settings/components/SettingsClient.tsx`: Same — gate with `isSuperAdmin`.

## Implementation Steps (dependency order)

1. **Defaults (rbac-utils.ts)** — flip `engineer.activity_logs` to `"none"`. (Defense in depth.)
2. **Activity Log backend actions** (activityLog.actions.ts) — `getActivityLogs` and `getAllLogsForExport` use `requireSuperAdmin()` instead of `requirePermission("activity_logs", "read")`.
3. **Route redirect guards** (3 page files):
   - `/admins/page.tsx`
   - `/activity-logs/page.tsx`
   - `/settings/page.tsx` (also add `export const dynamic = "force-dynamic"`; needed for redirect since page is currently static default export).
4. **AdminSidebar** — add `superAdminOnly` flag + filter logic; apply the flag to Admins, Activity Logs, Settings items.
5. **AdminsClient.tsx** — `isSuperAdmin` gate. Guard the effect and the render output.
6. **ActivityLogsClient.tsx** — `isSuperAdmin` gate. Guard fetches (`loadLogs`, Excel export), filters, pagination, render.
7. **SettingsClient.tsx** — `isSuperAdmin` gate on entire JSX return.

## Dependencies and Considerations
- Existing `getCurrentAdminProfile()` is safe — returns `null` for unauthenticated, returns the admin including `.role`. We redirect to `/sign-in` if null, `/access-denied` if role `!== "super_admin"`.
- Settings page is currently a `default function SettingsPage` without `dynamic = "force-dynamic"` — redirect via `redirect()` in an RSC requires `force-dynamic` (can't statically prerender a redirect). Add `export const dynamic = "force-dynamic"`.
- AdminsClient already has a `usePermissions` import — minimal change. ActivityLogsClient + SettingsClient need the import added.
- No new server actions file needed for settings — redirect guard + client gate is enough since the page is static info cards.
- `requirePermission` auto-passes for `super_admin`; we don't need to change Admins backend because it already uses stricter `requireSuperAdmin()`.

## Validation
1. `npx tsc --noEmit` — must pass (0 errors).
2. `npm run lint` — must pass (0 warnings, 0 errors).
3. Code review checklist (by file):
   - `activityLog.actions.ts`: No `requirePermission("activity_logs", …)` remaining.
   - `rbac-utils.ts`: `engineer.activity_logs === "none"`.
   - 3 route pages: `getCurrentAdminProfile()` + redirect pattern exists.
   - AdminSidebar: 3 items marked `superAdminOnly`.
   - 3 client components: `isSuperAdmin` gate before rendering sensitive UI.

## Risks
- **Risk**: Settings page not marked `force-dynamic` → `redirect()` silently fails / wrong behavior on static-exported Next. Handling: explicitly add `export const dynamic = "force-dynamic"`.
- **Risk**: Notification/billing modules might show ActivityLogs or Admins counts somewhere else. Handling: out of scope — this plan covers the explicit three sections and their direct action endpoints / sidebar items. If additional surfaces are found later, they can be patched.
- **Risk**: Adding `superAdminOnly` to sidebar without also updating the item type `SidebarItem`. Handling: update the `SidebarItem` interface in AdminSidebar.tsx (single-file local interface).
