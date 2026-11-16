import { Router } from 'express';
import { z } from 'zod';
import { db } from './db.ts';
import {
  type AuthedRequest,
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  createSession,
  deleteSession,
  hashPassword,
  logAudit,
  optionalAuth,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  verifyPassword,
} from './security.ts';

export const apiRouter = Router();

function getSettingsMap(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM site_settings').all() as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface RawProduct {
  id: number;
  sku: string;
  name: string;
  slug: string;
  brand_id: number | null;
  brand_name?: string | null;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  subcategory_id: number | null;
  subcategory_name?: string | null;
  subcategory_slug?: string | null;
  price_mad: number;
  promo_price_mad: number | null;
  stock: number;
  short_desc: string;
  description: string;
  specs_json: string;
  images_json: string;
  variants_json: string;
  is_published: number;
  is_new: number;
  is_bestseller: number;
  is_featured: number;
  sales_count: number;
  is_demo: number;
  created_at: string;
  avg_rating?: number;
  review_count?: number;
}

function formatProduct(row: RawProduct) {
  const price = Number(row.price_mad);
  const promo = row.promo_price_mad !== null && row.promo_price_mad < price ? Number(row.promo_price_mad) : null;
  const discountPercent = promo !== null ? Math.round(((price - promo) / price) * 100) : 0;
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    slug: row.slug,
    brand_id: row.brand_id,
    brand_name: row.brand_name || 'Générique',
    category_id: row.category_id,
    category_name: row.category_name || '',
    category_slug: row.category_slug || '',
    subcategory_id: row.subcategory_id,
    subcategory_name: row.subcategory_name || null,
    subcategory_slug: row.subcategory_slug || null,
    price_mad: price,
    promo_price_mad: promo,
    effective_price_mad: promo ?? price,
    discount_percent: discountPercent,
    stock: row.stock,
    short_desc: row.short_desc,
    description: row.description,
    specs: JSON.parse(row.specs_json || '[]'),
    images: JSON.parse(row.images_json || '[]'),
    variants: JSON.parse(row.variants_json || '[]'),
    is_published: row.is_published === 1,
    is_new: row.is_new === 1,
    is_bestseller: row.is_bestseller === 1,
    is_featured: row.is_featured === 1,
    sales_count: row.sales_count,
    is_demo: row.is_demo === 1,
    created_at: row.created_at,
    avg_rating: row.avg_rating ? Number(Number(row.avg_rating).toFixed(1)) : 0,
    review_count: row.review_count || 0,
  };
}

function calculateShippingFee(
  settings: Record<string, string>,
  subtotalAfterDiscount: number,
  deliveryMethod: string,
  city: string
): number {
  if (deliveryMethod === 'Retrait en boutique') {
    return 0;
  }
  const threshold = Number(settings.free_shipping_threshold || '2500');
  if (subtotalAfterDiscount >= threshold) {
    return 0;
  }
  try {
    const zones = JSON.parse(settings.delivery_zones || '[]') as Array<{ city: string; fee: number }>;
    const matched = zones.find((z) => z.city.toLowerCase() === city.toLowerCase());
    if (matched) return Number(matched.fee);
  } catch {
    // ignore
  }
  if (city.toLowerCase().includes('casablanca')) {
    return Number(settings.casablanca_shipping_fee || '30');
  }
  return Number(settings.other_cities_shipping_fee || '55');
}

function calculateServerCart(
  items: Array<{ product_id: number; quantity: number; variant_label?: string }>,
  promoCode?: string,
  deliveryMethod = 'Livraison à domicile à Casablanca',
  city = 'Casablanca'
) {
  const settings = getSettingsMap();
  if (deliveryMethod === 'Retrait en boutique' && settings.pickup_enabled !== 'true') {
    throw new Error("Le retrait en boutique n'est pas activé actuellement.");
  }

  const lineItems: Array<{
    product_id: number;
    product_name: string;
    sku: string;
    variant_label: string;
    unit_price_mad: number;
    quantity: number;
    line_total_mad: number;
    available_stock: number;
  }> = [];

  let subtotalMad = 0;

  for (const item of items) {
    const prod = db
      .prepare('SELECT id, sku, name, price_mad, promo_price_mad, stock, is_published FROM products WHERE id = ?')
      .get(item.product_id) as
      | {
          id: number;
          sku: string;
          name: string;
          price_mad: number;
          promo_price_mad: number | null;
          stock: number;
          is_published: number;
        }
      | undefined;

    if (!prod || prod.is_published !== 1) {
      throw new Error(`Le produit #${item.product_id} est indisponible.`);
    }
    if (prod.stock < item.quantity) {
      throw new Error(`Stock insuffisant pour "${prod.name}" (disponible : ${prod.stock}).`);
    }

    const unitPrice =
      prod.promo_price_mad !== null && prod.promo_price_mad < prod.price_mad
        ? Number(prod.promo_price_mad)
        : Number(prod.price_mad);
    const lineTotal = unitPrice * item.quantity;
    subtotalMad += lineTotal;

    lineItems.push({
      product_id: prod.id,
      product_name: prod.name,
      sku: prod.sku,
      variant_label: item.variant_label || '',
      unit_price_mad: unitPrice,
      quantity: item.quantity,
      line_total_mad: lineTotal,
      available_stock: prod.stock,
    });
  }

  let discountMad = 0;
  let appliedPromoCode: string | null = null;

  if (promoCode && promoCode.trim().length > 0) {
    const codeUpper = promoCode.trim().toUpperCase();
    const nowIso = new Date().toISOString();
    const promo = db
      .prepare(
        `SELECT * FROM promotions
         WHERE UPPER(code) = ? AND is_active = 1 AND starts_at <= ? AND ends_at >= ?`
      )
      .get(codeUpper, nowIso, nowIso) as
      | {
          id: number;
          code: string;
          discount_percent: number;
          product_ids_json: string;
        }
      | undefined;

    if (promo) {
      const targetIds = JSON.parse(promo.product_ids_json || '[]') as number[];
      const eligibleSubtotal =
        targetIds.length === 0
          ? subtotalMad
          : lineItems
              .filter((li) => targetIds.includes(li.product_id))
              .reduce((sum, li) => sum + li.line_total_mad, 0);

      if (eligibleSubtotal > 0) {
        discountMad = Math.round((eligibleSubtotal * Number(promo.discount_percent)) / 100);
        appliedPromoCode = promo.code;
      }
    }
  }

  const afterDiscount = Math.max(0, subtotalMad - discountMad);
  const shippingFeeMad = calculateShippingFee(settings, afterDiscount, deliveryMethod, city);
  const totalMad = afterDiscount + shippingFeeMad;

  return {
    lineItems,
    subtotalMad,
    discountMad,
    appliedPromoCode,
    shippingFeeMad,
    totalMad,
    freeShippingThreshold: Number(settings.free_shipping_threshold || '2500'),
  };
}

