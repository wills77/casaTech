import { db } from './db.ts';
import { hashPassword } from './security.ts';

const IMAGES = {
  hero: '/src/assets/images/hero_casatech_flagship_1794857259332.jpg',
  iphone: '/src/assets/images/prod_iphone_pro_1794857259852.jpg',
  galaxy: '/src/assets/images/prod_samsung_galaxy_1794857260140.jpg',
  macbook: '/src/assets/images/prod_macbook_air_1794857260382.jpg',
  laptop: '/src/assets/images/prod_business_laptop_1794857260654.jpg',
  tablet: '/src/assets/images/prod_tablet_stylus_1794857260678.jpg',
  earbuds: '/src/assets/images/prod_wireless_earbuds_1794857261577.jpg',
  charger: '/src/assets/images/prod_usb_charger_1794857261702.jpg',
  mouse: '/src/assets/images/prod_wireless_mouse_1794857261706.jpg',
  keyboard: '/src/assets/images/prod_mechanical_keyboard_1794857262298.jpg',
  monitor: '/src/assets/images/prod_monitor_display_1794857262676.jpg',
  ssd: '/src/assets/images/prod_nvme_ssd_1794857263583.jpg',
};

export function seedDatabase(): void {
  // 1. Ensure initial Admin account exists (dev/demo credentials read server-side only)
  const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
  if (!adminExists) {
    const initialUsername = process.env.ADMIN_INITIAL_USERNAME || 'Admin';
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || '123456789';
    db.prepare(
      `INSERT INTO users (username, email, password_hash, role, full_name, phone, must_change_password)
       VALUES (?, ?, ?, 'admin', ?, ?, 1)`
    ).run(
      initialUsername,
      'admin@casatech.ma',
      hashPassword(initialPassword),
      'Administrateur CasaTech',
      '+212 522 00 00 00'
    );
  }

  // 2. Seed Site Settings if empty
  const settingsCount = (db.prepare('SELECT COUNT(*) as cnt FROM site_settings').get() as { cnt: number }).cnt;
  if (settingsCount === 0) {
    const defaultSettings: Record<string, string> = {
      store_name: 'CasaTech',
      slogan: 'Toute la technologie, au même endroit.',
      logo_text: 'CasaTech',
      contact_email: 'contact@casatech.ma',
      contact_phone: '+212 522 48 90 12',
      whatsapp_number: '+212661000000',
      store_address: "Boulevard d'Anfa, Résidence Al Yassamine, Quartier Gautier, Casablanca",
      casablanca_shipping_fee: '30',
      other_cities_shipping_fee: '55',
      free_shipping_threshold: '2500',
      pickup_enabled: 'true',
      delivery_zones: JSON.stringify([
        { city: 'Casablanca', fee: 30, delay: '24h ouvrées' },
        { city: 'Rabat / Salé', fee: 45, delay: '24-48h' },
        { city: 'Marrakech', fee: 55, delay: '48h' },
        { city: 'Tanger / Tétouan', fee: 55, delay: '48h' },
        { city: 'Agadir', fee: 60, delay: '48-72h' },
        { city: 'Fès / Meknès', fee: 55, delay: '48h' },
        { city: 'Oujda / Autres villes', fee: 65, delay: '72h' },
      ]),
      hero_title: 'La haute technologie à portée de main au Maroc',
      hero_subtitle:
        'Smartphones dernière génération, ordinateurs professionnels et accessoires certifiés. Prix indicatifs de démonstration en MAD.',
      hero_cta: 'Découvrir nos produits',
      hero_image: IMAGES.hero,
      social_instagram: 'https://instagram.com',
      social_facebook: 'https://facebook.com',
      social_linkedin: 'https://linkedin.com',
      terms_content:
        "Conditions Générales de Vente CasaTech (Démonstration) : Les fiches produits, prix en Dirhams marocains (MAD) et niveaux de stock affichés sur cette plateforme constituent des données de démonstration et ne représentent pas une offre commerciale ferme. Paiement à la livraison (COD) disponible sur l'ensemble des zones couvertes.",
      privacy_content:
        "Politique de Confidentialité CasaTech : Conformément à la loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel au Maroc, vos données sont utilisées exclusivement pour le traitement de vos commandes et la gestion de votre espace client.",
      payment_gateway_enabled: process.env.PAYMENT_GATEWAY_ENABLED === 'true' ? 'true' : 'false',
    };

    const insertSetting = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(defaultSettings)) {
      insertSetting.run(key, value);
    }
  }

  // 3. Seed Categories & Subcategories if empty
  const catCount = (db.prepare('SELECT COUNT(*) as cnt FROM categories').get() as { cnt: number }).cnt;
  if (catCount > 0) return;

  const insertCat = db.prepare(
    'INSERT INTO categories (name, slug, parent_id, image_url, description, is_active, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)'
  );

  const mainCategories = [
    {
      name: 'Smartphones',
      slug: 'smartphones',
      image: IMAGES.iphone,
      desc: 'Téléphones 5G dernière génération, iOS et Android.',
      subs: ['Apple iPhone', 'Samsung Galaxy', 'Xiaomi', 'Redmi', 'Oppo', 'Huawei'],
    },
    {
      name: 'Ordinateurs',
      slug: 'ordinateurs',
      image: IMAGES.macbook,
      desc: 'Ordinateurs portables professionnels, ultrabooks et stations de travail.',
      subs: ['MacBook', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer'],
    },
    {
      name: 'Tablettes',
      slug: 'tablettes',
      image: IMAGES.tablet,
      desc: 'Tablettes tactiles pour la création, les études et la productivité.',
      subs: ['iPad', 'Samsung Galaxy Tab', 'Lenovo Tab'],
    },
    {
      name: 'Accessoires',
      slug: 'accessoires',
      image: IMAGES.earbuds,
      desc: 'Audio sans fil, charge rapide GaN, claviers, souris et batteries.',
      subs: [
        'Chargeurs',
        'Écouteurs',
        'AirPods',
        'Casques audio',
        'Souris',
        'Claviers',
        'Supports',
        'Batteries externes',
      ],
    },
    {
      name: 'Équipements informatiques',
      slug: 'equipements-informatiques',
      image: IMAGES.monitor,
      desc: 'Moniteurs 4K, stockage SSD NVMe, réseaux Wi-Fi et périphériques bureau.',
      subs: ['Écrans', 'Disques SSD', 'Disques durs', 'Routeurs', 'Clés USB', 'Imprimantes'],
    },
  ];

  const catMap = new Map<string, number>();
  mainCategories.forEach((cat, idx) => {
    const info = insertCat.run(cat.name, cat.slug, null, cat.image, cat.desc, idx + 1);
    const parentId = Number(info.lastInsertRowid);
    catMap.set(cat.slug, parentId);
    cat.subs.forEach((subName, sIdx) => {
      const subSlug = `${cat.slug}-${subName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}`;
      const subInfo = insertCat.run(subName, subSlug, parentId, cat.image, `${subName} — ${cat.name}`, sIdx + 1);
      catMap.set(subName, Number(subInfo.lastInsertRowid));
    });
  });

  // 4. Seed Brands
  const brandNames = [
    'Apple',
    'Samsung',
    'Xiaomi',
    'Redmi',
    'Oppo',
    'Huawei',
    'Dell',
    'HP',
    'Lenovo',
    'Asus',
    'Acer',
    'Logitech',
    'Anker',
    'Keychron',
    'LG',
    'SanDisk',
    'TP-Link',
  ];
  const insertBrand = db.prepare('INSERT INTO brands (name, slug, is_active) VALUES (?, ?, 1)');
  const brandMap = new Map<string, number>();
  for (const name of brandNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const info = insertBrand.run(name, slug);
    brandMap.set(name, Number(info.lastInsertRowid));
  }

  // 5. Seed 22 Realistic Demo Products
  const products = [
    {
      sku: 'CT-IPH16-128',
      name: 'iPhone 16',
      slug: 'iphone-16',
      brand: 'Apple',
      cat: 'smartphones',
      sub: 'Apple iPhone',
      price: 10990,
      promo: 9990,
      stock: 18,
      shortDesc: 'Puce A18, écran Super Retina XDR 6,1" et caméra Fusion 48 Mpx.',
      description:
        "Produit de démonstration : L'iPhone 16 réunit la puissance de la puce A18, la commande de l'appareil photo dédiée et une autonomie optimisée pour la journée. Boîtier en aluminium de qualité aérospatiale avec verre Ceramic Shield.",
      specs: [
        { label: 'Écran', value: '6,1" Super Retina XDR OLED' },
        { label: 'Processeur', value: 'Apple A18 (6 cœurs)' },
        { label: 'Appareil photo', value: '48 Mpx Fusion + 12 Mpx Ultra grand-angle' },
        { label: 'Connectivité', value: '5G, Wi-Fi 7, USB-C' },
      ],
      images: [IMAGES.iphone, IMAGES.hero],
      variants: [
        { name: 'Couleur', options: ['Noir', 'Outremer', 'Sarcelle', 'Blanc'] },
        { name: 'Stockage', options: ['128 Go', '256 Go', '512 Go'] },
      ],
      isNew: 1,
      isBestseller: 1,
      isFeatured: 1,
      salesCount: 44,
    },
    {
      sku: 'CT-IPH16P-256',
      name: 'iPhone 16 Pro',
      slug: 'iphone-16-pro',
      brand: 'Apple',
      cat: 'smartphones',
      sub: 'Apple iPhone',
      price: 14490,
      promo: 13690,
      stock: 12,
      shortDesc: 'Titane grade 5, puce A18 Pro et vidéo 4K Dolby Vision 120 i/s.',
      description:
        'Produit de démonstration : Conçu en titane léger et résistant, l’iPhone 16 Pro embarque la puce A18 Pro, un écran ProMotion 120 Hz de 6,3" et un téléobjectif 5x de qualité studio.',
      specs: [
        { label: 'Écran', value: '6,3" LTPO Super Retina XDR 120 Hz' },
        { label: 'Processeur', value: 'Apple A18 Pro' },
        { label: 'Châssis', value: 'Titane grade 5 microbillé' },
        { label: 'Caméra', value: 'Triple capteur 48 Mpx ProRAW' },
      ],
      images: [IMAGES.iphone, IMAGES.hero],
      variants: [
        { name: 'Couleur', options: ['Titane naturel', 'Titane noir', 'Titane sable'] },
        { name: 'Stockage', options: ['256 Go', '512 Go', '1 To'] },
      ],
      isNew: 1,
      isBestseller: 1,
      isFeatured: 1,
      salesCount: 38,
    },
    {
      sku: 'CT-SGS25-256',
      name: 'Samsung Galaxy S25',
      slug: 'samsung-galaxy-s25',
      brand: 'Samsung',
      cat: 'smartphones',
      sub: 'Samsung Galaxy',
      price: 9890,
      promo: 9290,
      stock: 22,
      shortDesc: 'Dynamic AMOLED 2X 120 Hz, Snapdragon Elite et Galaxy AI.',
      description:
        'Produit de démonstration : Compact, rapide et intelligent, le Galaxy S25 offre un affichage AMOLED ultra-lumineux, une finition verre Armor et une suite photo polyvalente.',
      specs: [
        { label: 'Écran', value: '6,2" Dynamic AMOLED 2X 120 Hz' },
        { label: 'Mémoire RAM', value: '12 Go LPDDR5X' },
        { label: 'Batterie', value: '4000 mAh charge rapide 25W' },
        { label: 'Protection', value: 'IP68 Gorilla Glass Victus 2' },
      ],
      images: [IMAGES.galaxy, IMAGES.iphone],
      variants: [
        { name: 'Couleur', options: ['Bleu Nuit', 'Gris Argent', 'Bleu Glace'] },
        { name: 'Stockage', options: ['128 Go', '256 Go'] },
      ],
      isNew: 1,
      isBestseller: 1,
      isFeatured: 1,
      salesCount: 31,
    },
    {
      sku: 'CT-SGA56-128',
      name: 'Samsung Galaxy A56',
      slug: 'samsung-galaxy-a56',
      brand: 'Samsung',
      cat: 'smartphones',
      sub: 'Samsung Galaxy',
      price: 4590,
      promo: 4190,
      stock: 30,
      shortDesc: 'Écran Super AMOLED 6,7", 5G, batterie 5000 mAh et étanchéité IP67.',
      description:
        'Produit de démonstration : Le milieu de gamme référence au Maroc. Écran fluide 120 Hz, capteur principal stabilisé OIS 50 Mpx et 6 ans de mises à jour sécurité.',
      specs: [
        { label: 'Écran', value: '6,7" Super AMOLED 120 Hz' },
        { label: 'Mémoire RAM', value: '8 Go' },
        { label: 'Batterie', value: '5000 mAh charge 45W' },
        { label: 'Caméra', value: '50 Mpx OIS + 12 Mpx' },
      ],
      images: [IMAGES.galaxy],
      variants: [
        { name: 'Couleur', options: ['Graphite', 'Lavande', 'Blanc'] },
        { name: 'Stockage', options: ['128 Go', '256 Go'] },
      ],
      isNew: 1,
      isBestseller: 1,
      isFeatured: 0,
      salesCount: 52,
    },
    {
      sku: 'CT-XRN14-256',
      name: 'Xiaomi Redmi Note 14',
      slug: 'xiaomi-redmi-note-14',
      brand: 'Redmi',
      cat: 'smartphones',
      sub: 'Redmi',
      price: 2590,
      promo: 2290,
      stock: 40,
      shortDesc: 'AMOLED 120 Hz, capteur 108 Mpx et autonomie longue durée 5500 mAh.',
      description:
        'Produit de démonstration : Rapport performance-prix imbattable avec dalle AMOLED lumineuse, charge rapide 33W incluse et double haut-parleur stéréo.',
      specs: [
        { label: 'Écran', value: '6,67" AMOLED 120 Hz' },
        { label: 'Appareil photo', value: '108 Mpx IA' },
        { label: 'Batterie', value: '5500 mAh' },
        { label: 'RAM', value: '8 Go' },
      ],
      images: [IMAGES.galaxy],
      variants: [
        { name: 'Couleur', options: ['Noir Minuit', 'Bleu Océan', 'Vert Lime'] },
        { name: 'Stockage', options: ['128 Go', '256 Go'] },
      ],
      isNew: 1,
      isBestseller: 1,
      isFeatured: 0,
      salesCount: 64,
    },
    {
      sku: 'CT-MBA-M4-256',
      name: 'MacBook Air M4',
      slug: 'macbook-air-m4',
      brand: 'Apple',
      cat: 'ordinateurs',
      sub: 'MacBook',
      price: 13490,
      promo: 12790,
      stock: 14,
      shortDesc: 'Puce Apple M4, 16 Go RAM unifiée, écran Liquid Retina 13,6" et 18h d’autonomie.',
      description:
        'Produit de démonstration : Ultraportable silencieux sans ventilateur doté de la puce M4 nouvelle génération, idéal pour le développement, la bureautique avancée et la mobilité à Casablanca.',
      specs: [
        { label: 'Processeur', value: 'Apple M4 CPU 10 cœurs / GPU 10 cœurs' },
        { label: 'Mémoire RAM', value: '16 Go unifiée' },
        { label: 'Stockage SSD', value: '256 Go / 512 Go NVMe' },
        { label: 'Écran', value: '13,6" Liquid Retina True Tone' },
      ],
      images: [IMAGES.macbook, IMAGES.hero],
      variants: [
        { name: 'Couleur', options: ['Minuit', 'Lumière stellaire', 'Argent'] },
        { name: 'RAM / SSD', options: ['16 Go / 256 Go', '16 Go / 512 Go', '24 Go / 512 Go'] },
      ],
      isNew: 1,
      isBestseller: 1,
      isFeatured: 1,
      salesCount: 29,
    },
    {
      sku: 'CT-MBP14-M4',
      name: 'MacBook Pro',
      slug: 'macbook-pro-14-m4',
      brand: 'Apple',
      cat: 'ordinateurs',
      sub: 'MacBook',
      price: 21900,
      promo: null,
      stock: 7,
      shortDesc: 'Écran Liquid Retina XDR 14,2", puce M4 Pro et connectique complète HDMI/SD.',
      description:
        'Produit de démonstration : Station mobile d’exception pour les créateurs, architectes et développeurs exigeants. Dalle mini-LED XDR 120 Hz jusqu’à 1600 nits.',
      specs: [
        { label: 'Processeur', value: 'Apple M4 Pro 12 cœurs' },
        { label: 'Mémoire RAM', value: '24 Go unifiée' },
        { label: 'Stockage', value: '512 Go SSD ultra-rapide' },
        { label: 'Ports', value: '3x Thunderbolt 5, HDMI, lecteur SDXC, MagSafe 3' },
      ],
      images: [IMAGES.macbook, IMAGES.hero],
      variants: [
        { name: 'Couleur', options: ['Noir sidéral', 'Argent'] },
        { name: 'Configuration', options: ['24 Go / 512 Go', '24 Go / 1 To'] },
      ],
      isNew: 1,
      isBestseller: 0,
      isFeatured: 1,
      salesCount: 15,
    },
    {
      sku: 'CT-DELL-LAT5450',
      name: 'Dell Latitude',
      slug: 'dell-latitude-5450',
      brand: 'Dell',
      cat: 'ordinateurs',
      sub: 'Dell',
      price: 11200,
      promo: 10490,
      stock: 11,
      shortDesc: 'PC portable professionnel 14" FHD+, Intel Core Ultra 7 et châssis renforcé.',
      description:
        'Produit de démonstration : Conçu pour les entreprises et cadres au Maroc : sécurité matérielle vPro, clavier rétroéclairé AZERTY, port RJ45 et autonomie journée complète.',
      specs: [
        { label: 'Processeur', value: 'Intel Core Ultra 7 155U' },
        { label: 'Mémoire RAM', value: '16 Go DDR5' },
        { label: 'Stockage', value: '512 Go SSD PCIe Gen 4' },
        { label: 'Écran', value: '14" IPS Antireflet FHD+' },
      ],
      images: [IMAGES.laptop],
      variants: [
        { name: 'Couleur', options: ['Gris Titan'] },
        { name: 'RAM / SSD', options: ['16 Go / 512 Go', '32 Go / 1 To'] },
      ],
      isNew: 0,
      isBestseller: 1,
      isFeatured: 0,
      salesCount: 24,
    },
    {
      sku: 'CT-HP-PAV15',
      name: 'HP Pavilion',
      slug: 'hp-pavilion-15',
      brand: 'HP',
      cat: 'ordinateurs',
      sub: 'HP',
      price: 7890,
      promo: 7190,
      stock: 16,
      shortDesc: 'Écran 15,6" Full HD IPS, Intel Core i5 13e gén et audio Bang & Olufsen.',
      description:
        'Produit de démonstration : Polyvalent et élégant pour les études et le télétravail. Pavé numérique complet, charge rapide HP et webcam HD avec obturateur.',
      specs: [
        { label: 'Processeur', value: 'Intel Core i5-1335U' },
        { label: 'Mémoire RAM', value: '16 Go DDR4' },
        { label: 'Stockage', value: '512 Go SSD NVMe' },
        { label: 'Écran', value: '15,6" FHD Micro-bords' },
      ],
      images: [IMAGES.laptop],
      variants: [
        { name: 'Couleur', options: ['Argent naturel', 'Bleu minéral'] },
        { name: 'Stockage', options: ['512 Go SSD', '1 To SSD'] },
      ],
      isNew: 0,
      isBestseller: 1,
      isFeatured: 0,
      salesCount: 33,
    },
    {
      sku: 'CT-LEN-TPX1',
      name: 'Lenovo ThinkPad',
      slug: 'lenovo-thinkpad-x1',
      brand: 'Lenovo',
      cat: 'ordinateurs',
      sub: 'Lenovo',
      price: 15900,
      promo: null,
      stock: 8,
      shortDesc: 'Fibre de carbone 1,12 kg, clavier légendaire ThinkPad et écran 2.8K OLED.',
      description:
        'Produit de démonstration : Référence absolue des professionnels IT et dirigeants. Testé selon 12 normes militaires MIL-STD-810H, double ventilateur silencieux.',
      specs: [
        { label: 'Processeur', value: 'Intel Core Ultra 7 155H' },
        { label: 'Mémoire RAM', value: '32 Go LPDDR5x' },
        { label: 'Stockage', value: '1 To SSD Gen 4' },
        { label: 'Poids', value: '1,12 kg châssis carbone' },
      ],
      images: [IMAGES.laptop],
      variants: [
        { name: 'Couleur', options: ['Noir carbone'] },
        { name: 'Configuration', options: ['16 Go / 512 Go', '32 Go / 1 To'] },
      ],
      isNew: 1,
      isBestseller: 0,
      isFeatured: 1,
      salesCount: 14,
    },
    {
      sku: 'CT-ASUS-VB16',
      name: 'Asus VivoBook',
      slug: 'asus-vivobook-16',
      brand: 'Asus',
      cat: 'ordinateurs',
      sub: 'Asus',
      price: 6890,
      promo: 6390,
      stock: 19,
      shortDesc: 'Grand écran 16" WUXGA 16:10, AMD Ryzen 7 et charnière plate 180°.',
      description:
        'Produit de démonstration : Confort visuel supérieur grâce au format 16:10 anti-reflet et traitement antimicrobien Asus. Idéal pour la bureautique intensive.',
      specs: [
        { label: 'Processeur', value: 'AMD Ryzen 7 7730U' },
        { label: 'Mémoire RAM', value: '16 Go' },
        { label: 'Stockage', value: '512 Go SSD NVMe' },
        { label: 'Écran', value: '16" 1920x1200 IPS' },
      ],
      images: [IMAGES.laptop],
      variants: [
        { name: 'Couleur', options: ['Gris Indie', 'Argent froid'] },
        { name: 'Stockage', options: ['512 Go', '1 To'] },
      ],
      isNew: 0,
      isBestseller: 0,
      isFeatured: 0,
      salesCount: 21,
    },
    {
      sku: 'CT-IPAD-M2',
      name: 'iPad',
      slug: 'ipad-air-m2',
      brand: 'Apple',
      cat: 'tablettes',
      sub: 'iPad',
      price: 7290,
      promo: 6790,
      stock: 15,
      shortDesc: 'Écran Liquid Retina 11", puce Apple M2 et compatibilité Apple Pencil Pro.',
      description:
        'Produit de démonstration : Parfait pour la prise de notes, le dessin numérique, la lecture et le multitâche avec Stage Manager.',
      specs: [
        { label: 'Écran', value: '11" Liquid Retina P3' },
        { label: 'Puce', value: 'Apple M2' },
        { label: 'Caméra frontale', value: '12 Mpx ultra grand-angle paysage' },
        { label: 'Wi-Fi', value: 'Wi-Fi 6E + USB-C' },
      ],
      images: [IMAGES.tablet],
      variants: [
        { name: 'Couleur', options: ['Gris sidéral', 'Bleu', 'Lumière stellaire'] },
        { name: 'Stockage', options: ['128 Go', '256 Go'] },
      ],
      isNew: 1,
      isBestseller: 1,
      isFeatured: 1,
      salesCount: 27,
    },
    {
      sku: 'CT-SGTAB-S10',
      name: 'Samsung Galaxy Tab',
      slug: 'samsung-galaxy-tab-s10',
      brand: 'Samsung',
      cat: 'tablettes',
      sub: 'Samsung Galaxy Tab',
      price: 8490,
      promo: 7990,
      stock: 10,
      shortDesc: 'Écran Dynamic AMOLED 2X 12,4", S Pen inclus et mode bureau DeX.',
      description:
        'Produit de démonstration : Livrée avec son stylet S Pen magnétique ultra-précis, la Galaxy Tab se transforme en véritable poste de travail mobile.',
      specs: [
        { label: 'Écran', value: '12,4" AMOLED 120 Hz antireflet' },
        { label: 'Accessoire', value: 'S Pen inclus dans la boîte' },
        { label: 'RAM / Stockage', value: '12 Go / 256 Go + microSD' },
        { label: 'Audio', value: '4 haut-parleurs AKG Dolby Atmos' },
      ],
      images: [IMAGES.tablet],
      variants: [
        { name: 'Couleur', options: ['Gris Lune', 'Argent'] },
        { name: 'Stockage', options: ['256 Go', '512 Go'] },
      ],
      isNew: 1,
      isBestseller: 0,
      isFeatured: 0,
      salesCount: 16,
    },
    {
      sku: 'CT-AIRPODS-P2',
      name: 'AirPods',
      slug: 'airpods-pro-2-usb-c',
      brand: 'Apple',
      cat: 'accessoires',
      sub: 'AirPods',
      price: 2890,
      promo: 2590,
      stock: 35,
      shortDesc: 'Réduction active du bruit 2x plus performante, audio spatial et boîtier USB-C.',
      description:
        'Produit de démonstration : Écouteurs sans fil équipés de la puce H2, détection des conversations, mode Transparence adaptatif et boîtier résistant IP54.',
      specs: [
        { label: 'Puce audio', value: 'Apple H2' },
        { label: 'Autonomie', value: '6h écoute + 30h avec boîtier MagSafe' },
        { label: 'Connectique', value: 'USB-C & charge sans fil' },
        { label: 'Résistance', value: 'IP54 poussière et transpiration' },
      ],
      images: [IMAGES.earbuds],
      variants: [{ name: 'Couleur', options: ['Blanc'] }],
      isNew: 0,
      isBestseller: 1,
      isFeatured: 1,
      salesCount: 78,
    },
    {
      sku: 'CT-ANK-BT50',
      name: 'Écouteurs Bluetooth',
      slug: 'ecouteurs-bluetooth-anc',
      brand: 'Anker',
      cat: 'accessoires',
      sub: 'Écouteurs',
      price: 690,
      promo: 549,
      stock: 48,
      shortDesc: 'Bluetooth 5.3 multipoint, réduction de bruit adaptative et 40h d’autonomie.',
      description:
        'Produit de démonstration : Son clair avec basses maîtrisées, 4 microphones pour appels nets même dans le trafic de Casablanca, et charge rapide 10 min = 4h.',
      specs: [
        { label: 'Bluetooth', value: '5.3 multipoint (2 appareils)' },
        { label: 'Autonomie totale', value: '40 heures avec boîtier' },
        { label: 'Étanchéité', value: 'IPX5' },
      ],
      images: [IMAGES.earbuds],
      variants: [{ name: 'Couleur', options: ['Blanc Nacré', 'Noir Mat'] }],
      isNew: 0,
      isBestseller: 1,
      isFeatured: 0,
      salesCount: 92,
    },
    {
      sku: 'CT-GAN-65W',
      name: 'Chargeur USB-C',
      slug: 'chargeur-usb-c-gan-65w',
      brand: 'Anker',
      cat: 'accessoires',
      sub: 'Chargeurs',
      price: 390,
      promo: 329,
      stock: 60,
      shortDesc: 'Technologie GaN 65W double port USB-C + câble tressé 100W inclus.',
      description:
        'Produit de démonstration : Rechargez simultanément votre MacBook, iPad et smartphone avec protection thermique active ActiveShield.',
      specs: [
        { label: 'Puissance max', value: '65W Power Delivery 3.0 / PPS' },
        { label: 'Ports', value: '2x USB-C + 1x USB-A' },
        { label: 'Câble inclus', value: 'USB-C vers USB-C tressé 1,5m' },
      ],
      images: [IMAGES.charger],
      variants: [{ name: 'Couleur', options: ['Bleu Nuit', 'Noir Graphite'] }],
      isNew: 0,
      isBestseller: 1,
      isFeatured: 0,
      salesCount: 110,
    },
    {
      sku: 'CT-LOGI-MX3S',
      name: 'Souris sans fil',
      slug: 'souris-sans-fil-mx-master',
      brand: 'Logitech',
      cat: 'accessoires',
      sub: 'Souris',
      price: 1190,
      promo: 990,
      stock: 25,
      shortDesc: 'Capteur 8000 DPI sur verre, molette électromagnétique MagSpeed et clics silencieux.',
      description:
        'Produit de démonstration : La référence ergonomique pour développeurs, designers et analystes. Connexion jusqu’à 3 ordinateurs via Bluetooth ou récepteur Logi Bolt.',
      specs: [
        { label: 'Capteur', value: 'Darkfield 8000 DPI (fonctionne sur verre)' },
        { label: 'Autonomie', value: '70 jours sur charge USB-C' },
        { label: 'Connectivité', value: 'Bluetooth Low Energy + Logi Bolt' },
      ],
      images: [IMAGES.mouse],
      variants: [{ name: 'Couleur', options: ['Graphite', 'Gris Pâle'] }],
      isNew: 0,
      isBestseller: 1,
      isFeatured: 0,
      salesCount: 47,
    },
    {
      sku: 'CT-KEY-K2P',
      name: 'Clavier mécanique',
      slug: 'clavier-mecanique-sans-fil',
      brand: 'Keychron',
      cat: 'accessoires',
      sub: 'Claviers',
      price: 1390,
      promo: 1190,
      stock: 17,
      shortDesc: 'Format compact 75% aluminium CNC, switches hot-swap et compatible macOS/Windows.',
      description:
        'Produit de démonstration : Frappe précise et silencieuse grâce à la mousse acoustique interne et aux touches PBT double-shot. Programmable via QMK/VIA.',
      specs: [
        { label: 'Format', value: '75% (84 touches) châssis aluminium' },
        { label: 'Switches', value: 'Linéaires ou Tactiles Hot-Swappable' },
        { label: 'Batterie', value: '4000 mAh USB-C / Bluetooth 5.1' },
      ],
      images: [IMAGES.keyboard],
      variants: [
        { name: 'Switch', options: ['Red Linéaire', 'Brown Tactile'] },
        { name: 'Disposition', options: ['AZERTY FR', 'QWERTY US'] },
      ],
      isNew: 1,
      isBestseller: 0,
      isFeatured: 1,
      salesCount: 28,
    },
    {
      sku: 'CT-LG-27UP850',
      name: 'Écran informatique',
      slug: 'ecran-informatique-27-4k',
      brand: 'LG',
      cat: 'equipements-informatiques',
      sub: 'Écrans',
      price: 4490,
      promo: 3990,
      stock: 9,
      shortDesc: 'Dalle IPS 27" 4K UHD (3840x2160), USB-C 90W et couverture DCI-P3 95%.',
      description:
        'Produit de démonstration : Un seul câble USB-C suffit pour afficher en 4K et recharger votre ordinateur portable jusqu’à 90W. Pied ergonomique réglable en hauteur et pivot.',
      specs: [
        { label: 'Diagonale', value: '27 pouces IPS 4K UHD' },
        { label: 'Connectivité', value: 'USB-C (90W PD), 2x HDMI, DisplayPort' },
        { label: 'Colorimétrie', value: 'DCI-P3 95%, HDR10' },
      ],
      images: [IMAGES.monitor],
      variants: [{ name: 'Taille', options: ['27 pouces 4K', '32 pouces 4K'] }],
      isNew: 1,
      isBestseller: 1,
      isFeatured: 1,
      salesCount: 19,
    },
    {
      sku: 'CT-SSD-NVME1T',
      name: 'Disque SSD',
      slug: 'disque-ssd-externe-1to',
      brand: 'SanDisk',
      cat: 'equipements-informatiques',
      sub: 'Disques SSD',
      price: 1290,
      promo: 1090,
      stock: 34,
      shortDesc: 'SSD portable NVMe USB 3.2 Gen 2 jusqu’à 1050 Mo/s, boîtier aluminium IP65.',
      description:
        'Produit de démonstration : Sauvegardez vos projets vidéo 4K, machines virtuelles et archives en quelques secondes grâce à la dissipation thermique en aluminium brossé.',
      specs: [
        { label: 'Débit lecture', value: "Jusqu'à 1050 Mo/s" },
        { label: 'Interface', value: 'USB-C 3.2 Gen 2 (10 Gbit/s)' },
        { label: 'Chiffrement', value: 'AES 256 bits matériel' },
      ],
      images: [IMAGES.ssd],
      variants: [{ name: 'Capacité', options: ['1 To', '2 To', '4 To'] }],
      isNew: 0,
      isBestseller: 1,
      isFeatured: 0,
      salesCount: 56,
    },
    {
      sku: 'CT-TPL-AX55',
      name: 'Routeur Wi-Fi 6 TP-Link Archer AX55',
      slug: 'routeur-wifi-6-archer-ax55',
      brand: 'TP-Link',
      cat: 'equipements-informatiques',
      sub: 'Routeurs',
      price: 990,
      promo: 849,
      stock: 20,
      shortDesc: 'Débit dual-band AX3000, 4 antennes haut gain et compatibilité fibre optique.',
      description:
        'Produit de démonstration : Optimisez la couverture fibre optique dans tout votre appartement ou bureau à Casablanca avec OFDMA et MU-MIMO.',
      specs: [
        { label: 'Norme Wi-Fi', value: 'Wi-Fi 6 (802.11ax) AX3000' },
        { label: 'Ports', value: '1x WAN Gigabit + 4x LAN Gigabit' },
        { label: 'Sécurité', value: 'WPA3 + HomeShield' },
      ],
      images: [IMAGES.ssd],
      variants: [{ name: 'Version', options: ['AX3000'] }],
      isNew: 0,
      isBestseller: 0,
      isFeatured: 0,
      salesCount: 18,
    },
    {
      sku: 'CT-ANK-PB20K',
      name: 'Batterie externe Anker 20 000 mAh',
      slug: 'batterie-externe-20000mah',
      brand: 'Anker',
      cat: 'accessoires',
      sub: 'Batteries externes',
      price: 590,
      promo: null,
      stock: 0,
      shortDesc: 'Charge rapide 30W USB-C bi-directionnelle avec écran de niveau précis.',
      description:
        'Produit de démonstration : Jusqu’à 4 recharges complètes de smartphone en déplacement. Format compact autorisé en cabine aérienne.',
      specs: [
        { label: 'Capacité', value: '20 000 mAh / 74 Wh' },
        { label: 'Sortie', value: '30W USB-C Power Delivery' },
      ],
      images: [IMAGES.charger],
      variants: [{ name: 'Couleur', options: ['Noir', 'Bleu Nuit'] }],
      isNew: 0,
      isBestseller: 0,
      isFeatured: 0,
      salesCount: 41,
    },
  ];

  const insertProd = db.prepare(
    `INSERT INTO products (
      sku, name, slug, brand_id, category_id, subcategory_id, price_mad, promo_price_mad,
      stock, short_desc, description, specs_json, images_json, variants_json,
      is_published, is_new, is_bestseller, is_featured, sales_count, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1)`
  );

  const prodIds: number[] = [];
  for (const p of products) {
    const info = insertProd.run(
      p.sku,
      p.name,
      p.slug,
      brandMap.get(p.brand) ?? null,
      catMap.get(p.cat)!,
      catMap.get(p.sub) ?? null,
      p.price,
      p.promo,
      p.stock,
      p.shortDesc,
      p.description,
      JSON.stringify(p.specs),
      JSON.stringify(p.images),
      JSON.stringify(p.variants),
      p.isNew,
      p.isBestseller,
      p.isFeatured,
      p.salesCount
    );
    prodIds.push(Number(info.lastInsertRowid));
  }

  // 6. Seed Promotions
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  db.prepare(
    `INSERT INTO promotions (name, code, discount_percent, promo_price_mad, product_ids_json, starts_at, ends_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    'Offre Rentrée High-Tech',
    'CASATECH10',
    10,
    null,
    JSON.stringify([prodIds[0], prodIds[5], prodIds[13]]),
    now.toISOString(),
    nextMonth.toISOString()
  );

  db.prepare(
    `INSERT INTO promotions (name, code, discount_percent, promo_price_mad, product_ids_json, starts_at, ends_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(
    'Semaine Accessoires & Bureau',
    'BUREAU15',
    15,
    null,
    JSON.stringify([prodIds[16], prodIds[17], prodIds[18], prodIds[19]]),
    now.toISOString(),
    nextMonth.toISOString()
  );

  // 7. Seed a Demo Customer + Reviews + Sample Orders so dashboard stats are computed from real DB rows
  const custInfo = db
    .prepare(
      `INSERT INTO users (username, email, password_hash, role, full_name, phone, must_change_password)
       VALUES (?, ?, ?, 'customer', ?, ?, 0)`
    )
    .run('salma.bennani', 'salma.bennani@exemple.ma', hashPassword('Client2026!'), 'Salma Bennani', '+212 661 23 45 67');
  const custUserId = Number(custInfo.lastInsertRowid);

  db.prepare(
    `INSERT INTO customers (user_id, full_name, email, phone, city)
     VALUES (?, ?, ?, ?, ?)`
  ).run(custUserId, 'Salma Bennani', 'salma.bennani@exemple.ma', '+212 661 23 45 67', 'Casablanca');

  db.prepare(
    `INSERT INTO addresses (user_id, label, full_name, phone, city, neighborhood, street_address, is_default)
     VALUES (?, 'Domicile', ?, ?, 'Casablanca', 'Maârif', '42 Rue Jura, Appartement 4', 1)`
  ).run(custUserId, 'Salma Bennani', '+212 661 23 45 67');

  const insertReview = db.prepare(
    'INSERT INTO reviews (product_id, user_id, author_name, rating, comment, is_verified) VALUES (?, ?, ?, ?, ?, 1)'
  );
  insertReview.run(prodIds[0], custUserId, 'Salma Bennani', 5, 'Livraison rapide à Casablanca en moins de 24h. Produit neuf et conforme.');
  insertReview.run(prodIds[5], custUserId, 'Youssef El Amrani', 5, 'Le MacBook Air M4 est incroyablement silencieux et la batterie tient deux journées de travail.');
  insertReview.run(prodIds[16], null, 'Karim Tazi', 4, 'Très confortable pour coder toute la journée, la molette est un vrai plus.');
  insertReview.run(prodIds[18], null, 'Nadia Chraïbi', 5, 'Écran 4K net, le port USB-C 90W simplifie complètement mon bureau.');

  // Seed 4 realistic historical orders across statuses so charts and tables show real persisted records
  const sampleOrders = [
    {
      num: 'CT-2026-1001',
      name: 'Salma Bennani',
      phone: '+212 661 23 45 67',
      email: 'salma.bennani@exemple.ma',
      city: 'Casablanca',
      hood: 'Maârif',
      addr: '42 Rue Jura',
      method: 'Livraison à domicile à Casablanca',
      status: 'Livrée',
      daysAgo: 5,
      items: [
        { pid: prodIds[0], name: 'iPhone 16', sku: 'CT-IPH16-128', variant: 'Noir / 128 Go', price: 9990, qty: 1 },
        { pid: prodIds[15], name: 'Chargeur USB-C', sku: 'CT-GAN-65W', variant: 'Bleu Nuit', price: 329, qty: 1 },
      ],
    },
    {
      num: 'CT-2026-1002',
      name: 'Omar Idrissi',
      phone: '+212 662 88 19 04',
      email: 'omar.idrissi@exemple.ma',
      city: 'Rabat / Salé',
      hood: 'Agdal',
      addr: '18 Avenue Fal Ould Oumeir',
      method: 'Livraison Maroc',
      status: 'Livrée',
      daysAgo: 3,
      items: [{ pid: prodIds[5], name: 'MacBook Air M4', sku: 'CT-MBA-M4-256', variant: 'Minuit / 16 Go / 256 Go', price: 12790, qty: 1 }],
    },
    {
      num: 'CT-2026-1003',
      name: 'Kenza Alaoui',
      phone: '+212 670 44 12 90',
      email: 'kenza.alaoui@exemple.ma',
      city: 'Marrakech',
      hood: 'Guéliz',
      addr: '7 Boulevard Mohammed V',
      method: 'Livraison Maroc',
      status: 'En préparation',
      daysAgo: 1,
      items: [
        { pid: prodIds[11], name: 'iPad', sku: 'CT-IPAD-M2', variant: 'Gris sidéral / 128 Go', price: 6790, qty: 1 },
        { pid: prodIds[13], name: 'AirPods', sku: 'CT-AIRPODS-P2', variant: 'Blanc', price: 2590, qty: 1 },
      ],
    },
    {
      num: 'CT-2026-1004',
      name: 'Mehdi Berrada',
      phone: '+212 661 91 33 22',
      email: 'mehdi.berrada@exemple.ma',
      city: 'Casablanca',
      hood: 'Anfa',
      addr: '115 Boulevard d’Anfa',
      method: 'Retrait en boutique',
      status: 'En attente',
      daysAgo: 0,
      items: [{ pid: prodIds[18], name: 'Écran informatique', sku: 'CT-LG-27UP850', variant: '27 pouces 4K', price: 3990, qty: 1 }],
    },
  ];

  for (const o of sampleOrders) {
    const subtotal = o.items.reduce((acc, it) => acc + it.price * it.qty, 0);
    const createdAt = new Date(now.getTime() - o.daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const ordRes = db
      .prepare(
        `INSERT INTO orders (
          order_number, user_id, customer_name, customer_phone, customer_email,
          city, neighborhood, shipping_address, delivery_method, payment_method,
          subtotal_mad, discount_mad, shipping_fee_mad, total_mad, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COD', ?, 0, 0, ?, ?, ?, ?)`
      )
      .run(
        o.num,
        o.email === 'salma.bennani@exemple.ma' ? custUserId : null,
        o.name,
        o.phone,
        o.email,
        o.city,
        o.hood,
        o.addr,
        o.method,
        subtotal,
        subtotal,
        o.status,
        createdAt,
        createdAt
      );
    const orderId = Number(ordRes.lastInsertRowid);
    for (const it of o.items) {
      db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, sku, variant_label, unit_price_mad, quantity, line_total_mad)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(orderId, it.pid, it.name, it.sku, it.variant, it.price, it.qty, it.price * it.qty);
    }
  }
}
