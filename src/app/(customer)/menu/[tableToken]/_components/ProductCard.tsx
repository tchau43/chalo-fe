// src/app/(customer)/menu/[tableToken]/_components/ProductCard.tsx
import { ProductDto } from "@/services/menu";

interface ProductCardProps {
  product: ProductDto;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const isUnavailable = product.status !== "AVAILABLE" || !product.isActive;
  return (
    <div
      className={`flex gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100 transition-opacity
    ${isUnavailable ? "opacity-50" : ""}`}
    >
      {/* image */}
      <div className="relative shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="size-20 rounded-xl object-cover"
          />
        ) : (
          <div className="size-20 rounded-xl bg-brand-50 flex items-center justify-center text-3xl">
            ☕
          </div>
        )}
        {isUnavailable && (
          <div className="absolute inset-0 rounded-xl bg-white/60 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500 bg-white/90 rounded-full px-2 py-0.5">
              {product.status === "OUT_OF_STOCK" ? "Hết hàng" : "Tạm ngưng"}
            </span>
          </div>
        )}
      </div>
      {/* info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm leading-snug truncate">
          {product.name}
        </p>
        {product.description && (
          <p className="mt-0.5 text-xs text-gray-400 line-clamp-2">
            {product.description}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-brand-600">
            {product.price.toLocaleString("vi-VN")}đ
          </span>
          {!isUnavailable && (
            <button className="flex size-7 items-center justify-center rounded-full bg-brand-400 text-white text-lg font-medium hover:bg-brand-500 active:bg-brand-600 transition-colors shadow-sm shadow-brand-400/40">
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
