# HINOV TEAM REPORT (HTR) 📱🚀

Application mobile professionnelle complète conçue pour digitaliser, simplifier et automatiser la production des rapports hebdomadaires d'activité pour les collaborateurs et la direction de **HINOV Group**.

---

## 🌟 Fonctionnalités Principales

### 👤 Espace Collaborateur (Mon Espace)
- **Dashboard personnel** : Visualisation de la progression de la semaine (Lundi à Vendredi), compteur des activités du jour et statut du rapport hebdomadaire.
- **Gestion des Activités Quotidiennes** : Ajout, édition, suppression et catégorisation des tâches journalières.
- **Rapport Hebdomadaire Automatisé** :
  - Détection automatique du numéro de semaine et de la période (Lundi-Vendredi).
  - Organisation stricte et étanche des activités par jour.
  - Section dédiée aux **Difficultés rencontrées**.
  - Section dédiée aux **Perspectives & Priorités de la semaine suivante**.
- **Amélioration avec Google Gemini AI ✨** : Reformulation dynamique, clarté et professionnalisation corporate automatique tout en respectant la vérité factuelle.
- **Génération & Prévisualisation PDF** : Rendu A4 haute résolution corporate HINOV avec intégration automatique de la photo de profil.
- **Envoi Automatique au Directeur** : Intégration Microsoft Graph API pour transmission directe par email vers l'adresse Outlook de la Direction.
- **Protection & Verrouillage** : Une fois le rapport validé et soumis, les activités sont verrouillées pour garantir l'intégrité de l'historique.
- **Historique & Archives** : Consultation et téléchargement des anciens rapports PDF à tout moment.
- **Profil & Sécurité** :
  - Prise de photo ou sélection galerie avec compression automatique.
  - Modification sécurisée du mot de passe avec indicateur de force (🔴/🟠/🟢).
  - Configuration de clé API Gemini personnelle (optionnelle).

---

### 👔 Espace Direction & Administration
- **Double Espace pour le Directeur** : Espace collaborateur personnel (son propre rapport est archivé mais non auto-envoyé à lui-même) + Espace de supervision.
- **Supervision & KPIs de l'équipe** :
  - Suivi en temps réel : Reçus (vert), Brouillons (orange), Non soumis (rouge).
  - Consultation, visualisation et téléchargement de tous les PDF de l'équipe.
  - Relance groupée des collaborateurs en retard par notification.
- **Annuaire & Gestion des Utilisateurs** :
  - Création de comptes collaborateurs et administrateurs.
  - Attribution des rôles (`Collaborateur`, `Directeur/Admin`, `Super Admin`).
  - Activation et désactivation instantanée des accès.
  - **Mots de Passe Temporaires Sécurisés** : Génération ou définition manuelle d'un mot de passe temporaire affiché **UNE SEULE FOIS** pour communication sécurisée.
  - **Changement obligatoire de mot de passe** (`must_change_password`) à la première connexion.
- **Paramètres Entreprise** : Configuration des adresses de réception Outlook et paramètres de rappel.

---

## 🛠 Stack Technique

- **Frontend Mobile** : React Native, Expo SDK 51, TypeScript, Expo Router (Navigation par fichiers)
- **UI / Design** : Palette corporate HINOV Group (Bleu nuit `#0B2240`, Ambre `#F59E0B`, Vert `#10B981`, Violet IA `#8B5CF6`), Lucide Icons
- **Backend & Données** : Supabase (PostgreSQL, Supabase Auth, Row Level Security - RLS, Supabase Storage)
- **Edge Functions (Serverless Deno)** :
  - `admin-create-user` : Création de compte sécurisée via Auth Admin
  - `admin-reset-password` : Réinitialisation et génération de mot de passe temporaire
  - `generate-report-pdf` : Rendu du template corporate HTML/PDF
  - `send-report-email` : Envoi du rapport et pièce jointe via **Microsoft Graph API**
  - `ai-improve-report` : Optimisation du contenu via **Google Gemini API**
- **PDF & Partage** : Expo Print & Expo Sharing

---

## 🚀 Démarrage & Installation

### 1. Cloner et installer les dépendances
```bash
cd "hinov team report"
npm install
```

### 2. Configuration des Variables d'Environnement
Créez ou adaptez le fichier `.env` à la racine :
```env
EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
EXPO_PUBLIC_GEMINI_API_KEY=votre-cle-gemini-optionnelle
```

### 3. Déploiement de la Base de Données Supabase
Exécutez dans l'éditeur SQL de votre console Supabase :
1. `supabase/schema.sql` (Structure des tables, ENUMs, triggers)
2. `supabase/rls.sql` (Politiques de sécurité Row Level Security)
3. `supabase/seed.sql` (Paramètres par défaut)

### 4. Lancer l'Application
```bash
# Lancer avec Expo
npm start

# Lancer sur le web
npm run web

# Lancer sur Android / iOS
npm run android
npm run ios
```

---

## 🔒 Sécurité et Bonnes Pratiques
- Aucune clé sensible (`service_role`, `client_secret` Microsoft) n'est exposée dans le code mobile.
- Les mots de passe existants ne sont jamais consultables ni affichés en clair.
- Les mots de passe temporaires créés par les administrateurs ne sont affichés qu'une seule fois.
- RLS strict garantissant l'isolation des données entre collaborateurs.