// ======================= PUBLIC STOREFRONT ROUTES =======================

apiRouter.get('/settings', (_req, res) => {
  const s = getSettingsMap();
  res.json({
    store_name: s.store_name || 'CasaTech',
    slogan: s.slogan || 'Toute la technologie, au même endroit.',
    logo_text: s.logo_text || 'CasaTech',
    contact_email: s.contact_email || 'contact@casatech.ma',
    contact_phone: s.contact_phone || '',
    whatsapp_number: s.whatsapp_number || '',
    store_address: s.store_address || '',
    casablanca_shipping_fee: Number(s.casablanca_shipping_fee || '30'),
    other_cities_shipping_fee: Number(s.other_cities_shipping_fee || '55'),
    free_shipping_threshold: Number(s.free_shipping_threshold || '2500'),
    pickup_enabled: s.pickup_enabled === 'true',
    delivery_zones: JSON.parse(s.delivery_zones || '[]'),
    hero_title: s.hero_title || '',
    hero_subtitle: s.hero_subtitle || '',
    hero_cta: s.hero_cta || 'Découvrir nos produits',
    hero_image: s.hero_image || '',
    social_instagram: s.social_instagram || '',
    social_facebook: s.social_facebook || '',
    social_linkedin: s.social_linkedin || '',
    terms_content: s.terms_content || '',
    privacy_content: s.privacy_content || '',
    payment_gateway_enabled: s.payment_gateway_enabled === 'true',
  });
});

apiRouter.get('/categories', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC')
    .all() as Array<{
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    image_url: string;
    description: string;
    is_active: number;
    sort_order: number;
  }>;

  const parents = rows.filter((r) => r.parent_id === null);
  const tree = parents.map((p) => ({
    ...p,
    subcategories: rows.filter((c) => c.parent_id === p.id),
  }));

  res.json({ flat: rows, tree });
});

apiRouter.get('/brands', (_req, res) => {
  const rows = db.prepare('SELECT * FROM brands WHERE is_active = 1 ORDER BY name ASC').all();
  res.json(rows);
});

