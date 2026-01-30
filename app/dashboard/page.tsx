import { createClient } from "@/utils/supabase/server";
import { ShoppingBasket, Users, Clock, ArrowRight, Plus, Folder, Layers } from "lucide-react";
import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";

export default async function DashboardOverview() {
    const supabase = await createClient();

    // 1. Fetch ALL products recursively for accurate category counts
    let allProducts: any[] = [];
    let page = 0;
    let hasMore = true;
    const pageSize = 1000;

    while (hasMore) {
        const { data, error } = await supabase
            .from("products")
            .select("category, subcategory")
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error || !data || data.length === 0) {
            hasMore = false;
        } else {
            allProducts = [...allProducts, ...data];
            if (data.length < pageSize) hasMore = false;
            page++;
        }
    }

    // 2. Fetch Other Stats
    const [
        { count: userCount },
        { count: pendingCount }
    ] = await Promise.all([
        supabase.from("profiles").select("*", { count: 'exact', head: true }),
        supabase.from("profiles").select("*", { count: 'exact', head: true }).eq('is_approved', false)
    ]);

    // 3. Calculate Unique Counts
    const uniqueCategories = new Set(allProducts.map(p => p.category).filter(Boolean)).size;
    const uniqueSubcategories = new Set(allProducts.map(p => p.subcategory).filter(Boolean)).size;

    // 4. Prepare Chart Data
    const categoryMap = new Map<string, { products: number; subcategories: Set<string> }>();
    const subcategoryMap = new Map<string, { products: number; category: string }>();

    allProducts.forEach(p => {
        if (p.category) {
            if (!categoryMap.has(p.category)) {
                categoryMap.set(p.category, { products: 0, subcategories: new Set() });
            }
            const catEntry = categoryMap.get(p.category)!;
            catEntry.products++;
            if (p.subcategory) {
                catEntry.subcategories.add(p.subcategory);

                if (!subcategoryMap.has(p.subcategory)) {
                    subcategoryMap.set(p.subcategory, { products: 0, category: p.category });
                }
                subcategoryMap.get(p.subcategory)!.products++;
            }
        }
    });

    const categoryData = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        products: data.products,
        subcategories: data.subcategories.size
    })).sort((a, b) => b.products - a.products); // Sort by product count

    const subcategoryData = Array.from(subcategoryMap.entries()).map(([name, data]) => ({
        name,
        products: data.products,
        categoryName: data.category
    })).sort((a, b) => b.products - a.products) // Sort by product count
        .slice(0, 15); // Top 15 subcategories to prevent overcrowding

    const stats = [
        {
            name: "Total Products",
            value: allProducts.length,
            icon: ShoppingBasket,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
            href: "/dashboard/products"
        },
        {
            name: "Categories",
            value: uniqueCategories,
            icon: Folder,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            href: "/dashboard/categories"
        },
        {
            name: "Subcategories",
            value: uniqueSubcategories,
            icon: Layers,
            color: "text-indigo-600",
            bg: "bg-indigo-50 dark:bg-indigo-900/20",
            href: "/dashboard/categories"
        },
        {
            name: "Total Users",
            value: userCount || 0,
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-900/20",
            href: "/dashboard/users"
        },
        {
            name: "Pending Approvals",
            value: pendingCount || 0,
            icon: Clock,
            color: "text-yellow-600",
            bg: "bg-yellow-50 dark:bg-yellow-900/20",
            href: "/dashboard/users"
        },
    ];

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Overview</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Welcome back. Here's what's happening with your library.
                </p>
            </div>

            {/* Quick Actions (Separated in a row) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/dashboard/new" className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green group-hover:scale-110 transition-transform">
                            <Plus className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">Add New Product</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Create a new item in library</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-brand-green transition-colors" />
                </Link>

                <Link href="/dashboard/users" className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white">Manage Users</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">View and approve accounts</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-2">
                {stats.map((stat) => (
                    <Link
                        key={stat.name}
                        href={stat.href}
                        className="group block p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {stat.name}
                                </p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                                    {stat.value}
                                </p>
                            </div>
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-medium text-slate-500 group-hover:text-brand-green transition-colors">
                            View Details <ArrowRight className="h-3 w-3 ml-1" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Visualizations */}
            <DashboardCharts categoryData={categoryData} subcategoryData={subcategoryData} />
        </div>
    );
}
