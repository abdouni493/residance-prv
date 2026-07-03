# 🏨 Résidence El Nour — Gestion de Résidence & Hôtel

Application web complète de gestion de résidence privée et d'hôtels.
**React + TypeScript + Vite + TailwindCSS + Framer Motion + Recharts + Zustand.**
100 % front-end (aucun backend) — les données sont générées et persistées dans le navigateur (localStorage).

## ✨ Caractéristiques

- **Bilingue FR / العربية** avec bascule instantanée et **RTL complet** (polices Cairo/Tajawal).
- **Dark mode premium** : dégradés fluides, glassmorphism, fond animé, particules.
- **Animations partout** (Framer Motion) : transitions de page, modaux, drawers, cascades, compteurs animés.
- **10 modules** : Tableau de bord, Réservations, Chambres, Services, Clients, Travailleurs, Dépenses, Caisse, Rapports, Paramètres.
- **Assistant de réservation en 5 étapes** (client → dates → chambres → services → récapitulatif/paiement).
- **Calendrier (timeline)** de disponibilité des chambres.
- **Permissions** par travailleur (filtrent le menu et les actions).
- **Impression** des bons de réservation et des rapports (mise en page A4).
- **Sauvegarde / restauration** JSON dans les paramètres.

## 🚀 Démarrage

```bash
npm install
npm run dev
# http://localhost:5173
```

Autres scripts : `npm run build` (production), `npm run preview`, `npm run typecheck`.

## 🔐 Connexion

- Cliquez sur **« Essayer avec un compte démo (Admin) »** pour un accès total immédiat.
- Ou connectez-vous avec : **admin** / **demo123**
- Un compte travailleur de démo existe aussi : **reception** / **worker123** (accès restreint : Tableau de bord, Réservations, Clients — pour tester le filtrage par permissions).

## 📊 Données de démonstration

Générées de façon déterministe au premier lancement (dates relatives à aujourd'hui) :
6 étages · 24 chambres · 4 catégories · 3 services · 15 clients · 40 réservations ·
8 travailleurs · 25 dépenses · 5 maintenances · 15 transactions de caisse.

> Pour réinitialiser les données : videz le `localStorage` du navigateur (clé `residence-store`).

## 🗂️ Structure

```
src/
├── components/       # layout, ui (kit réutilisable), forms, reservations
├── pages/            # 11 pages (Login + 10 modules)
├── store/            # appStore (Zustand) + selectors + hooks
├── data/             # seed déterministe + constantes + auth démo
├── i18n/             # contexte FR/AR + traductions
├── lib/              # utils, lookups, print (factures/rapports)
├── animations.ts     # variants Framer Motion
└── design-tokens.ts  # palette & dégradés
```

## 🧱 Stack

React 18 · TypeScript · Vite 5 · TailwindCSS 3 · Framer Motion 11 · Recharts 2 ·
Zustand 5 · React Router 6 · lucide-react · date-fns · clsx · tailwind-merge.
