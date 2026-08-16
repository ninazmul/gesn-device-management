# Location & Package Management Plan

## Goal
Add **Location** and **Package** management options in the Settings page (mirroring the Category management UI pattern), then expose them as dropdown selects in the Customer form. The Package should also carry a `monthlyFee` value that auto-fills when selected in the customer form.

## Repo Research Conclusion

### Existing Pattern (Category) to Reuse
- **Model:** `lib/database/models/category.model.ts` — simple Mongoose schema with `name`, `type` (enum), `isDefault`, timestamps
- **Server Actions:** `lib/actions/category.actions.ts` — `"use server"` module with `getCategories(type)`, `createCategory(name, type)`, `deleteCategory(id)`. Delete includes: existence check, in-use check against Expense/Income, and `revalidatePath` calls.
- **UI:** `app/(root)/settings/components/SettingsClient.tsx` — `CategoryTab({ type })` component inside a `<Tabs>` component. Has: (1) input + Add button, (2) pill-tag list with inline Trash delete button + confirm() dialog + toast feedback.
- **Consumer:** `app/(root)/expenses/components/ExpenseForm.tsx` — fetches categories in `useEffect`, renders `<Select>` dropdown, and has "Add new category" inline helper.

### Current Customer State
- **Model:** `customer.model.ts` uses `packageName: String (required)` and `monthlyFee: Number (required)` as plain fields (no `location` field yet). Also has `address: String` (free-text).
- **Form:** `CustomerForm.tsx` renders `packageName` and `address` as plain `<Input>`, `monthlyFee` as numeric `<Input>`. No selects for package or location.
- **Actions:** `customer.actions.ts` creates/updates customers with these plain string fields (no ref lookups).

### Data Model Decision: Keep string-denormalized
Like `Expense.category`/`Income.category` (which store the **category name as a string**, not an ObjectId), both `Package` and `Location` will be stored in the Customer record by **name** (string). This avoids breaking the existing billing (which reads `monthlyFee` directly from the customer) and follows the same "soft taxonomy" pattern already used for categories. The Package model will additionally store a `monthlyFee: number` as a *suggested default* when that package is selected in the form.

---

## Files and Modules to Edit

### A. New Files (3)
1. `lib/database/models/package.model.ts` — Package schema
2. `lib/database/models/location.model.ts` — Location schema
3. `lib/actions/package.actions.ts` — `getPackages`, `createPackage`, `deletePackage`, `updatePackage` (create/update support monthly fee)
4. `lib/actions/location.actions.ts` — `getLocations`, `createLocation`, `deleteLocation`

### B. Edited Files (9)
1. `lib/actions/index.ts` — export the new `*.actions` modules
2. `app/(root)/settings/components/SettingsClient.tsx`
   - Add two new top-level Cards or extend the existing Tabs to include **Package Management** and **Location Management** sections
   - Add `PackageTab` and `LocationTab` child components (mirrors `CategoryTab`)
   - Package input: name text input + monthly fee number input + Add button
   - Location input: name text input + Add button
   - Delete: confirmation + in-use safety check against Customer records
3. `types/index.ts` — add `Package` and `Location` interface exports
4. `lib/database/models/customer.model.ts` — add optional `location: String` field (indexed). Keep `packageName` and `monthlyFee` (no migration needed).
5. `app/(root)/customers/components/CustomerForm.tsx`
   - Fetch packages and locations on mount (`useEffect` + `useState`)
   - Replace `packageName` `<Input>` with a `<Select>` dropdown (packages), plus inline "Add new package" that collects name + monthly fee in a small form
   - Add new `Location` `<Select>` dropdown before address (optional) with inline "Add new location" helper
   - When a package is selected that has a defined `monthlyFee`, **auto-fill** the `monthlyFee` field (allow manual override)
6. `lib/actions/customer.actions.ts`
   - Accept new optional `location` field in `createCustomer` / `updateCustomer`
   - Update `CustomerDoc` interface and payload spreads
