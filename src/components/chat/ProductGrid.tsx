import { ProductCard } from "@/components/chat/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types/chat";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className={GRID}>
      {products.map((product, i) => (
        <ProductCard key={`${product.name}-${i}`} product={product} index={i} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={GRID}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skeleton className="aspect-[3/4] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-2 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-1 h-9 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
