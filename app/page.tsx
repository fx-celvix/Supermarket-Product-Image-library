"use client";

// Force HMR refresh
import { Suspense, useState, useEffect, useMemo } from 'react';
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import ImageActionModal from "@/components/ImageActionModal";
import { Search, Download, Check, X, FileSpreadsheet, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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

import { useData } from '@/context/DataContext';

// Interfaces are now inferred from the hook or imported if needed
// But we can just use the inferred types from useData


function ProductGrid() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchQuery = searchParams.get('search') || '';

  const { products, categoryMeta, categoryTree, isLoading, isCacheRefreshing, refreshCache } = useData();

  // Selection & Export Logic
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Image Action Modal State
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalData, setImageModalData] = useState<{
    imageUrl: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const openImageModal = (imageUrl: string, title: string, subtitle?: string) => {
    setImageModalData({ imageUrl, title, subtitle });
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageModalData(null);
  };

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

  // Select all / Deselect all
  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Export to Excel
  const handleExport = () => {
    const selected = products.filter(p => selectedProducts.has(p.id));
    const data = selected.map(p => ({
      Name: p.name,
      Category: p.category,
      Subcategory: p.subcategory || '',
      ImageURL: p.imageUrl
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setActiveSubCategory('All');
    // Clear search query when switching categories
    const params = new URLSearchParams(searchParams.toString());
    if (params.has('search')) {
      params.delete('search');
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  const handleSubCategoryChange = (subCat: string) => {
    setActiveSubCategory(subCat);
    // Clear search query when switching subcategories
    const params = new URLSearchParams(searchParams.toString());
    if (params.has('search')) {
      params.delete('search');
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  // Pre-index products by category for instant switching (computed once)
  const productsByCategory = useMemo(() => {
    const index: Record<string, typeof products> = { 'All': products };
    products.forEach(product => {
      if (product.category) {
        if (!index[product.category]) {
          index[product.category] = [];
        }
        index[product.category].push(product);
      }
    });
    return index;
  }, [products]);

  // Pre-index products by category+subcategory for instant sub-category switching
  const productsByCategoryAndSub = useMemo(() => {
    const index: Record<string, typeof products> = {};
    products.forEach(product => {
      if (product.category && product.subcategory) {
        const key = `${product.category}::${product.subcategory}`;
        if (!index[key]) {
          index[key] = [];
        }
        index[key].push(product);
      }
    });
    return index;
  }, [products]);

  // Fast filtering using pre-indexed data
  const filteredProducts = useMemo(() => {
    // Get category-filtered products instantly from index
    let categoryProducts: typeof products;
    if (activeCategory === 'All') {
      categoryProducts = productsByCategory['All'] || [];
    } else {
      categoryProducts = productsByCategory[activeCategory] || [];
    }

    // Apply subcategory filter if needed
    let result: typeof products;
    if (activeSubCategory === 'All') {
      result = categoryProducts;
    } else {
      // Use the combined index for instant lookup
      const key = `${activeCategory}::${activeSubCategory}`;
      result = productsByCategoryAndSub[key] || [];
    }

    // Apply search filter only if there's a search query
    if (searchQuery) {
      const lowerSearch = searchQuery.toLowerCase();
      return result.filter(product => product.name.toLowerCase().includes(lowerSearch));
    }

    return result;
  }, [productsByCategory, productsByCategoryAndSub, activeCategory, activeSubCategory, searchQuery]);

  // Preload first 20 images when category changes for instant display
  useEffect(() => {
    if (filteredProducts.length === 0) return;

    // Preload first 20 images using browser's native Image preloading
    const preloadCount = Math.min(20, filteredProducts.length);
    for (let i = 0; i < preloadCount; i++) {
      const product = filteredProducts[i];
      if (product.imageUrl && !product.imageUrl.includes('placehold.co')) {
        const img = new window.Image();
        img.src = product.imageUrl;
      }
    }
  }, [filteredProducts]);

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
                        <div className="relative group/cat">
                          <button
                            onClick={() => {
                              if (cat.link) {
                                window.location.href = cat.link;
                              } else {
                                handleCategoryChange(cat.name);
                              }
                            }}
                            className={`flex items-center gap-3 p-1.5 pr-6 rounded-full border transition-all duration-300 min-w-[140px] ${activeCategory === cat.name
                              ? 'bg-brand-green border-brand-green text-white shadow-lg shadow-brand-green/20'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-brand-green/50 hover:shadow-md'
                              }`}
                          >
                            <div className="relative w-10 h-10 shrink-0">
                              <Image
                                src={cat.image}
                                alt={cat.name}
                                fill
                                className={`object-cover rounded-full ring-2 ${activeCategory === cat.name ? 'ring-white/30' : 'ring-white dark:ring-slate-900 group-hover/cat:ring-brand-green/20'}`}
                              />
                              {/* Image Action Button - Centered Over Image */}
                              {cat.name !== 'All' && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openImageModal(cat.image, cat.name, 'Category');
                                  }}
                                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover/cat:bg-black/50 opacity-0 group-hover/cat:opacity-100 transition-all duration-200 cursor-pointer"
                                  title="Download or copy image"
                                >
                                  <Download className="w-4 h-4 text-white drop-shadow-lg" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-start text-left">
                              <span className="font-bold text-sm leading-tight">{cat.name}</span>
                              <span className={`text-[10px] font-medium leading-none ${activeCategory === cat.name ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                collection
                              </span>
                            </div>
                          </button>
                        </div>
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
                <div key={cat.name} className="relative flex-shrink-0 group/mcat">
                  <button
                    onClick={() => {
                      if (cat.link) {
                        window.location.href = cat.link;
                      } else {
                        handleCategoryChange(cat.name);
                      }
                    }}
                    className={`flex items-center gap-3 p-1.5 pr-5 rounded-full border transition-all duration-300 ${activeCategory === cat.name
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
                      {/* Centered Overlay Button */}
                      {cat.name !== 'All' && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openImageModal(cat.image, cat.name, 'Category');
                          }}
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover/mcat:bg-black/50 opacity-0 group-hover/mcat:opacity-100 transition-all duration-200 cursor-pointer"
                          title="Download or copy image"
                        >
                          <Download className="w-3.5 h-3.5 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-xs whitespace-nowrap">{cat.name}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Mobile Sub-category Filters (Only if categories exist) */}
            {subCategories.length > 0 && (
              <div className="md:hidden mt-2 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  onClick={() => handleSubCategoryChange('All')}
                  className={`flex-shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSubCategory === 'All'
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  All {activeCategory}
                </button>
                {subCategories.map(sub => (
                  <div key={sub.name} className="relative flex-shrink-0 group/msub">
                    <button
                      onClick={() => handleSubCategoryChange(sub.name)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeSubCategory === sub.name
                        ? 'bg-brand-green text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                      <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0">
                        <Image src={sub.image} alt={sub.name} fill className="object-cover" />
                        {/* Centered Overlay Button */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openImageModal(sub.image, sub.name, `${activeCategory} / Subcategory`);
                          }}
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover/msub:bg-black/50 opacity-0 group-hover/msub:opacity-100 transition-all duration-200 cursor-pointer"
                          title="Download or copy image"
                        >
                          <Download className="w-2 h-2 text-white drop-shadow-lg" />
                        </div>
                      </div>
                      {sub.name}
                    </button>
                  </div>
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
                <div className="h-full w-full flex items-center justify-center gap-2.5 px-6 bg-gradient-to-tr from-brand-green to-brand-green-dark text-white rounded-full shadow-lg shadow-brand-green/20 hover:shadow-brand-green/30 transition-all border border-white/10 pointer-events-none">
                  <FileSpreadsheet className="h-6 w-6" />
                  <span className="text-base font-bold">Select</span>
                </div>
              </DockIcon>
            ) : (
              <>
                <div className="px-4 flex items-center justify-center h-full pointer-events-none">
                  <span className="text-base font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-full whitespace-nowrap border border-slate-200 dark:border-slate-700 shadow-inner">
                    {selectedProducts.size} <span className="text-slate-500 font-medium text-sm ml-1">selected</span>
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1 self-center pointer-events-none" />
                <DockIcon onClick={toggleSelectionMode} className="cursor-pointer" magnification={60} distance={100}>
                  <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 pointer-events-none">
                    <X className="h-5 w-5" />
                  </div>
                </DockIcon>
                <DockIcon onClick={handleExport} className="cursor-pointer !w-auto !aspect-auto min-w-44" magnification={70} distance={100}>
                  <div className={`h-full w-full flex items-center justify-center gap-2.5 px-6 rounded-full transition-all border pointer-events-none ${selectedProducts.size > 0
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
                  onClick={() => handleSubCategoryChange('All')}
                  className={`w-full text-center px-3 py-2 rounded-xl text-xs font-medium transition-colors ${activeSubCategory === 'All'
                    ? 'bg-brand-green text-white shadow-md shadow-brand-green/20'
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  All {activeCategory}
                </button>
                {subCategories.map(sub => (
                  <div key={sub.name} className="relative group/sub">
                    <button
                      onClick={() => handleSubCategoryChange(sub.name)}
                      className={`w-full flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-all duration-300 ${activeSubCategory === sub.name
                        ? 'bg-white dark:bg-slate-800 border-2 border-brand-green shadow-md scale-105 z-10'
                        : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:scale-105'
                        }`}
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-sm group-hover/sub:shadow-md transition-shadow">
                        <Image
                          src={sub.image}
                          alt={sub.name}
                          fill
                          className={`object-cover transition-transform duration-500 group-hover/sub:scale-110 ${activeSubCategory === sub.name ? 'scale-110' : ''}`}
                        />
                        {/* Centered Overlay Button */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openImageModal(sub.image, sub.name, `${activeCategory} / Subcategory`);
                          }}
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover/sub:bg-black/50 opacity-0 group-hover/sub:opacity-100 transition-all duration-200 cursor-pointer"
                          title="Download or copy image"
                        >
                          <Download className="w-4 h-4 text-white drop-shadow-lg" />
                        </div>
                      </div>
                      <span className={`text-[11px] font-medium leading-tight text-center ${activeSubCategory === sub.name ? 'text-brand-green font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                        {sub.name}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )
        }

        {/* Product Grid */}
        <div className="flex-1">
          {/* Loading State - Beautiful animated skeleton */}
          {isLoading && (
            <div className="space-y-8">
              {/* Loading Header */}
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-brand-green/10 to-emerald-500/10 rounded-full">
                  <div className="relative">
                    <div className="w-6 h-6 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />
                  </div>
                  <span className="text-brand-green font-medium">Loading your product library...</span>
                </div>
              </div>

              {/* Skeleton Grid */}
              <div className={`grid grid-cols-2 ${activeCategory !== 'All' ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'} gap-6`}>
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-slate-200 dark:bg-slate-800 rounded-2xl mb-3" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-16 mb-2" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-full mb-1" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Grid - Only show when not loading */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className={`grid grid-cols-2 ${activeCategory !== 'All' ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'} gap-6`}>
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedProducts.has(product.id)}
                  onToggle={() => handleProductToggle(product.id)}
                  priority={index < 20}
                />
              ))}
            </div>
          )}

          {/* Empty State - Only show when not loading AND no products */}
          {!isLoading && filteredProducts.length === 0 && (
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

      {/* Image Action Modal */}
      {imageModalData && (
        <ImageActionModal
          isOpen={imageModalOpen}
          onClose={closeImageModal}
          imageUrl={imageModalData.imageUrl}
          title={imageModalData.title}
          subtitle={imageModalData.subtitle}
        />
      )}
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