apiRouter.get('/products', (req, res) => {
  const {
    category,
    subcategory,
    brand,
    minPrice,
    maxPrice,
    inStock,
    promo,
    isNew,
    bestseller,
    featured,
    q,
    sort = 'popular',
  } = req.query as Record<string, string | undefined>;

  const where: string[] = ['p.is_published = 1'];
  const params: Array<string | number> = [];

  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (subcategory) {
    where.push('sc.slug = ?');
    params.push(subcategory);
  }
  if (brand) {
    where.push('b.slug = ?');
    params.push(brand);
  }
  if (minPrice && !Number.isNaN(Number(minPrice))) {
    where.push('COALESCE(p.promo_price_mad, p.price_mad) >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice && !Number.isNaN(Number(maxPrice))) {
    where.push('COALESCE(p.promo_price_mad, p.price_mad) <= ?');
    params.push(Number(maxPrice));
  }
  if (inStock === 'true') {
    where.push('p.stock > 0');
  }
  if (promo === 'true') {
    where.push('p.promo_price_mad IS NOT NULL AND p.promo_price_mad < p.price_mad');
  }
  if (isNew === 'true') {
    where.push('p.is_new = 1');
  }
  if (bestseller === 'true') {
    where.push('p.is_bestseller = 1');
  }
  if (featured === 'true') {
    where.push('p.is_featured = 1');
  }
  if (q && q.trim().length > 0) {
    const term = `%${q.trim().toLowerCase()}%`;
    where.push(
      '(LOWER(p.name) LIKE ? OR LOWER(p.short_desc) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(COALESCE(b.name, "")) LIKE ? OR LOWER(c.name) LIKE ?)'
    );
    params.push(term, term, term, term, term);
  }

  let orderBy = 'p.sales_count DESC, p.id DESC';
  if (sort === 'price_asc') orderBy = 'COALESCE(p.promo_price_mad, p.price_mad) ASC';
  else if (sort === 'price_desc') orderBy = 'COALESCE(p.promo_price_mad, p.price_mad) DESC';
  else if (sort === 'newest') orderBy = 'p.is_new DESC, p.created_at DESC, p.id DESC';

  const sql = `
    SELECT p.*,
      b.name as brand_name,
      c.name as category_name, c.slug as category_slug,
      sc.name as subcategory_name, sc.slug as subcategory_slug,
      (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id) as avg_rating,
      (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) as review_count
    FROM products p
    LEFT JOIN brands b ON b.id = p.brand_id
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN categories sc ON sc.id = p.subcategory_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
  `;

  const rows = db.prepare(sql).all(...params) as unknown as RawProduct[];
  res.json(rows.map(formatProduct));
});

apiRouter.get('/products/:slug', (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*,
        b.name as brand_name,
        c.name as category_name, c.slug as category_slug,
        sc.name as subcategory_name, sc.slug as subcategory_slug,
        (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) as review_count
       FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories sc ON sc.id = p.subcategory_id
       WHERE p.slug = ? AND p.is_published = 1`
    )
    .get(req.params.slug) as unknown as RawProduct | undefined;

  if (!row) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }

  const reviews = db
    .prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC')
    .all(row.id);

  const similarRows = db
    .prepare(
      `SELECT p.*,
        b.name as brand_name,
        c.name as category_name, c.slug as category_slug,
        sc.name as subcategory_name, sc.slug as subcategory_slug,
        (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id) as avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) as review_count
       FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories sc ON sc.id = p.subcategory_id
       WHERE p.category_id = ? AND p.id != ? AND p.is_published = 1
       ORDER BY p.sales_count DESC
       LIMIT 4`
    )
    .all(row.category_id, row.id) as unknown as RawProduct[];

  res.json({
    product: formatProduct(row),
    reviews,
    similar: similarRows.map(formatProduct),
  });
});

apiRouter.post('/products/:id/reviews', optionalAuth, (req: AuthedRequest, res) => {
  const schema = z.object({
    author_name: z.string().trim().min(2).max(80).optional(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(5).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Avis invalide. Vérifiez la note et le commentaire.' });
    return;
  }

  const productId = Number(req.params.id);
  const prod = db.prepare('SELECT id FROM products WHERE id = ? AND is_published = 1').get(productId);
  if (!prod) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }

  const authorName = req.user ? req.user.full_name : parsed.data.author_name || 'Client CasaTech';
  const info = db
    .prepare(
      'INSERT INTO reviews (product_id, user_id, author_name, rating, comment, is_verified) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(productId, req.user?.id ?? null, authorName, parsed.data.rating, parsed.data.comment, req.user ? 1 : 0);

  const created = db.prepare('SELECT * FROM reviews WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

apiRouter.post('/newsletter', (req, res) => {
  const schema = z.object({
    email: z.string().trim().email(),
    consent: z.literal(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Veuillez saisir un e-mail valide et accepter le consentement.' });
    return;
  }
  db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email, consent) VALUES (?, 1)').run(
    parsed.data.email.toLowerCase()
  );
  res.status(201).json({ message: 'Inscription confirmée à la newsletter CasaTech.' });
});

apiRouter.post('/contact', (req, res) => {
  const schema = z.object({
    full_name: z.string().trim().min(2).max(100),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).optional().default(''),
    subject: z.string().trim().min(2).max(150),
    message: z.string().trim().min(10).max(2000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Veuillez remplir tous les champs requis du formulaire.' });
    return;
  }

  db.prepare(
    'INSERT INTO contact_messages (full_name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)'
  ).run(parsed.data.full_name, parsed.data.email, parsed.data.phone, parsed.data.subject, parsed.data.message);

  res.status(201).json({ message: 'Votre message a bien été transmis à notre équipe à Casablanca.' });
});

// Server-side cart quote (recalculates prices, promo codes, shipping fee, stock availability)
apiRouter.post('/cart/quote', (req, res) => {
  const schema = z.object({
    items: z
      .array(
        z.object({
          product_id: z.number().int().positive(),
          quantity: z.number().int().min(1).max(50),
          variant_label: z.string().optional(),
        })
      )
      .min(1),
    promo_code: z.string().optional(),
    delivery_method: z.string().optional(),
    city: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Panier invalide.' });
    return;
  }
  try {
    const quote = calculateServerCart(
      parsed.data.items,
      parsed.data.promo_code,
      parsed.data.delivery_method || 'Livraison à domicile à Casablanca',
      parsed.data.city || 'Casablanca'
    );
    res.json(quote);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de calcul du panier.';
    res.status(400).json({ error: msg });
  }
});

// Create Order (100% server-side price/shipping recalculation + transactional stock deduction)
apiRouter.post('/orders', optionalAuth, (req: AuthedRequest, res) => {
  const schema = z.object({
    customer_name: z.string().trim().min(2).max(120),
    customer_phone: z.string().trim().min(8).max(30),
    customer_email: z.string().trim().email(),
    city: z.string().trim().min(2).max(80),
    neighborhood: z.string().trim().max(100).optional().default(''),
    shipping_address: z.string().trim().min(4).max(300),
    notes: z.string().trim().max(500).optional().default(''),
    delivery_method: z.enum(['Livraison à domicile à Casablanca', 'Livraison Maroc', 'Retrait en boutique']),
    payment_method: z.enum(['COD', 'ONLINE']),
    promo_code: z.string().optional(),
    items: z
      .array(
        z.object({
          product_id: z.number().int().positive(),
          quantity: z.number().int().min(1).max(50),
          variant_label: z.string().optional().default(''),
        })
      )
      .min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Informations de commande incomplètes ou invalides.' });
    return;
  }

  const settings = getSettingsMap();
  if (parsed.data.payment_method === 'ONLINE' && settings.payment_gateway_enabled !== 'true') {
    res.status(400).json({
      error:
        "Le paiement en ligne par carte bancaire marocaine (CMI / Payzone) n'est pas encore activé. Veuillez choisir le paiement à la livraison (COD).",
    });
    return;
  }

  try {
    db.exec('BEGIN IMMEDIATE');
    const quote = calculateServerCart(
      parsed.data.items,
      parsed.data.promo_code,
      parsed.data.delivery_method,
      parsed.data.city
    );

    const year = new Date().getFullYear();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `CT-${year}-${randomPart}`;

    const ordInfo = db
      .prepare(
        `INSERT INTO orders (
          order_number, user_id, customer_name, customer_phone, customer_email,
          city, neighborhood, shipping_address, notes, delivery_method, payment_method,
          subtotal_mad, discount_mad, shipping_fee_mad, total_mad, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'En attente')`
      )
      .run(
        orderNumber,
        req.user?.id ?? null,
        parsed.data.customer_name,
        parsed.data.customer_phone,
        parsed.data.customer_email,
        parsed.data.city,
        parsed.data.neighborhood,
        parsed.data.shipping_address,
        parsed.data.notes,
        parsed.data.delivery_method,
        parsed.data.payment_method,
        quote.subtotalMad,
        quote.discountMad,
        quote.shippingFeeMad,
        quote.totalMad
      );

    const orderId = Number(ordInfo.lastInsertRowid);
    const insertItem = db.prepare(
      `INSERT INTO order_items (
        order_id, product_id, product_name, sku, variant_label, unit_price_mad, quantity, line_total_mad
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const updateStock = db.prepare(
      `UPDATE products SET stock = stock - ?, sales_count = sales_count + ?, updated_at = datetime('now') WHERE id = ?`
    );
    const insertMove = db.prepare(
      `INSERT INTO inventory_movements (product_id, delta, previous_stock, new_stock, reason, reference_id, actor_id)
       VALUES (?, ?, ?, ?, 'Commande client', ?, ?)`
    );

    for (const li of quote.lineItems) {
      insertItem.run(
        orderId,
        li.product_id,
        li.product_name,
        li.sku,
        li.variant_label,
        li.unit_price_mad,
        li.quantity,
        li.line_total_mad
      );
      updateStock.run(li.quantity, li.quantity, li.product_id);
      insertMove.run(
        li.product_id,
        -li.quantity,
        li.available_stock,
        li.available_stock - li.quantity,
        orderNumber,
        req.user?.id ?? null
      );
    }

    logAudit(req.user?.id ?? null, req.user?.role ?? 'guest', 'ORDER_CREATED', 'orders', orderId, {
      order_number: orderNumber,
      total_mad: quote.totalMad,
    });

    db.exec('COMMIT');

    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    res.status(201).json({ order: createdOrder, items });
  } catch (err: unknown) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    const msg = err instanceof Error ? err.message : 'Erreur lors de la création de la commande.';
    res.status(400).json({ error: msg });
  }
});

