"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Layers,
  Tag,
  Cpu,
  Loader2,
  Shield,
  Search,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createDeviceType,
  updateDeviceType,
  deleteDeviceType,
  createBrand,
  updateBrand,
  deleteBrand,
  createModel,
  updateModel,
  deleteModel,
  seedDefaultCatalog,
} from "@/lib/actions/catalog.actions";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import type { IDeviceType, IBrand, IModel } from "@/types";

interface CatalogManagementProps {
  initialTypes: IDeviceType[];
  initialBrands: IBrand[];
  initialModels: IModel[];
}

export function CatalogManagement({
  initialTypes,
  initialBrands,
  initialModels,
}: CatalogManagementProps) {
  const router = useRouter();

  // Search filters per tab
  const [typeSearch, setTypeSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [modelTypeFilter, setModelTypeFilter] = useState("all");

  // Type modal
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<IDeviceType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");

  // Brand modal
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<IBrand | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandTypes, setBrandTypes] = useState<string[]>([]);

  // Model modal
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<IModel | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelType, setModelType] = useState("");
  const [modelBrand, setModelBrand] = useState("");
  const [modelSpecs, setModelSpecs] = useState("");

  // Deletion modals
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "type" | "brand" | "model";
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---- Seed Catalog Handler ----
  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      await seedDefaultCatalog();
      toast.success("Default catalog seeded with standard device types & models!");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to seed catalog");
    } finally {
      setIsSeeding(false);
    }
  };

  // ---- Device Type Handlers ----
  const openCreateType = () => {
    setEditingType(null);
    setTypeName("");
    setTypeDesc("");
    setTypeModalOpen(true);
  };

  const openEditType = (t: IDeviceType) => {
    setEditingType(t);
    setTypeName(t.name);
    setTypeDesc(t.description || "");
    setTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;
    try {
      setSubmitting(true);
      if (editingType) {
        await updateDeviceType(editingType._id, {
          name: typeName.trim(),
          description: typeDesc.trim(),
        });
        toast.success(`Updated device type "${typeName}"`);
      } else {
        await createDeviceType({
          name: typeName.trim(),
          description: typeDesc.trim(),
        });
        toast.success(`Created device type "${typeName}"`);
      }
      setTypeModalOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving device type");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Brand Handlers ----
  const openCreateBrand = () => {
    setEditingBrand(null);
    setBrandName("");
    setBrandTypes(initialTypes.length > 0 ? [initialTypes[0].slug] : []);
    setBrandModalOpen(true);
  };

  const openEditBrand = (b: IBrand) => {
    setEditingBrand(b);
    setBrandName(b.name);
    setBrandTypes(b.deviceTypes || []);
    setBrandModalOpen(true);
  };

  const toggleBrandType = (slug: string) => {
    setBrandTypes((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || brandTypes.length === 0) {
      toast.error("Please enter a brand name and select at least one device type");
      return;
    }
    try {
      setSubmitting(true);
      if (editingBrand) {
        await updateBrand(editingBrand._id, {
          name: brandName.trim(),
          deviceTypes: brandTypes,
        });
        toast.success(`Updated brand "${brandName}"`);
      } else {
        await createBrand({
          name: brandName.trim(),
          deviceTypes: brandTypes,
        });
        toast.success(`Created brand "${brandName}"`);
      }
      setBrandModalOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving brand");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Model Handlers ----
  const openCreateModel = () => {
    setEditingModel(null);
    setModelName("");
    setModelType(initialTypes.length > 0 ? initialTypes[0].slug : "");
    setModelBrand(initialBrands.length > 0 ? initialBrands[0].name : "");
    setModelSpecs("");
    setModelModalOpen(true);
  };

  const openEditModel = (m: IModel) => {
    setEditingModel(m);
    setModelName(m.name);
    setModelType(m.deviceType);
    setModelBrand(m.brand);
    setModelSpecs(m.specifications || "");
    setModelModalOpen(true);
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim() || !modelType || !modelBrand) {
      toast.error("Please fill in model name, device type, and brand");
      return;
    }
    try {
      setSubmitting(true);
      if (editingModel) {
        await updateModel(editingModel._id, {
          name: modelName.trim(),
          specifications: modelSpecs.trim(),
        });
        toast.success(`Updated model "${modelName}"`);
      } else {
        await createModel({
          name: modelName.trim(),
          deviceType: modelType,
          brand: modelBrand,
          specifications: modelSpecs.trim(),
        });
        toast.success(`Created model "${modelName}"`);
      }
      setModelModalOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving model");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete Handler ----
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      if (deleteTarget.type === "type") {
        await deleteDeviceType(deleteTarget.id);
      } else if (deleteTarget.type === "brand") {
        await deleteBrand(deleteTarget.id);
      } else if (deleteTarget.type === "model") {
        await deleteModel(deleteTarget.id);
      }
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered lists
  const filteredTypes = initialTypes.filter((t) =>
    t.name.toLowerCase().includes(typeSearch.toLowerCase())
  );

  const filteredBrands = initialBrands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const filteredModels = initialModels.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
      m.brand.toLowerCase().includes(modelSearch.toLowerCase());
    const matchesType =
      modelTypeFilter === "all" || m.deviceType === modelTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/50">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Device Catalog
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage hardware taxonomies: Device Types → Brands → Models
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {initialBrands.length === 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSeed}
              disabled={isSeeding}
              className="rounded-xl border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-semibold"
            >
              {isSeeding ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
              )}
              Seed Defaults
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="models" className="w-full space-y-6">
        <TabsList className="grid grid-cols-3 w-full sm:w-[480px] bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          <TabsTrigger
            value="models"
            className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400 data-[state=active]:shadow-sm transition-all"
          >
            <Cpu className="w-3.5 h-3.5 mr-1.5" />
            Models ({initialModels.length})
          </TabsTrigger>
          <TabsTrigger
            value="brands"
            className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400 data-[state=active]:shadow-sm transition-all"
          >
            <Tag className="w-3.5 h-3.5 mr-1.5" />
            Brands ({initialBrands.length})
          </TabsTrigger>
          <TabsTrigger
            value="types"
            className="rounded-xl text-xs font-bold py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400 data-[state=active]:shadow-sm transition-all"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Types ({initialTypes.length})
          </TabsTrigger>
        </TabsList>

        {/* ========================================== */}
        {/* TAB 1: MODELS */}
        {/* ========================================== */}
        <TabsContent value="models" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search models or brands..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
                />
              </div>

              <div className="w-40">
                <Select value={modelTypeFilter} onValueChange={setModelTypeFilter}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    <SelectItem value="all">All Types</SelectItem>
                    {initialTypes.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={openCreateModel}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Model
            </Button>
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredModels.map((m) => (
              <div
                key={m._id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-800/80 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300">
                      {m.deviceType}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {m.brand}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {m.name}
                  </h3>
                  {m.specifications && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {m.specifications}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-3">
                  <button
                    type="button"
                    onClick={() => openEditModel(m)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                    title="Edit Model"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({ type: "model", id: m._id, name: m.name })
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Model"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredModels.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400">
              <Cpu className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No models found</p>
              <p className="text-xs text-slate-400 mt-1">
                Add models associated with your hardware brands.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ========================================== */}
        {/* TAB 2: BRANDS */}
        {/* ========================================== */}
        <TabsContent value="brands" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search brands..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
              />
            </div>

            <Button
              onClick={openCreateBrand}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Brand
            </Button>
          </div>

          {/* Brands Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredBrands.map((b) => (
              <div
                key={b._id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-800/80 transition-all group"
              >
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                    {b.name}
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {b.deviceTypes?.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-semibold capitalize px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-3">
                  <button
                    type="button"
                    onClick={() => openEditBrand(b)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                    title="Edit Brand"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget({ type: "brand", id: b._id, name: b.name })
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Brand"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredBrands.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No brands created yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Create brands or seed defaults to get started.
              </p>
            </div>
          )}
        </TabsContent>

        {/* ========================================== */}
        {/* TAB 3: DEVICE TYPES */}
        {/* ========================================== */}
        <TabsContent value="types" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search device types..."
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                className="pl-10 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 text-xs"
              />
            </div>

            <Button
              onClick={openCreateType}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Device Type
            </Button>
          </div>

          {/* Types Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredTypes.map((t) => (
              <div
                key={t._id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-800/80 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                      {t.name}
                    </h3>
                    {t.isProtected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                        <Shield className="w-3 h-3" /> Core
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-sky-600 dark:text-sky-400">
                    slug: {t.slug}
                  </span>
                  {t.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {t.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-3">
                  <button
                    type="button"
                    onClick={() => openEditType(t)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                    title="Edit Type"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {!t.isProtected && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({ type: "type", id: t._id, name: t.name })
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Type"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================== */}
      {/* MODAL 1: DEVICE TYPE MODAL */}
      {/* ========================================== */}
      <Dialog open={typeModalOpen} onOpenChange={setTypeModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {editingType ? `Edit "${editingType.name}"` : "Add New Device Type"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveType} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Device Type Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Firewall, OLT, CCTV"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description (optional)
              </Label>
              <Input
                placeholder="Brief summary..."
                value={typeDesc}
                onChange={(e) => setTypeDesc(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-sm"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTypeModalOpen(false)}
                className="rounded-xl border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !typeName.trim()}
                className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold"
              >
                {submitting ? "Saving..." : "Save Device Type"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* MODAL 2: BRAND MODAL */}
      {/* ========================================== */}
      <Dialog open={brandModalOpen} onOpenChange={setBrandModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {editingBrand ? `Edit Brand "${editingBrand.name}"` : "Add New Brand"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBrand} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Brand Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Ubiquiti, Cisco, MikroTik"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Associated Device Types <span className="text-rose-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {initialTypes.map((t) => {
                  const isSelected = brandTypes.includes(t.slug);
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => toggleBrandType(t.slug)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-sky-50 dark:bg-sky-950/60 border-sky-400 text-sky-700 dark:text-sky-300"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBrandModalOpen(false)}
                className="rounded-xl border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !brandName.trim() || brandTypes.length === 0}
                className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold"
              >
                {submitting ? "Saving..." : "Save Brand"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* MODAL 3: MODEL MODAL */}
      {/* ========================================== */}
      <Dialog open={modelModalOpen} onOpenChange={setModelModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {editingModel ? `Edit Model "${editingModel.name}"` : "Add New Model"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveModel} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Model Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Rocket Prism 5AC, RB4011"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-sm"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Device Type <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={modelType}
                  onValueChange={setModelType}
                  disabled={Boolean(editingModel)}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    {initialTypes.map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Brand <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={modelBrand}
                  onValueChange={setModelBrand}
                  disabled={Boolean(editingModel)}
                >
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-xs">
                    <SelectValue placeholder="Select Brand" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    {initialBrands.map((b) => (
                      <SelectItem key={b._id} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Specifications (optional)
              </Label>
              <Input
                placeholder="e.g. 5GHz, 500+ Mbps airMAX ac"
                value={modelSpecs}
                onChange={(e) => setModelSpecs(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModelModalOpen(false)}
                className="rounded-xl border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !modelName.trim() || !modelType || !modelBrand}
                className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold"
              >
                {submitting ? "Saving..." : "Save Model"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type}: ${deleteTarget?.name}?`}
        description="This will permanently delete this catalog item if no active devices depend on it."
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
