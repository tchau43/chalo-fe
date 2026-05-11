"use client";
// src/app/(customer)/menu/[tableToken]/_components/CustomerMenuClient.tsx
import { CategoryDto, ProductDto } from "@/services/menu";
import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";
import { useParams, useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart.store";
interface CustomerMenuClientProps {
  tableName: string;
  categories: CategoryDto[];
  initProducts: ProductDto[];
}

export const CustomerMenuClient = ({
  categories,
  initProducts,
  tableName,
}: CustomerMenuClientProps) => {

  const { tableToken } = useParams<{ tableToken: string }>();
  const router = useRouter();
  const [activeCateId, setActiveCateId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");

  const itemCount = useCartStore((s) => s.getItemCount());
  const addItem = useCartStore((s) => s.addItem);

  const filterProduct = useMemo(() => {
    let list = initProducts;
    if (activeCateId) list = list.filter((p) => p.categoryId === activeCateId);
    if (search)
      list = list.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      );

    return list;
  }, [initProducts, activeCateId, search]);

  const grouped = useMemo(() => {
    if (activeCateId || search) return null;
    return categories
      .map((cat) => ({
        category: cat,
        products: initProducts.filter((p) => p.categoryId === cat.id),
      }))
      .filter((g) => g.products.length > 0);
  }, [search, activeCateId, initProducts, categories]);

  const handleAddToCart = (product: ProductDto, quantity: number) => {
    addItem(
      {
        productId: product.id,
        price: product.price,
        productImageUrl: product.imageUrl,
        productName: product.name,
      },
      quantity,
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-brand-400 text-base shadow-sm">
            ☕
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">
              Chalo Coffee
            </p>
            <p className="text-xs text-gray-400">{tableName}</p>
          </div>
        </div>

        {/* search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm món..."
              className="w-full rounded-full border border-gray-200 bg-gray-50 pl-9 pr-4 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCateId(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors
              ${
                !activeCateId
                  ? "bg-brand-400 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            Tất cả
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() =>
                setActiveCateId(activeCateId === c.id ? null : c.id)
              }
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors
              ${
                activeCateId === c.id
                  ? "bg-brand-400 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </header>

      {/* menu content */}
      <main className="pb-32">
        {activeCateId || search ? (
          <div className="px-4 pt-4 space-y-3">
            {filterProduct.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <p className="text-4xl mb-3">☕</p>
                <p className="text-sm">Không tìm thấy món phù hợp</p>
              </div>
            ) : (
              filterProduct.map((p) => (
                <ProductCard
                  product={p}
                  key={p.id}
                  onAddToCart={(quantity) => handleAddToCart(p, quantity)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {grouped?.map(({ category, products }) => (
              <section key={category.id}>
                <h2 className="px-4 text-base font-bold text-gray-900 mb-3">
                  {category.name}
                </h2>
                <div className="px-4 space-y-3">
                  {products.map((p) => (
                    <ProductCard
                      product={p}
                      key={p.id}
                      onAddToCart={(quantity) => handleAddToCart(p, quantity)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      {/* bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 safe-area-pb">
        <button
          onClick={() => router.push(`/menu/${tableToken}/cart`)}
          disabled={itemCount === 0}
          className="w-full rounded-2xl bg-brand-400 py-3.5 text-sm font-semibold text-white hover:bg-brand-500 active:bg-brand-600 transition-colors shadow-sm shadow-brand-400/30"
        >
          {itemCount > 0 ? (
            <>
              <span className="flex size-5 items-center justify-center rounded-full bg-white text-brand-600 text-xs font-bold">
                {itemCount}
              </span>
            </>
          ) : (
            "Chưa có món"
          )}
        </button>
      </div>
    </div>
  );
};
