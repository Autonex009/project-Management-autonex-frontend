import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Modules are now created and edited in a right-hand drawer on the modules
 * page (see ModuleEditorDrawer). This route only keeps old links working:
 * /admin/modules/new            → /admin/modules?module=new
 * /admin/modules/new?edit=<id>  → /admin/modules?module=<id>
 */
export default function AdminModulesBuilder() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  return <Navigate to={`/admin/modules?module=${encodeURIComponent(editId || "new")}`} replace />;
}