// ======================= AUTHENTICATION ROUTES =======================

apiRouter.post('/auth/register', (req, res) => {
  const schema = z.object({
    full_name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().min(8).max(30),
    city: z.string().trim().min(2).max(80).optional().default('Casablanca'),
    password: z.string().min(8).max(100),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Données invalides. Le mot de passe doit contenir au moins 8 caractères.' });
    return;
  }

  const emailLower = parsed.data.email.toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(emailLower);
  if (existing) {
    res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
    return;
  }

  const username = emailLower.split('@')[0] + '_' + Math.floor(100 + Math.random() * 900);
  const info = db
    .prepare(
      `INSERT INTO users (username, email, password_hash, role, full_name, phone, must_change_password)
       VALUES (?, ?, ?, 'customer', ?, ?, 0)`
    )
    .run(username, emailLower, hashPassword(parsed.data.password), parsed.data.full_name, parsed.data.phone);

  const userId = Number(info.lastInsertRowid);
  db.prepare('INSERT INTO customers (user_id, full_name, email, phone, city) VALUES (?, ?, ?, ?, ?)').run(
    userId,
    parsed.data.full_name,
    emailLower,
    parsed.data.phone,
    parsed.data.city
  );

  const { rawToken, expiresAt } = createSession(userId);
  setSessionCookie(res, rawToken, expiresAt);

  const user = db
    .prepare('SELECT id, username, email, role, full_name, phone, is_suspended, must_change_password FROM users WHERE id = ?')
    .get(userId);
  res.status(201).json({ user });
});

apiRouter.post('/auth/login', (req, res) => {
  const schema = z.object({
    identifier: z.string().trim().min(2).max(120),
    password: z.string().min(1).max(120),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
    return;
  }

  const idLower = parsed.data.identifier.toLowerCase();
  const userRow = db
    .prepare(
      `SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(COALESCE(username, '')) = ?`
    )
    .get(idLower, idLower) as
    | {
        id: number;
        username: string | null;
        email: string;
        password_hash: string;
        role: 'customer' | 'admin';
        full_name: string;
        phone: string;
        is_suspended: number;
        must_change_password: number;
      }
    | undefined;

  if (!userRow || !verifyPassword(parsed.data.password, userRow.password_hash)) {
    res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    return;
  }

  if (userRow.is_suspended === 1) {
    res.status(403).json({ error: 'Ce compte a été suspendu. Contactez le support CasaTech.' });
    return;
  }

  const { rawToken, expiresAt } = createSession(userRow.id);
  setSessionCookie(res, rawToken, expiresAt);
  logAudit(userRow.id, userRow.role, 'USER_LOGIN', 'users', userRow.id);

  res.json({
    user: {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      role: userRow.role,
      full_name: userRow.full_name,
      phone: userRow.phone,
      is_suspended: userRow.is_suspended,
      must_change_password: userRow.must_change_password,
    },
  });
});

apiRouter.post('/auth/logout', (req, res) => {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (rawToken && typeof rawToken === 'string') {
    deleteSession(rawToken);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

apiRouter.get('/auth/me', optionalAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user ?? null });
});

// ======================= CUSTOMER ACCOUNT ROUTES =======================

apiRouter.put('/account/profile', requireAuth, (req: AuthedRequest, res) => {
  const schema = z.object({
    full_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(30),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Nom complet et téléphone valides requis.' });
    return;
  }

  db.prepare("UPDATE users SET full_name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?").run(
    parsed.data.full_name,
    parsed.data.phone,
    req.user!.id
  );
  db.prepare('UPDATE customers SET full_name = ?, phone = ? WHERE user_id = ?').run(
    parsed.data.full_name,
    parsed.data.phone,
    req.user!.id
  );

  const updated = db
    .prepare('SELECT id, username, email, role, full_name, phone, is_suspended, must_change_password FROM users WHERE id = ?')
    .get(req.user!.id);
  res.json({ user: updated });
});

apiRouter.put('/account/password', requireAuth, (req: AuthedRequest, res) => {
  const schema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8).max(100),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
    return;
  }

  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as {
    password_hash: string;
  };
  if (!verifyPassword(parsed.data.current_password, row.password_hash)) {
    res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
    return;
  }

  db.prepare(
    "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?"
  ).run(hashPassword(parsed.data.new_password), req.user!.id);

  logAudit(req.user!.id, req.user!.role, 'PASSWORD_CHANGED', 'users', req.user!.id);
  res.json({ message: 'Mot de passe mis à jour avec succès.' });
});

apiRouter.get('/account/addresses', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC')
    .all(req.user!.id);
  res.json(rows);
});

