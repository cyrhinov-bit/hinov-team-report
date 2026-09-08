# HINOV Team Report (HTR)

Application de suivi des activités hebdomadaires et de génération de rapports pour les équipes de **HINOV Group**, avec assistance IA (Google Gemini) et backend sécurisé (PostgreSQL / Supabase).

---

## 🚀 Démarrage rapide

### Prérequis
- **Node.js** (>= 20)
- **pnpm** (>= 9)
- Une instance PostgreSQL / Supabase

### Installation des dépendances
```bash
pnpm install
```

---

## 💻 Développement

### 1. Application Mobile & Web (Expo / React Native)
```bash
# Lancer l'application Expo (mobile / web)
pnpm --filter @workspace/hinov-team-report run dev

# Ou directement pour une plateforme :
pnpm --filter @workspace/hinov-team-report run web
pnpm --filter @workspace/hinov-team-report run android
pnpm --filter @workspace/hinov-team-report run ios
```

### 2. Serveur d'API Backend (Express 5)
```bash
pnpm --filter @workspace/api-server run dev
```

### 3. Bac à sable de maquettes UI (Vite)
```bash
pnpm --filter @workspace/mockup-sandbox run dev
```

---

## ⚙️ Variables d'environnement

### Serveur d'API (`artifacts/api-server`)
Créer un fichier `.env` ou définir les variables suivantes :
- `PORT` : Port du serveur API (défaut `5000` ou `3000`).
- `SUPABASE_URL` : URL de votre instance Supabase (ex: `https://xyz.supabase.co` ou `http://127.0.0.1:54321`).
- `SUPABASE_ANON_KEY` : Clé publique anonyme Supabase.
- `SESSION_SECRET` : Clé secrète utilisée pour le chiffrement symétrique AES-256 des clés API Gemini.
- `DATABASE_URL` : Chaîne de connexion PostgreSQL directe (pour Drizzle ORM).

### Application Frontend (`artifacts/hinov-team-report`)
- `EXPO_PUBLIC_API_URL` : URL du serveur d'API (défaut `http://localhost:5000`).

---

## 🏗️ Structure du Projet

```
HINOV-Team-Report/
├── artifacts/
│   ├── hinov-team-report/     # Application React Native / Expo Router v57
│   ├── api-server/            # Backend API Express 5 + Proxy Supabase & Gemini
│   └── mockup-sandbox/        # Bac à sable Vite + Tailwind
├── lib/
│   ├── api-client-react/      # Hooks React Query générés
│   ├── api-spec/              # Spécification OpenAPI & config Orval
│   ├── api-zod/               # Schémas de validation Zod
│   └── db/                    # Schémas et migrations Drizzle ORM
├── supabase/
│   └── migrations/            # Schémas SQL et politiques RLS
└── package.json / pnpm-workspace.yaml
```

---

## 🛠️ Commandes utiles

- `pnpm run typecheck` — Vérification des types TypeScript sur l'ensemble du projet
- `pnpm run build` — Compilation de tous les packages
- `pnpm --filter @workspace/api-spec run codegen` — Régénération des clients API depuis la spec OpenAPI

