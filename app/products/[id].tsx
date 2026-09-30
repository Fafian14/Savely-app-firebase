import { productos } from "@/store/products.store";
export { default } from "@/components/ProductDetail";
export function generateStaticParams() {
  return productos.map((p) => ({ id: String(p.id) }));
}
