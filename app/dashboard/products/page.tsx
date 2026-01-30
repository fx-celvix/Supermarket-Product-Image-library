import { createClient } from "@/utils/supabase/server";
import { ProductList } from "@/components/dashboard/product-list";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductsHeaderActions } from "@/components/dashboard/products-header-actions";

export default async function ProductsPage() {
    const supabase = await createClient();
    let products: any[] = [];
    let page = 0;
    let hasMore = true;
    const pageSize = 1000;

    let error = null;

    try {
        while (hasMore) {
            const { data, error: fetchError } = await supabase
                .from("products")
                .select("*")
                .range(page * pageSize, (page + 1) * pageSize - 1)
                .order("created_at", { ascending: false });

            if (fetchError) throw fetchError;

            if (data && data.length > 0) {
                products = [...products, ...data];
                if (data.length < pageSize) hasMore = false;
            } else {
                hasMore = false;
            }
            page++;
        }
    } catch (e: any) {
        error = e;
        console.error("Error fetching products:", JSON.stringify(e, null, 2));
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Product Manager</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Manage your entire product catalogue from one place.
                    </p>
                </div>
                <ProductsHeaderActions />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <ProductList initialProducts={products || []} />
            </div>
        </div>
    );
}
