"use client";

// Force HMR refresh
import { Suspense, useState, useEffect, useMemo } from 'react';
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Search, Download, Check, X, FileSpreadsheet } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from 'next/navigation';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import { useAuth } from '@/context/AuthContext';
import { Dock, DockIcon } from "@/components/ui/dock";
import * as XLSX from 'xlsx';

// Mock Data

// Mock Data
// Mock Data removed. Using dynamic data from Supabase.

// Mock Data removed. Using dynamic data from Supabase.

import { createClient } from '@/utils/supabase/client';

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  image_url: string; // From DB
  imageUrl: string; // Mapped for UI
  price: number | null;
  size?: string;
}


function ProductGrid() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  // Supabase Integration
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selection & Export Logic
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      // Clear selection when exiting
      setSelectedProducts(new Set());
    }
    setIsSelectionMode(!isSelectionMode);
  };

  const handleProductToggle = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const handleExport = () => {
    if (selectedProducts.size === 0) return;

    const data = Array.from(selectedProducts).map(id => {
      const product = products.find(p => p.id === id);
      if (!product) return null;

      const catKey = `root:${product.category.trim().toLowerCase()}`;
      const catImage = categoryMeta[catKey]?.image || "";

      const subKey = `${product.category.trim().toLowerCase()}:${product.subcategory.trim().toLowerCase()}`;
      let subImage = categoryMeta[subKey]?.image || "";
      if (!subImage) {
        const productWithImage = products.find(p => p.category === product.category && p.subcategory === product.subcategory && p.imageUrl);
        subImage = productWithImage?.imageUrl || "";
      }

      return {
        "Category": product.category,
        "Subcategory": product.subcategory,
        "Name": product.name,
        "Size": product.size || "",
        "Price": product.price || "",
        "Image URL": product.imageUrl,
        "Category Image URL": catImage,
        "Subcategory Image URL": subImage
      };
    }).filter(Boolean);

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Fetch Category Metadata & Build Tree
  const [categoryMeta, setCategoryMeta] = useState<Record<string, { image: string, link: string | null }>>({});
  const [categoryTree, setCategoryTree] = useState<Record<string, Set<string>>>({});

  // Cache Keys & Duration
  const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  const CATEGORY_CACHE_KEY = 'grocery_cache_categories';
  const PRODUCT_CACHE_KEY = 'grocery_cache_products';

  useEffect(() => {
    const fetchMeta = async () => {
      // Check Cache
      const cached = localStorage.getItem(CATEGORY_CACHE_KEY);
      if (cached) {
        try {
          const { timestamp, map, tree } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            // Hydrate Tree (Array -> Set)
            const hydratedTree: Record<string, Set<string>> = {};
            Object.keys(tree).forEach(k => {
              // @ts-ignore
              hydratedTree[k] = new Set(tree[k]);
            });

            setCategoryMeta(map);
            setCategoryTree(hydratedTree);

            // If cache is valid, returns early for Categories, 
            // BUT we might still want to fetch in background to revalidate? 
            // For now, adhere to "store in local memory instead of fetching", so pure cache first.
            if (Object.keys(map).length > 0) return;
          }
        } catch (e) {
          console.error("Cache parse error", e);
          localStorage.removeItem(CATEGORY_CACHE_KEY);
        }
      }

      const { data } = await supabase.from('categories').select('name, parent_name, image_url, link');
      if (data) {
        const map: Record<string, { image: string, link: string | null }> = {};
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

        // Serialize Sets for caching (Sets are not JSON serializable by default)
        const treeForCache: Record<string, string[]> = {};
        Object.keys(tree).forEach(k => {
          treeForCache[k] = Array.from(tree[k]);
        });

        // Save to Cache (store tree as array for JSON, convert back on load if needed, but here we can just store the object structure matching state?
        // Wait, setCategoryTree expects Record<string, Set<string>>. 
        // JSON.parse will return arrays for the sets. We need to handle that in the hydration phase above.

        // Let's fix the hydration logic above first. 
        // Actually, let's keep it simple: 
        // We will store the "raw data" or the processed structures.
        // Storing processed structures requires re-hydrating the Sets.

        setCategoryMeta(map);
        setCategoryTree(tree);

        localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          map,
          tree: treeForCache // Store as arrays
        }));
      }
    };
    fetchMeta();
  }, []);

  // Fetch Products Effect
  useEffect(() => {
    const fetchAllProducts = async () => {
      setIsLoading(true);

      // Check Cache
      const cached = localStorage.getItem(PRODUCT_CACHE_KEY);
      if (cached) {
        try {
          const { timestamp, products } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION && products.length > 0) {
            setProducts(products);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error("Product cache parse error", e);
          localStorage.removeItem(PRODUCT_CACHE_KEY);
        }
      }

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

      const mappedProducts = allProducts.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        subcategory: p.subcategory,
        image_url: p.image_url,
        imageUrl: p.image_url,
        price: p.price
      }));

      setProducts(mappedProducts);
      setIsLoading(false);

      try {
        localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          products: mappedProducts
        }));
      } catch (e) {
        console.error("Failed to save products to cache (quota exceeded?)", e);
      }
    };

    fetchAllProducts();
  }, []);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setActiveSubCategory('All');
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const matchesSubCategory = activeSubCategory === 'All' || product.subcategory === activeSubCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSubCategory && matchesSearch;
  });

  // Derive subcategories dynamically from CONFIGURATION (DB), not just products
  const subCategories = useMemo(() => {
    if (activeCategory === 'All') return [];

    // Keys are normalized in the tree
    const normalizedActive = activeCategory.trim().toLowerCase();
    const configSubcategories = categoryTree[normalizedActive];

    // Get products in this category (for fallback images)
    const categoryProducts = products.filter(p => p.category === activeCategory);

    // If we have config, use it. Otherwise fall back to product-derived (though config should exist if main cat exists)
    const subsToDisplay = configSubcategories ? Array.from(configSubcategories) : [];

    // ALSO include any "orphan" subcategories from products that might not be in the config tree (legacy data support)
    categoryProducts.forEach(p => {
      if (p.subcategory && !subsToDisplay.includes(p.subcategory)) {
        // Check if we should add it? unique check
        if (!configSubcategories || !configSubcategories.has(p.subcategory)) {
          subsToDisplay.push(p.subcategory);
        }
      }
    });

    // Remove duplicates strictly
    const uniqueSubs = Array.from(new Set(subsToDisplay));

    return uniqueSubs.map(name => {
      // Try to find metadata for this subcategory
      // Key: "activecategory:subcategory" (normalized)
      const metaKey = `${activeCategory.trim().toLowerCase()}:${name.trim().toLowerCase()}`;
      const meta = categoryMeta[metaKey];

      // Fallback to first product image if no metadata image
      const productWithImage = categoryProducts.find(p => p.subcategory === name && p.imageUrl);

      return {
        name,
        image: meta?.image || productWithImage?.imageUrl || "https://placehold.co/100x100/png?text=No+Image",
        link: meta?.link || null
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, activeCategory, categoryMeta, categoryTree]);

  // Derive main categories from products and metadata
  const mainCategories = useMemo(() => {
    // 1. Get derived categories (same logic as before)
    const derivedCats = new Map<string, string>();
    const allImage = products.length > 0 ? products[0].imageUrl : "https://placehold.co/100x100/png?text=All";
    derivedCats.set('All', allImage);

    products.forEach(p => {
      if (p.category && !derivedCats.has(p.category)) {
        derivedCats.set(p.category, p.imageUrl);
      }
    });

    // 2. Fetch metadata (we need to load this in useEffect, but for now we'll do simplistic client-side fetching or pass it in)
    // Actually, we must fetch it. 
    // Since this is a client component, let's add a state for it.

    // Returning derived for now, will be merged in render or effect.
    return Array.from(derivedCats.entries()).map(([name, image]) => ({
      name,
      image
    }));
  }, [products]);



  // Final Merged Categories for UI
  const displayCategories = useMemo(() => {
    return mainCategories.map(cat => {
      const meta = categoryMeta[`root:${cat.name.trim().toLowerCase()}`];
      return {
        ...cat,
        image: meta?.image || cat.image,
        link: meta?.link || null
      };
    });
  }, [mainCategories, categoryMeta]);

  return (
    <>
      <Navbar />


      {/* Page Header (Sticky) */}
      <div className="sticky top-16 z-40 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 transition-colors duration-300 shadow-sm">
        <div className="container-custom py-4">
          <div className="flex flex-col gap-4 w-full">



            <div className="flex items-center justify-center w-full">

              {/* Desktop Category Slider */}
              <div className="hidden md:block w-full">
                <Carousel
                  opts={{
                    align: "start",
                    dragFree: true,
                    containScroll: "trimSnaps",
                  }}
                  className="w-full"
                  plugins={[WheelGesturesPlugin()]}
                >
                  <CarouselContent className="-ml-3">
                    {displayCategories.map((cat) => (
                      <CarouselItem key={cat.name} className="pl-3 basis-auto">
                        <button
                          onClick={() => {
                            if (cat.link) {
                              window.location.href = cat.link; // or router.push 
                            } else {
                              handleCategoryChange(cat.name);
                            }
                          }}
                          className={`group flex items-center gap-3 p-1.5 pr-6 rounded-full border transition-all duration-300 min-w-[140px] ${activeCategory === cat.name
                            ? 'bg-brand-green border-brand-green text-white shadow-lg shadow-brand-green/20'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-brand-green/50 hover:shadow-md'
                            }`}
                        >
                          <div className="relative w-10 h-10 shrink-0">
                            <Image
                              src={cat.image}
                              alt={cat.name}
                              fill
                              className={`object-cover rounded-full ring-2 ${activeCategory === cat.name ? 'ring-white/30' : 'ring-white dark:ring-slate-900 group-hover:ring-brand-green/20'}`}
                            />
                          </div>
                          <div className="flex flex-col items-start text-left">
                            <span className="font-bold text-sm leading-tight">{cat.name}</span>
                            <span className={`text-[10px] font-medium leading-none ${activeCategory === cat.name ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                              collection
                            </span>
                          </div>
                        </button>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="-left-4 lg:-left-12 opacity-100 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700" />
                  <CarouselNext className="-right-4 lg:-right-12 opacity-100 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700" />
                </Carousel>
              </div>
            </div>

            {/* Mobile Categories Scroll (thumbnails) */}
            <div className="md:hidden mt-4 flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide px-1">
              {displayCategories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => {
                    if (cat.link) {
                      window.location.href = cat.link;
                    } else {
                      handleCategoryChange(cat.name);
                    }
                  }}
                  className={`flex-shrink-0 flex items-center gap-3 p-1.5 pr-5 rounded-full border transition-all duration-300 ${activeCategory === cat.name
                    ? 'bg-brand-green border-brand-green text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                >
                  <div className="relative w-9 h-9 shrink-0">
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover rounded-full"
                    />
                  </div>
                  <span className="font-bold text-xs whitespace-nowrap">{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Mobile Sub-category Filters (Only if categories exist) */}
            {subCategories.length > 0 && (
              <div className="md:hidden mt-2 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  onClick={() => setActiveSubCategory('All')}
                  className={`flex-shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSubCategory === 'All'
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  All {activeCategory}
                </button>
                {subCategories.map(sub => (
                  <button
                    key={sub.name}
                    onClick={() => setActiveSubCategory(sub.name)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSubCategory === sub.name
                      ? 'bg-brand-green text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                  >
                    <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0">
                      <Image src={sub.image} alt={sub.name} fill className="object-cover" />
                    </div>
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Floating Export Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <Dock iconSize={52} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl mb-0">
            {!isSelectionMode ? (
              <DockIcon onClick={toggleSelectionMode} className="cursor-pointer !w-auto !aspect-auto min-w-32" magnification={60} distance={100}>
                <div className="h-full w-full flex items-center justify-center gap-2.5 px-6 bg-gradient-to-tr from-brand-green to-brand-green-dark text-white rounded-full shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 transition-all border border-white/10">
                  <FileSpreadsheet className="h-6 w-6" />
                  <span className="text-base font-bold">Select</span>
                </div>
              </DockIcon>
            ) : (
              <>
                <div className="px-4 flex items-center justify-center h-full">
                  <span className="text-base font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-full whitespace-nowrap border border-slate-200 dark:border-slate-700 shadow-inner">
                    {selectedProducts.size} <span className="text-slate-500 font-medium text-sm ml-1">selected</span>
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
                <DockIcon onClick={toggleSelectionMode} className="cursor-pointer" magnification={60} distance={100}>
                  <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                    <X className="h-5 w-5" />
                  </div>
                </DockIcon>
                <DockIcon onClick={handleExport} className="cursor-pointer !w-auto !aspect-auto min-w-44" magnification={70} distance={100}>
                  <div className={`h-full w-full flex items-center justify-center gap-2.5 px-6 rounded-full transition-all border ${selectedProducts.size > 0
                    ? 'bg-gradient-to-tr from-brand-green to-brand-green-dark text-white shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 border-white/10'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}>
                    <Download className="h-6 w-6" />
                    <span className="text-base font-bold whitespace-nowrap">Export Excel</span>
                  </div>
                </DockIcon>
              </>
            )}
          </Dock>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container-custom py-12 flex flex-col md:flex-row gap-8">

        {/* Desktop Sidebar (Sub-categories) */}
        {activeCategory !== 'All' && subCategories.length > 0 && (
          <aside className="hidden md:block w-40 shrink-0">
            <div className="fixed top-48 w-40 max-h-[calc(100vh-14rem)] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="p-3 pb-2 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50 rounded-t-2xl">
                <h3 className="font-semibold text-slate-900 dark:text-white px-2 text-center text-sm">{activeCategory}</h3>
              </div>
              <div className="overflow-y-auto p-3 pt-2 scrollbar-hide grid grid-cols-1 gap-2">
                <button
                  onClick={() => setActiveSubCategory('All')}
                  className={`w-full text-center px-3 py-2 rounded-xl text-xs font-medium transition-colors ${activeSubCategory === 'All'
                    ? 'bg-brand-green text-white shadow-md shadow-brand-green/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  All {activeCategory}
                </button>
                {subCategories.map(sub => (
                  <button
                    key={sub.name}
                    onClick={() => setActiveSubCategory(sub.name)}
                    className={`group w-full flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 ${activeSubCategory === sub.name
                      ? 'bg-white dark:bg-slate-800 border-2 border-brand-green shadow-md scale-105 z-10'
                      : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:scale-105'
                      }`}
                  >
                    <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                      <Image
                        src={sub.image}
                        alt={sub.name}
                        fill
                        className={`object-cover transition-transform duration-500 group-hover:scale-110 ${activeSubCategory === sub.name ? 'scale-110' : ''}`}
                      />
                    </div>
                    <span className={`text-[11px] font-medium leading-tight text-center ${activeSubCategory === sub.name ? 'text-brand-green font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                      {sub.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )
        }

        {/* Product Grid */}
        <div className="flex-1">
          <div className={`grid grid-cols-2 ${activeCategory !== 'All' ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'} gap-6`}>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                isSelectionMode={isSelectionMode}
                isSelected={selectedProducts.has(product.id)}
                onToggle={() => handleProductToggle(product.id)}
              />
            ))}

            {isLoading && (
              <div className="col-span-full py-20 text-center text-slate-500">
                Loading products...
              </div>
            )}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No products found</h3>
              <p className="text-slate-500 dark:text-slate-400">Try adjusting your search or filter to find what you're looking for.</p>
            </div>
          )}
        </div>
      </div >
    </>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 pb-20 transition-colors duration-300">
      <Suspense fallback={<div>Loading...</div>}>
        <ProductGrid />
      </Suspense>
    </main>
  );
}
