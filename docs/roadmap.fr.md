🇫🇷 Version française | [🇬🇧 English version](roadmap.md)

---

# Roadmap

## V1

- ✅ Infra (NestJS, Vue.js, Docker Compose, Prisma)
- ✅ CI (GitHub Actions, pipeline de tests, synchronisation du backlog)
- ✅ Alphabet (interface VisualAlphabet + implémentation Hexahue)
- ✅ Cipher (pré-traitement, construction de grille, pas d'en-tête de métadonnées, choix délibéré anti-fuite)
- ✅ Moteur de rotation
- ✅ Codec de clé (encodage / décodage / validation base36)
- ✅ Stratégies d'ordre de lecture (4 directions + mode alterné)
- ✅ Renderers (PNG + SVG)
- ✅ Endpoints API (encode, decode, key)
- ✅ Frontend (vues encodage, décodage, clé toutes terminées, passe UI/UX terminée)
- ✅ Tests & couverture (suites unitaires/e2e backend + frontend, reporting Codecov, seuil global ≥85% confirmé)

## V2

- ✅ Interface française (i18n)
- ⬜ Mode de décodage animé
- ⬜ Ordre de lecture en spirale
- ✅ Score de corrélation (endpoint API)
- ✅ Authentification utilisateur
- ✅ Page d'aide (principe et réglages, en anglais et en français)
- ✅ Suivi des erreurs (Sentry, backend et frontend)
- ✅ Relais du suivi des erreurs, pour que les bloqueurs ne perdent pas les erreurs du frontend
- ✅ Endpoint de contrôle de santé, branché sur le healthcheck du conteneur de production
- ✅ Logs JSON structurés, sans donnée privée

## Idées pour plus tard (pas encore cadrées)

- Montrer l'encodage avant rotation à certains endroits (par exemple à
  côté du score de corrélation) : pourrait rendre l'efficacité du
  cryptogramme plus tangible, mais aucun item de backlog pour l'instant

## Section 4 - Maintenance

- [x] CI-006 - Lancer la CI sur la PR du bot changelog pour que son auto-merge aboutisse
- [x] FIX-007 - Installer dotenv dans l'image de production pour que `prisma migrate deploy` charge sa config
- [x] CHORE-014 - Bloquer TypeScript 7 et les majeures des types Node dans Dependabot
- [x] DOCS-002 - Corriger le README et la roadmap avant la fiche projet du portfolio
- [x] TEST-006 - Combler les trous de couverture par fichier
- [x] CHORE-015 - Charger la config prod uniquement depuis shared/env, supprimer l'interpolation via compose/.env et le secret DOMAIN
- [x] FIX-008 - Déployer les images taguées avec le SHA du commit plutôt que `latest` (`IMAGE_TAG` n'était jamais fixé)
- [x] CHORE-016 - Aligner le runtime Node sur la 26 LTS (CI, images Docker, engines, @types/node du frontend, docs)
- [x] FIX-009 - Corriger l'alerte ReDoS de effect (haute, figée par @prisma/config de Prisma 7)

---

`BACKLOG.md` (gitignored, local au mainteneur) est la source de vérité unique pour
le travail planifié au niveau de chaque item ; cette roadmap suit les phases de
plus haut niveau.
