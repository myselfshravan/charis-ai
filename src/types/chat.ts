export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  /** Latency of the API call, in ms — set on assistant messages only. */
  durationMs?: number;
}

/** A persisted chat conversation (one per "New chat"). */
export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
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
