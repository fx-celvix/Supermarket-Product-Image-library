import { createClient } from "@/utils/supabase/server";
import { ProductForm } from "@/components/dashboard/product-form";
import { notFound } from "next/navigation";

export default async function EditProductPage({ params }: { params: { id: string } }) {
    // Wait for params to be available
    const { id } = await params;

    if (!id) return notFound();

    const supabase = await createClient();
    const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !product) {
        return notFound();
    }

    return (
        <ProductForm
            initialData={product}
            isEditMode={true}
        />
    );
}
