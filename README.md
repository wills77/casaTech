# CasaTech — Plateforme E-Commerce High-Tech (Maroc)

> *« Toute la technologie, au même endroit. »* — Casablanca, Maroc · Devise : Dirham marocain (MAD)

## 1. Architecture Technique

- **Frontend** : React 19 + TypeScript + Tailwind CSS v4 + Lucide Icons
- **Backend** : Express (`server.ts`) avec validation stricte des schémas via **Zod**
- **Base de données** : SQLite persistant via `node:sqlite` (`data/casatech.db`, mode WAL, clés étrangères activées)
- **Authentification & Sécurité** :
  - Hachage des mots de passe via `crypto.scryptSync` + sel aléatoire et comparaison temps constant (`crypto.timingSafeEqual`).
  - Sessions stockées en base (`sessions`) avec cookies `HttpOnly`, `SameSite=Lax` et signature HMAC-SHA256.
  - Contrôle d'accès par rôle (`requireAuth`, `requireAdmin`) vérifié côté serveur à chaque requête.
  - Recalcul intégral des prix, codes promotionnels, frais de livraison par zone et vérification atomique des stocks côté backend lors de toute commande (`POST /api/orders`).
  - Traçabilité complète des mouvements de stock (`inventory_movements`) et des opérations sensibles (`audit_logs`).

## 2. Schéma de Base de Données (`server/db.ts`)

- `users` & `sessions` — Comptes clients et administrateur, drapeau `must_change_password`
- `categories` & `brands` — Catégories hiérarchiques (5 principales, 26 sous-catégories) et marques
- `products` — Catalogue avec SKU, prix MAD, prix promo, stock, variantes JSON, spécifications JSON
- `customers` & `addresses` — Carnets d'adresses clients
- `orders` & `order_items` — Commandes avec numéros uniques `CT-YYYY-XXXX` et statuts suivis
- `reviews`, `promotions`, `favorites`, `site_settings`, `inventory_movements`, `newsletter_subscribers`, `contact_messages`, `audit_logs`

## 3. Initialisation et Variables d'Environnement

Copiez `.env.example` vers `.env` et personnalisez les secrets avant mise en production :

- `SESSION_SECRET` : Clé secrète aléatoire pour la signature des cookies de session.
- `ADMIN_INITIAL_USERNAME` / `ADMIN_INITIAL_PASSWORD` : Utilisés uniquement au premier démarrage si aucun compte administrateur n'existe. **Changez impérativement le mot de passe initial dès la première connexion sur `/admin`.**
- `PAYMENT_GATEWAY_ENABLED` : Maintenu à `false` par défaut ; activer uniquement après intégration réelle d'un prestataire marocain (CMI / Payzone).

## 4. Commandes

- Développement : `npm run dev` (Express + Vite HMR middleware sur le port `3000`)
- Vérification TypeScript : `npm run lint`
- Build de production : `npm run build`
- Démarrage production : `npm start` (`node server.ts`)