apiRouter.post('/account/addresses', requireAuth, (req: AuthedRequest, res) => {
  const schema = z.object({
    label: z.string().trim().min(1).max(60),
    full_name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(8).max(30),
    city: z.string().trim().min(2).max(80),
    neighborhood: z.string().trim().max(100).optional().default(''),
    street_address: z.string().trim().min(4).max(300),
    is_default: z.boolean().optional().default(false),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Veuillez renseigner tous les champs de l’adresse.' });
    return;
  }
  if (parsed.data.is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user!.id);
  }
  const info = db
    .prepare(
      `INSERT INTO addresses (user_id, label, full_name, phone, city, neighborhood, street_address, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.id,
      parsed.data.label,
      parsed.data.full_name,
      parsed.data.phone,
      parsed.data.city,
      parsed.data.neighborhood,
      parsed.data.street_address,
      parsed.data.is_default ? 1 : 0
    );
  const created = db.prepare('SELECT * FROM addresses WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
});

apiRouter.delete('/account/addresses/:id', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user!.id);
  res.json({ ok: true });
});

apiRouter.get('/account/orders', requireAuth, (req: AuthedRequest, res) => {
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? OR LOWER(customer_email) = ? ORDER BY created_at DESC')
    .all(req.user!.id, req.user!.email.toLowerCase()) as Array<Record<string, unknown>>;

  const enriched = orders.map((o) => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(Number(o.id)),
  }));
  res.json(enriched);
});

apiRouter.get('/account/favorites', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, b.name as brand_name, c.name as category_name, c.slug as category_slug,
        sc.name as subcategory_name, sc.slug as subcategory_slug
       FROM favorites f
       JOIN products p ON p.id = f.product_id
       LEFT JOIN brands b ON b.id = p.brand_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories sc ON sc.id = p.subcategory_id
       WHERE f.user_id = ? AND p.is_published = 1
       ORDER BY f.created_at DESC`
    )
    .all(req.user!.id) as unknown as RawProduct[];
  res.json(rows.map(formatProduct));
});

apiRouter.post('/account/favorites/:productId', requireAuth, (req: AuthedRequest, res) => {
  const productId = Number(req.params.productId);
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)').run(req.user!.id, productId);
  res.status(201).json({ ok: true });
});

apiRouter.delete('/account/favorites/:productId', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(
    req.user!.id,
    Number(req.params.productId)
  );
  res.json({ ok: true });
});

// ======================= ADMIN ROUTES (/api/admin/*) =======================

apiRouter.get('/admin/dashboard', requireAdmin, (_req, res) => {
  const revenueRow = db
    .prepare("SELECT COALESCE(SUM(total_mad), 0) as revenue FROM orders WHERE status != 'Annulée'")
    .get() as { revenue: number };
  const totalOrders = (db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number }).cnt;
  const pendingOrders = (
    db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status IN ('En attente', 'Confirmée', 'En préparation', 'Expédiée')").get() as {
      cnt: number;
    }
  ).cnt;
  const deliveredOrders = (
    db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Livrée'").get() as { cnt: number }
  ).cnt;
  const cancelledOrders = (
    db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Annulée'").get() as { cnt: number }
  ).cnt;
  const totalCustomers = (
    db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'customer'").get() as { cnt: number }
  ).cnt;
  const totalProducts = (db.prepare('SELECT COUNT(*) as cnt FROM products').get() as { cnt: number }).cnt;
  const outOfStock = (db.prepare('SELECT COUNT(*) as cnt FROM products WHERE stock <= 0').get() as { cnt: number }).cnt;

  const salesSeries = db
    .prepare(
      `SELECT substr(created_at, 1, 10) as day,
        COUNT(*) as orders_count,
        COALESCE(SUM(CASE WHEN status != 'Annulée' THEN total_mad ELSE 0 END), 0) as revenue_mad
       FROM orders
       GROUP BY substr(created_at, 1, 10)
       ORDER BY day ASC
       LIMIT 30`
    )
    .all();

  const topProducts = db
    .prepare(
      `SELECT p.id, p.name, p.sku, p.price_mad, p.promo_price_mad, p.stock, p.sales_count,
        c.name as category_name
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ORDER BY p.sales_count DESC
       LIMIT 6`
    )
    .all();

  const latestOrders = db
    .prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8')
    .all();

  const recentActivity = db
    .prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 12')
    .all();

  res.json({
    kpis: {
      revenue_mad: Number(revenueRow.revenue),
      total_orders: totalOrders,
      total_customers: totalCustomers,
      total_products: totalProducts,
      out_of_stock: outOfStock,
      pending_orders: pendingOrders,
      delivered_orders: deliveredOrders,
      cancelled_orders: cancelledOrders,
    },
    sales_series: salesSeries,
    top_products: topProducts,
    latest_orders: latestOrders,
    recent_activity: recentActivity,
  });
});

