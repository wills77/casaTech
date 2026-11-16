export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  image_url: string;
  description: string;
  is_active: number;
  sort_order: number;
  subcategories?: Category[];
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  is_active: number;
}

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductVariant {
  name: string;
  options: string[];
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  slug: string;
  brand_id: number | null;
  brand_name: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  subcategory_id: number | null;
  subcategory_name: string | null;
  subcategory_slug: string | null;
  price_mad: number;
  promo_price_mad: number | null;
  effective_price_mad: number;
  discount_percent: number;
  stock: number;
  short_desc: string;
  description: string;
  specs: ProductSpec[];
  images: string[];
  variants: ProductVariant[];
  is_published: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_featured: boolean;
  sales_count: number;
  is_demo: boolean;
  created_at: string;
  avg_rating: number;
  review_count: number;
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number | null;
  author_name: string;
  rating: number;
  comment: string;
  is_verified: number;
  created_at: string;
}

export interface User {
  id: number;
  username: string | null;
  email: string;
  role: 'customer' | 'admin';
  full_name: string;
  phone: string;
  is_suspended: number;
  must_change_password: number;
}

export interface Address {
  id: number;
  user_id: number;
  label: string;
  full_name: string;
  phone: string;
  city: string;
  neighborhood: string;
  street_address: string;
  is_default: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  variant_label: string;
  unit_price_mad: number;
  quantity: number;
  line_total_mad: number;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  city: string;
  neighborhood: string;
  shipping_address: string;
  notes: string;
  delivery_method: string;
  payment_method: string;
  subtotal_mad: number;
  discount_mad: number;
  shipping_fee_mad: number;
  total_mad: number;
  status: 'En attente' | 'Confirmée' | 'En préparation' | 'Expédiée' | 'Livrée' | 'Annulée';
  created_at: string;
  items?: OrderItem[];
}

export interface CartItem {
  product_id: number;
  slug: string;
  name: string;
  image: string;
  unit_price_mad: number;
  quantity: number;
  variant_label: string;
  stock: number;
}

export interface DeliveryZone {
  city: string;
  fee: number;
  delay: string;
}

export interface SiteSettings {
  store_name: string;
  slogan: string;
  logo_text: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  store_address: string;
  casablanca_shipping_fee: number;
  other_cities_shipping_fee: number;
  free_shipping_threshold: number;
  pickup_enabled: boolean;
  delivery_zones: DeliveryZone[];
  hero_title: string;
  hero_subtitle: string;
  hero_cta: string;
  hero_image: string;
  social_instagram: string;
  social_facebook: string;
  social_linkedin: string;
  terms_content: string;
  privacy_content: string;
  payment_gateway_enabled: boolean;
}
