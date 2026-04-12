export type SellerStatus = "active" | "pending" | "suspended";

/** İade adedi bu değerden fazlaysa (>) satıcı adı yanında kırmızı uyarı gösterilir */
export const SELLER_RETURN_WARNING_THRESHOLD = 5;

export function isHighReturnCount(returnCount: number): boolean {
  return returnCount > SELLER_RETURN_WARNING_THRESHOLD;
}

export type Seller = {
  id: string;
  storeName: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  status: SellerStatus;
  totalSales: number;
  orderCount: number;
  /** Dönem içi iade adedi (sipariş bazlı; eşik üstü uyarı için) */
  returnCount: number;
  returnRate: number;
  rating: number;
  registeredAt: string;
};