apiRouter.get('/admin/products', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, b.name as brand_name, c.name as category_name, c.slug as category_slug,
        sc.name as subcategory_name, sc.slug as subcategory_slug
       FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id
       JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories sc ON sc.id = p.subcategory_id
       ORDER BY p.id DESC`
    )
    .all() as unknown as RawProduct[];
  res.json(rows.map(formatProduct));
});

const adminProductSchema = z.object({
  sku: z.string().trim().min(2).max(60),
  name: z.string().trim().min(2).max(160),
  brand_id: z.number().int().positive().nullable().optional(),
  brand_name: z.string().trim().optional(),
  category_id: z.number().int().positive(),
  subcategory_id: z.number().int().positive().nullable().optional(),
  price_mad: z.number().positive(),
  promo_price_mad: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0),
  short_desc: z.string().trim().max(300).default(''),
  description: z.string().trim().max(4000).default(''),
  specs: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  images: z.array(z.string()).default([]),
  variants: z.array(z.object({ name: z.string(), options: z.array(z.string()) })).default([]),
  is_published: z.boolean().default(true),
  is_new: z.boolean().default(false),
  is_bestseller: z.boolean().default(false),
  is_featured: z.boolean().default(false),
});

apiRouter.post('/admin/products', requireAdmin, (req: AuthedRequest, res) => {
  const parsed = adminProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Données produit invalides.' });
    return;
  }
  const d = parsed.data;
  let brandId = d.brand_id ?? null;
  if (!brandId && d.brand_name) {
    const bSlug = slugify(d.brand_name);
    db.prepare('INSERT OR IGNORE INTO brands (name, slug, is_active) VALUES (?, ?, 1)').run(d.brand_name, bSlug);
    const bRow = db.prepare('SELECT id FROM brands WHERE slug = ?').get(bSlug) as { id: number } | undefined;
    brandId = bRow?.id ?? null;
  }

  const baseSlug = slugify(d.name);
  const slug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

  try {
    const info = db
      .prepare(
        `INSERT INTO products (
          sku, name, slug, brand_id, category_id, subcategory_id, price_mad, promo_price_mad,
          stock, short_desc, description, specs_json, images_json, variants_json,
          is_published, is_new, is_bestseller, is_featured, is_demo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      )
      .run(
        d.sku,
        d.name,
        slug,
        brandId,
        d.category_id,
        d.subcategory_id ?? null,
        d.price_mad,
        d.promo_price_mad ?? null,
        d.stock,
        d.short_desc,
        d.description,
        JSON.stringify(d.specs),
        JSON.stringify(d.images),
        JSON.stringify(d.variants),
        d.is_published ? 1 : 0,
        d.is_new ? 1 : 0,
        d.is_bestseller ? 1 : 0,
        d.is_featured ? 1 : 0
      );

    const pid = Number(info.lastInsertRowid);
    db.prepare(
      `INSERT INTO inventory_movements (product_id, delta, previous_stock, new_stock, reason, reference_id, actor_id)
       VALUES (?, ?, 0, ?, 'Création produit', ?, ?)`
    ).run(pid, d.stock, d.stock, d.sku, req.user!.id);

    logAudit(req.user!.id, 'admin', 'PRODUCT_CREATED', 'products', pid, { sku: d.sku, name: d.name });
    res.status(201).json({ id: pid, slug });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur création produit.' });
  }
});

