import { motion } from "framer-motion";
import { ImageOff, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { discountPct, formatINR } from "@/lib/products";
import type { Product } from "@/types/chat";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const pct = discountPct(product);
  const hasOriginal =
    product.original_price != null && product.price != null && product.original_price > product.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.05, 0.4), ease: "easeOut" }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
        {pct != null && (
          <Badge className="absolute left-2 top-2 border-0 bg-primary/95 px-2 py-0.5 text-[11px] font-bold shadow-md backdrop-blur">
            {pct}% OFF
          </Badge>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="flex flex-1 flex-col p-3">
        {product.brand && (
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {product.brand}
          </p>
        )}
        <p className="mt-0.5 line-clamp-2 text-[13px] font-medium leading-snug">{product.name}</p>

        <div className="mt-2 flex items-baseline gap-1.5">
          {product.price != null && (
            <span className="text-sm font-bold">{formatINR(product.price)}</span>
          )}
          {hasOriginal && (
            <span className="text-xs text-muted-foreground line-through">
              {formatINR(product.original_price!)}
            </span>
          )}
        </div>

        {product.url && (
          <Button asChild size="sm" className="mt-3 h-9 w-full rounded-xl text-xs font-semibold">
            <a href={product.url} target="_blank" rel="noopener noreferrer">
              <ShoppingBag className="h-3.5 w-3.5" />
              Buy now
            </a>
          </Button>
        )}
      </div>
    </motion.div>
  );
}
