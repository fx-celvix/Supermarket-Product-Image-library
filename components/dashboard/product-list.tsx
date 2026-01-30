"use client";

import { useState, useMemo } from "react";
import { Edit, Trash2, Search, Filter, X } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import Link from "next/link";


interface Product {
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    image_url: string;
    price: number | null;
    size: string | null;
    created_at: string;
}

export function ProductList({ initialProducts }: { initialProducts: Product[] }) {
    const [products, setProducts] = useState(initialProducts);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedSubcategory, setSelectedSubcategory] = useState("All");
    const supabase = createClient();

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesSearch =
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.subcategory && product.subcategory.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
            const matchesSubcategory = selectedSubcategory === "All" || product.subcategory === selectedSubcategory;

            return matchesSearch && matchesCategory && matchesSubcategory;
        });
    }, [products, searchQuery, selectedCategory, selectedSubcategory]);

    // Dynamic Filter Options derived from actual data
    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        products.forEach(p => {
            // Basic normalization to ensure "Fruits" and "Fruits " match if we wanted, 
            // but strictly we should probably just show what's there. 
            // Let's stick to raw values to match the table exactly.
            if (p.category) cats.add(p.category);
        });
        return Array.from(cats).sort();
    }, [products]);

    const availableSubcategories = useMemo(() => {
        if (selectedCategory === "All") return [];
        const subs = new Set<string>();
        products.forEach(p => {
            if (p.category === selectedCategory && p.subcategory) {
                subs.add(p.subcategory);
            }
        });
        return Array.from(subs).sort();
    }, [products, selectedCategory]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;

        setIsDeleting(id);
        const { error } = await supabase.from("products").delete().eq("id", id);

        if (error) {
            console.error(error);
            toast.error("Failed to delete product");
            setIsDeleting(null);
        } else {
            setProducts(products.filter((p) => p.id !== id));
            toast.success("Product deleted");
        }
    };

    return (
        <div className="space-y-4">
            {/* Filters Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative min-w-[150px]">
                        <select
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setSelectedSubcategory("All"); // Reset subcategory
                            }}
                            className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                        >
                            <option value="All">All Categories</option>
                            {availableCategories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>

                    {selectedCategory !== "All" && availableSubcategories.length > 0 && (
                        <div className="relative min-w-[150px]">
                            <select
                                value={selectedSubcategory}
                                onChange={(e) => setSelectedSubcategory(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                            >
                                <option value="All">All Subcategories</option>
                                {availableSubcategories.map((sub) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    )}

                    {(searchQuery || selectedCategory !== "All" || selectedSubcategory !== "All") && (
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setSelectedCategory("All");
                                setSelectedSubcategory("All");
                            }}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
                            title="Reset Filters"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                    No products found matching your criteria.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 font-medium">
                            <tr>
                                <th className="px-6 py-4">Image</th>
                                <th className="px-6 py-4">Product Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Subcategory</th>
                                <th className="px-6 py-4">Size</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                                    <td className="px-6 py-3">
                                        <div className="h-12 w-12 relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                                            <Image
                                                src={product.image_url}
                                                alt={product.name}
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                                        {product.name}
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                        <span className="text-slate-900 dark:text-slate-200 font-medium">{product.category}</span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                        <span className="text-slate-700 dark:text-slate-300">{product.subcategory || '-'}</span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                        <span className="text-slate-700 dark:text-slate-300">{product.size || '-'}</span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium">
                                        {product.price ? `₹${product.price}` : <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                href={`/dashboard/${product.id}/edit`}
                                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                disabled={isDeleting === product.id}
                                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
