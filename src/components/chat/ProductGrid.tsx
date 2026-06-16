import { ProductCard } from "@/components/chat/ProductCard";
import type { Product } from "@/types/chat";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <ProductCard key={`${product.name}-${i}`} product={product} index={i} />
      ))}
    </div>
  );
}
