import {
  getDeviceTypes,
  getBrands,
  getModels,
} from "@/lib/actions/catalog.actions";
import { CatalogManagement } from "@/components/catalog/CatalogManagement";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const [types, brands, models] = await Promise.all([
    getDeviceTypes(false),
    getBrands(undefined, false),
    getModels(),
  ]);

  return (
    <CatalogManagement
      initialTypes={types}
      initialBrands={brands}
      initialModels={models}
    />
  );
}
