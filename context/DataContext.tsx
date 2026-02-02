"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { cacheDB, CACHE_KEYS, CACHE_VERSION, CACHE_DURATION } from '@/utils/cache';

// --- Interfaces ---

export interface Product {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    image_url: string; // From DB
    imageUrl: string; // Mapped for UI
    price: number | null;
    size?: string;
}

export interface CategoryMeta {
    image: string;
    link: string | null;
}

export interface CategoryCache {
    map: Record<string, CategoryMeta>;
    tree: Record<string, string[]>;
}

interface DataContextType {
    products: Product[];
    categoryMeta: Record<string, CategoryMeta>;
    categoryTree: Record<string, Set<string>>;
    isLoading: boolean;
    isCacheRefreshing: boolean;
    refreshCache: () => Promise<void>;
}

// --- Context ---

const DataContext = createContext<DataContextType | undefined>(undefined);

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}

// --- Provider ---

interface DataProviderProps {
    children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
    const supabase = createClient();
    const [products, setProducts] = useState<Product[]>([]);
    const [categoryMeta, setCategoryMeta] = useState<Record<string, CategoryMeta>>({});
    const [categoryTree, setCategoryTree] = useState<Record<string, Set<string>>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isCacheRefreshing, setIsCacheRefreshing] = useState(false);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // 1. Load Categories
                await fetchCategories();
                // 2. Load Products
                await fetchProducts();
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const fetchCategories = async () => {
        console.log('[Cache] Checking IndexedDB for categories...');
        const cached = await cacheDB.get<CategoryCache>(CACHE_KEYS.CATEGORIES, CACHE_VERSION, CACHE_DURATION);

        if (cached) {
            console.log('[Cache] Found cached categories. Using cache.');
            // Hydrate Tree (Array -> Set)
            const hydratedTree: Record<string, Set<string>> = {};
            Object.keys(cached.tree).forEach(k => {
                hydratedTree[k] = new Set(cached.tree[k]);
            });

            setCategoryMeta(cached.map);
            setCategoryTree(hydratedTree);
            return;
        }

        console.log('[Cache] No valid category cache found. Fetching from database...');
        const { data } = await supabase.from('categories').select('name, parent_name, image_url, link');

        if (data) {
            console.log(`[Cache] Fetched ${data.length} categories from database.`);
            const map: Record<string, CategoryMeta> = {};
            const tree: Record<string, Set<string>> = {};

            data.forEach((c: any) => {
                const parent = c.parent_name ? c.parent_name.trim().toLowerCase() : 'root';
                const name = c.name ? c.name.trim().toLowerCase() : '';

                if (name) {
                    const key = `${parent}:${name}`;
                    if (c.image_url || c.link) {
                        map[key] = {
                            image: c.image_url,
                            link: c.link
                        };
                    }

                    // Build Tree
                    if (!tree[parent]) tree[parent] = new Set();
                    tree[parent].add(c.name.trim());
                }
            });

            // Serialize Sets for caching
            const treeForCache: Record<string, string[]> = {};
            Object.keys(tree).forEach(k => {
                treeForCache[k] = Array.from(tree[k]);
            });

            setCategoryMeta(map);
            setCategoryTree(tree);

            // Save to IndexedDB
            await cacheDB.set<CategoryCache>(CACHE_KEYS.CATEGORIES, { map, tree: treeForCache }, CACHE_VERSION);
        }
    };

    const fetchProducts = async () => {
        console.log('[Cache] Checking IndexedDB for products...');
        const cachedProducts = await cacheDB.get<Product[]>(CACHE_KEYS.PRODUCTS, CACHE_VERSION, CACHE_DURATION);

        if (cachedProducts && cachedProducts.length > 0) {
            console.log(`[Cache] Found ${cachedProducts.length} cached products. Using cache.`);
            // Deduplicate cached products
            const uniqueCachedProducts = Array.from(
                new Map(cachedProducts.map((p) => [p.id, p])).values()
            ) as Product[];
            setProducts(uniqueCachedProducts);
            return;
        }

        console.log('[Cache] No valid product cache found. Fetching from database...');

        let allProducts: any[] = [];
        let page = 0;
        let hasMore = true;
        const pageSize = 1000;

        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await supabase
                .from('products')
                .select('*')
                .range(from, to)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching products page:', page, error);
                break;
            }

            if (data && data.length > 0) {
                allProducts = [...allProducts, ...data];
                if (data.length < pageSize) hasMore = false;
            } else {
                hasMore = false;
            }
            page++;
        }

        console.log(`[Cache] Fetched ${allProducts.length} products from database.`);

        const mappedProducts = allProducts.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            subcategory: p.subcategory,
            image_url: p.image_url,
            imageUrl: p.image_url,
            price: p.price,
            size: p.size
        }));

        // Deduplicate
        const uniqueProducts = Array.from(
            new Map(mappedProducts.map(p => [p.id, p])).values()
        ) as Product[];

        setProducts(uniqueProducts);

        // Save to IndexedDB
        await cacheDB.set<Product[]>(CACHE_KEYS.PRODUCTS, uniqueProducts, CACHE_VERSION);
    };

    const refreshCache = async () => {
        setIsCacheRefreshing(true);
        setIsLoading(true);
        try {
            await cacheDB.clear();
            await fetchCategories();
            await fetchProducts();
            // Just refresh data in place, no reload needed unless something breaks
        } catch (error) {
            console.error("Failed to refresh cache:", error);
        } finally {
            setIsCacheRefreshing(false);
            setIsLoading(false);
            window.location.reload(); // Reloading is safer to reset all states cleanly
        }
    };

    return (
        <DataContext.Provider value={{
            products,
            categoryMeta,
            categoryTree,
            isLoading,
            isCacheRefreshing,
            refreshCache
        }}>
            {children}
        </DataContext.Provider>
    );
}