apiRouter.put('/admin/products/:id', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as { stock: number; sku: string } | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }

  const parsed = adminProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Données produit invalides.' });
    return;
  }
  const d = parsed.data;

  db.prepare(
    `UPDATE products SET
      sku = ?, name = ?, brand_id = ?, category_id = ?, subcategory_id = ?,
      price_mad = ?, promo_price_mad = ?, stock = ?, short_desc = ?, description = ?,
      specs_json = ?, images_json = ?, variants_json = ?,
      is_published = ?, is_new = ?, is_bestseller = ?, is_featured = ?,
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    d.sku,
    d.name,
    d.brand_id ?? null,
    d.category_id,
    d.subcategory_id ?? null,
    d.price_mad,
    d.promo_price_mad ?? null,
    d.stock,
    d.short_desc,
    d.description,
    JSON.stringify(d.specs),
    JSON.stringify(d.images),
    JSON.stringify(d.variants),
    d.is_published ? 1 : 0,
    d.is_new ? 1 : 0,
    d.is_bestseller ? 1 : 0,
    d.is_featured ? 1 : 0,
    id
  );

  if (d.stock !== existing.stock) {
    db.prepare(
      `INSERT INTO inventory_movements (product_id, delta, previous_stock, new_stock, reason, reference_id, actor_id)
       VALUES (?, ?, ?, ?, 'Ajustement manuel', ?, ?)`
    ).run(id, d.stock - existing.stock, existing.stock, d.stock, d.sku, req.user!.id);
  }

  logAudit(req.user!.id, 'admin', 'PRODUCT_UPDATED', 'products', id, { name: d.name, stock: d.stock });
  res.json({ ok: true });
});

apiRouter.delete('/admin/products/:id', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const inOrders = db.prepare('SELECT id FROM order_items WHERE product_id = ? LIMIT 1').get(id);
  if (inOrders) {
    db.prepare("UPDATE products SET is_published = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    logAudit(req.user!.id, 'admin', 'PRODUCT_ARCHIVED', 'products', id);
    res.json({ archived: true });
    return;
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  logAudit(req.user!.id, 'admin', 'PRODUCT_DELETED', 'products', id);
  res.json({ deleted: true });
});

// Admin Orders Management + Atomic Stock Sync
apiRouter.get('/admin/orders', requireAdmin, (_req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
  const enriched = orders.map((o) => ({
    ...o,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(Number(o.id)),
  }));
  res.json(enriched);
});

apiRouter.put('/admin/orders/:id/status', requireAdmin, (req: AuthedRequest, res) => {
  const schema = z.object({
    status: z.enum(['En attente', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Statut invalide.' });
    return;
  }

  const orderId = Number(req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as
    | { id: number; order_number: string; status: string }
    | undefined;
  if (!order) {
    res.status(404).json({ error: 'Commande introuvable.' });
    return;
  }

  const newStatus = parsed.data.status;
  if (order.status === newStatus) {
    res.json({ ok: true });
    return;
  }

  try {
    db.exec('BEGIN IMMEDIATE');
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId) as Array<{
      product_id: number;
      quantity: number;
    }>;

    // Restore stock when cancelled
    if (order.status !== 'Annulée' && newStatus === 'Annulée') {
      for (const it of items) {
        const p = db.prepare('SELECT stock FROM products WHERE id = ?').get(it.product_id) as { stock: number };
        db.prepare('UPDATE products SET stock = stock + ?, sales_count = MAX(0, sales_count - ?) WHERE id = ?').run(
          it.quantity,
          it.quantity,
          it.product_id
        );
        db.prepare(
          `INSERT INTO inventory_movements (product_id, delta, previous_stock, new_stock, reason, reference_id, actor_id)
           VALUES (?, ?, ?, ?, 'Annulation commande', ?, ?)`
        ).run(it.product_id, it.quantity, p.stock, p.stock + it.quantity, order.order_number, req.user!.id);
      }
    }

    // Re-deduct stock if moved back out of Cancelled
    if (order.status === 'Annulée' && newStatus !== 'Annulée') {
      for (const it of items) {
        const p = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(it.product_id) as {
          stock: number;
          name: string;
        };
        if (p.stock < it.quantity) {
          throw new Error(`Stock insuffisant pour réactiver la commande (${p.name}).`);
        }
        db.prepare('UPDATE products SET stock = stock - ?, sales_count = sales_count + ? WHERE id = ?').run(
          it.quantity,
          it.quantity,
          it.product_id
        );
        db.prepare(
          `INSERT INTO inventory_movements (product_id, delta, previous_stock, new_stock, reason, reference_id, actor_id)
           VALUES (?, ?, ?, ?, 'Réactivation commande', ?, ?)`
        ).run(it.product_id, -it.quantity, p.stock, p.stock - it.quantity, order.order_number, req.user!.id);
      }
    }

    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(newStatus, orderId);
    logAudit(req.user!.id, 'admin', 'ORDER_STATUS_UPDATED', 'orders', orderId, {
      order_number: order.order_number,
      from: order.status,
      to: newStatus,
    });
    db.exec('COMMIT');
    res.json({ ok: true });
  } catch (err: unknown) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur mise à jour statut.' });
  }
});

// Admin Customers Management
apiRouter.get('/admin/customers', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.phone, u.is_suspended, u.created_at,
        COALESCE(c.city, 'Maroc') as city,
        (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id OR LOWER(o.customer_email) = LOWER(u.email)) as orders_count,
        (SELECT COALESCE(SUM(o.total_mad), 0) FROM orders o WHERE (o.user_id = u.id OR LOWER(o.customer_email) = LOWER(u.email)) AND o.status != 'Annulée') as total_spent_mad
       FROM users u
       LEFT JOIN customers c ON c.user_id = u.id
       WHERE u.role = 'customer'
       ORDER BY u.created_at DESC`
    )
    .all();
  res.json(rows);
});

apiRouter.put('/admin/customers/:id/suspend', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { is_suspended } = req.body as { is_suspended: boolean };
  db.prepare('UPDATE users SET is_suspended = ? WHERE id = ? AND role = ?').run(
    is_suspended ? 1 : 0,
    id,
    'customer'
  );
  logAudit(req.user!.id, 'admin', is_suspended ? 'CUSTOMER_SUSPENDED' : 'CUSTOMER_REACTIVATED', 'users', id);
  res.json({ ok: true });
});

apiRouter.get('/admin/customers/:id/orders', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const user = db.prepare('SELECT email FROM users WHERE id = ?').get(id) as { email: string } | undefined;
  if (!user) {
    res.status(404).json({ error: 'Client introuvable.' });
    return;
  }
  const orders = db
    .prepare('SELECT * FROM orders WHERE user_id = ? OR LOWER(customer_email) = LOWER(?) ORDER BY created_at DESC')
    .all(id, user.email);
  res.json(orders);
});

// Admin Categories CRUD
apiRouter.get('/admin/categories', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM categories ORDER BY parent_id NULLS FIRST, sort_order ASC, name ASC').all();
  res.json(rows);
});

apiRouter.post('/admin/categories', requireAdmin, (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(80),
    parent_id: z.number().int().positive().nullable().optional(),
    image_url: z.string().trim().optional().default(''),
    description: z.string().trim().optional().default(''),
    is_active: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Catégorie invalide.' });
    return;
  }
  const slug = `${slugify(parsed.data.name)}-${Math.floor(10 + Math.random() * 89)}`;
  const info = db
    .prepare(
      'INSERT INTO categories (name, slug, parent_id, image_url, description, is_active) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      parsed.data.name,
      slug,
      parsed.data.parent_id ?? null,
      parsed.data.image_url,
      parsed.data.description,
      parsed.data.is_active ? 1 : 0
    );
  logAudit(req.user!.id, 'admin', 'CATEGORY_CREATED', 'categories', Number(info.lastInsertRowid), {
    name: parsed.data.name,
  });
  res.status(201).json({ id: Number(info.lastInsertRowid), slug });
});

