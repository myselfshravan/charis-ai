export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
}

/** A turn sent to the backend — only the fields the model needs. */
export interface ChatTurn {
  role: Role;
  content: string;
}

/** Shape returned by the backend `sendMessage` call. */
export interface ChatResult {
  content: string;
}

/** A product the agent surfaced from the catalog (parsed from its reply). */
export interface Product {
  name: string;
  brand?: string | null;
  price?: number | null;
  original_price?: number | null;
  discount_pct?: number | null;
  image?: string | null;
  url?: string | null;
}