7. `types/index.ts` — add `location?: string` to `Customer` interface
8. `app/(root)/customers/components/CustomersClient.tsx` — if the data table currently shows package/monthly-fee, optionally also show `location` column (if space permits; can be added as optional or skipped if user doesn't want it, but at minimum read it back)

---

## Modification Steps

### Step 1: Database Models
1. **Package schema** (`name: String unique + required`, `monthlyFee: Number required default 0`, timestamps, index on `name`)
2. **Location schema** (`name: String unique + required`, timestamps, index on `name`)

### Step 2: Server Actions
For both modules mirror the `category.actions.ts` pattern:
- `getXxxs()` — connect → find → sort by name asc → lean → JSON clone
- `createXxx(name, …)` — unique check (case-insensitive regex) → throw on conflict → `create()` → revalidate
  - For Package: `createPackage(name, monthlyFee)`
  - For Location: `createLocation(name)`
- `deleteXxx(id)` — find by id; check not in use by `Customer` collection (`countDocuments({ packageName: name })` or `{ location: name }`) → delete → revalidate
  - Revalidate paths: `/customers`, `/settings`, `/billing`

### Step 3: Settings UI (`SettingsClient.tsx`)
Under the existing Category Management card or in separate parallel cards:

**Package Management**
- Inputs: "Package name" (text) + "Monthly Fee (৳)" (number, min 0)
- Add button → calls `createPackage(name, fee)`
- Pill tags display: `{name} — ৳{fee}` + Trash button
- Delete confirmation dialog + toast

**Location Management**
- Input: "Location name" (text)
- Add button → calls `createLocation(name)`
- Pill tags display: `{name}` + Trash button
- Delete confirmation dialog + toast

### Step 4: Customer Form Integration
**Package (required):**
- Replace `packageName` text input with Radix `<Select>` of all package names
- On `useEffect`, load packages via `getPackages()`
- When `onValueChange` fires on package select: look up the chosen package in the packages array; if found and its `monthlyFee > 0`, call `form.setValue("monthlyFee", pkg.monthlyFee)` (auto-fill only, manual edits still allowed)
- Inline "Add new package" mini-form (name + monthlyFee) at the bottom of the Select's FormItem (just like ExpenseForm does for categories)

**Location (optional):**
- Insert new `FormField` for `location` **before** the Address field
- Render as `<Select>` with values from `getLocations()`. If no locations exist yet, the Select placeholder simply says "Select location (optional)"
- Inline "Add new location" helper
- Since `location` is optional, no `required` rule

### Step 5: Customer Model + Actions
- Add `location?: string` (optional) to the schema, actions payload interface, and `types/index.ts` `Customer` interface
- The customer create/update already spread `data` into the DB query; adding `location` to the spread will just work; no other code changes required

### Step 6: `lib/actions/index.ts`
Append two lines to re-export the new modules so any imports from `@/lib/actions` work (they currently are imported directly from specific files, but maintaining consistency with the barrel file is good practice):
```ts
// Packages
export * from "./package.actions";

// Locations
export * from "./location.actions";
```

---

## Potential Dependencies / Considerations

1. **Existing Customer records:** They lack a `location` field. Mongoose treats missing fields as `undefined`, and the form already spreads empty strings from default values → no breaking changes. No DB migration required.
2. **Package monthlyFee vs Customer.monthlyFee:** The package's `monthlyFee` is a *default/fallback* used only at the moment of form selection. The Customer record retains its own copy of `monthlyFee` as now, so future package fee changes do **not** affect existing customers (this is the desired behavior for an ISP billing system).
3. **In-use delete guard in actions:** Before deleting a Package, we must count `Customer` documents with `packageName === name`; for Location, count `{ location: name }`. This matches the exact pattern already used for categories.
4. **Unique constraints:** Packages and Locations should be unique by name (case-insensitive check at create time, same regex as `createCategory` uses).
5. **No migration needed for old `packageName` strings:** Existing customers that have a `packageName` not present in the new Package collection will still work fine (the dropdown just won't have that option highlighted, but the value is preserved in the record). A note in the UI about this is unnecessary — it Just Works™.
6. **Build-time safety:** Ensure all new files use `.ts` extension and match existing TypeScript strictness; run `npm run build` at the end.

---

## Risk Handling

| Risk | Mitigation |
|------|-----------|
| Package rename breaks customers | No rename operation provided (only create/delete). To "rename", users must create a new package and reassign customers via form edit. |
| Deleting in-use package or location | Server action explicitly runs `countDocuments` against the `Customer` collection and throws a descriptive error. UI shows this error via `toast.error()`. |
| Auto-fill of monthlyFee overwriting user input | Auto-fill **only** runs on package select change (via controlled `onValueChange` callback on the Select). The user can still manually edit the monthlyFee number afterwards; the form field is never locked. |
| Type errors on Customer.customerCode auto-increment | No code near that logic is touched; risk is minimal. |
| Settings page layout becomes too long | Package and Location tabs go inside the existing `<Tabs>` component by adding a 2nd Card below Category, OR by adding a 2nd level of tabs inside the Settings card. Plan uses the former (two separate Cards) to avoid deeply nested tabs. |

---

## Verification Checklist
1. Build passes: `npm run build` exits 0 with no TS or ESLint errors
2. Settings page shows Category, Package, Location management sections
3. Can create/delete packages and locations from settings with toast feedback
4. Cannot delete package/location still referenced by any customer → shows descriptive error toast
5. New customer form has: Package Select, Location Select (optional), auto-filled monthlyFee on package pick
6. Edit customer still works, preserves prior values
7. Created customer successfully saves package name, monthly fee, location to DB