apiRouter.put('/admin/categories/:id', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().trim().min(2).max(80),
    parent_id: z.number().int().positive().nullable().optional(),
    image_url: z.string().trim().optional().default(''),
    description: z.string().trim().optional().default(''),
    is_active: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Catégorie invalide.' });
    return;
  }
  db.prepare(
    'UPDATE categories SET name = ?, parent_id = ?, image_url = ?, description = ?, is_active = ? WHERE id = ?'
  ).run(
    parsed.data.name,
    parsed.data.parent_id ?? null,
    parsed.data.image_url,
    parsed.data.description,
    parsed.data.is_active ? 1 : 0,
    id
  );
  logAudit(req.user!.id, 'admin', 'CATEGORY_UPDATED', 'categories', id);
  res.json({ ok: true });
});

apiRouter.delete('/admin/categories/:id', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const used = db.prepare('SELECT id FROM products WHERE category_id = ? OR subcategory_id = ? LIMIT 1').get(id, id);
  if (used) {
    db.prepare('UPDATE categories SET is_active = 0 WHERE id = ?').run(id);
    res.json({ disabled: true });
    return;
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ deleted: true });
});

// Admin Promotions CRUD
apiRouter.get('/admin/promotions', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM promotions ORDER BY created_at DESC').all();
  res.json(rows);
});

apiRouter.post('/admin/promotions', requireAdmin, (req: AuthedRequest, res) => {
  const schema = z.object({
    name: z.string().trim().min(2).max(120),
    code: z.string().trim().min(2).max(40).toUpperCase(),
    discount_percent: z.number().min(1).max(90),
    product_ids: z.array(z.number().int().positive()).default([]),
    starts_at: z.string(),
    ends_at: z.string(),
    is_active: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Promotion invalide.' });
    return;
  }
  try {
    const info = db
      .prepare(
        `INSERT INTO promotions (name, code, discount_percent, product_ids_json, starts_at, ends_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        parsed.data.name,
        parsed.data.code,
        parsed.data.discount_percent,
        JSON.stringify(parsed.data.product_ids),
        parsed.data.starts_at,
        parsed.data.ends_at,
        parsed.data.is_active ? 1 : 0
      );
    logAudit(req.user!.id, 'admin', 'PROMO_CREATED', 'promotions', Number(info.lastInsertRowid), {
      code: parsed.data.code,
    });
    res.status(201).json({ id: Number(info.lastInsertRowid) });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Code promo déjà existant.' });
  }
});

apiRouter.put('/admin/promotions/:id', requireAdmin, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { is_active } = req.body as { is_active: boolean };
  db.prepare('UPDATE promotions SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id);
  logAudit(req.user!.id, 'admin', 'PROMO_TOGGLED', 'promotions', id, { is_active });
  res.json({ ok: true });
});

apiRouter.delete('/admin/promotions/:id', requireAdmin, (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM promotions WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// Admin Inventory Movements
apiRouter.get('/admin/inventory', requireAdmin, (_req, res) => {
  const rows = db
    .prepare(
      `SELECT m.*, p.name as product_name, p.sku
       FROM inventory_movements m
       JOIN products p ON p.id = m.product_id
       ORDER BY m.created_at DESC
       LIMIT 100`
    )
    .all();
  res.json(rows);
});

apiRouter.post('/admin/inventory/adjust', requireAdmin, (req: AuthedRequest, res) => {
  const schema = z.object({
    product_id: z.number().int().positive(),
    delta: z.number().int().refine((n) => n !== 0),
    reason: z.string().trim().min(2).max(120),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ajustement de stock invalide.' });
    return;
  }
  const prod = db.prepare('SELECT id, stock, sku FROM products WHERE id = ?').get(parsed.data.product_id) as
    | { id: number; stock: number; sku: string }
    | undefined;
  if (!prod) {
    res.status(404).json({ error: 'Produit introuvable.' });
    return;
  }
  const newStock = Math.max(0, prod.stock + parsed.data.delta);
  db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").run(newStock, prod.id);
  db.prepare(
    `INSERT INTO inventory_movements (product_id, delta, previous_stock, new_stock, reason, reference_id, actor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(prod.id, newStock - prod.stock, prod.stock, newStock, parsed.data.reason, prod.sku, req.user!.id);

  logAudit(req.user!.id, 'admin', 'INVENTORY_ADJUSTED', 'products', prod.id, {
    delta: parsed.data.delta,
    newStock,
  });
  res.json({ ok: true, new_stock: newStock });
});

// Admin Site Settings & Messages
apiRouter.get('/admin/settings', requireAdmin, (_req, res) => {
  res.json(getSettingsMap());
});

apiRouter.put('/admin/settings', requireAdmin, (req: AuthedRequest, res) => {
  const entries = Object.entries(req.body as Record<string, unknown>);
  const upsert = db.prepare(
    `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
  );
  for (const [k, v] of entries) {
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      upsert.run(k, String(v));
    } else if (v !== null && v !== undefined) {
      upsert.run(k, JSON.stringify(v));
    }
  }
  logAudit(req.user!.id, 'admin', 'SETTINGS_UPDATED', 'site_settings', 'global');
  res.json({ ok: true });
});

apiRouter.get('/admin/messages', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  res.json(rows);
});
