🇫🇷 Version française | [🇬🇧 English version](operations.md)

---

# Opérations

## Développement local

Le développement local est entièrement conteneurisé avec Docker Compose, et passe
par un reverse proxy Traefik local pour refléter la production plutôt que de
publier les ports des conteneurs directement. Voir [CONTRIBUTING.fr.md](i18n/fr/CONTRIBUTING.fr.md)
pour la configuration initiale de Traefik et de `/etc/hosts`.

```bash
cp .env.example .env
docker compose up
```

- Frontend : `http://hexarot.marvinlerouge.local`
- API backend : `http://hexarot.marvinlerouge.local/api/...`
- PostgreSQL : accessible directement sur `127.0.0.1:5433` pour l'outillage local
  (Prisma Studio, `psql`) ; ce port n'est pas routé via Traefik.

## Services

| Service | Image / build | Notes |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Conditionné par healthcheck ; `backend` attend qu'il soit sain avant de démarrer |
| `backend` | `backend/Dockerfile.dev` | Serveur de dev NestJS avec le code source monté en bind ; applique les migrations Prisma en attente (`migrate deploy`) et lance le seed au démarrage (seed ignoré si `SEED_ADMIN_PASSWORD` est vide ; une valeur placeholder fait échouer le seed et le backend ne démarre pas) ; routé via Traefik sous `/api` |
| `frontend` | `frontend/Dockerfile.dev` | Serveur de dev Vite avec le code source monté en bind ; routé via Traefik à la racine de l'hôte |

`backend` et `frontend` rejoignent tous deux le réseau Docker externe
`traefik-public` (créé par l'instance Traefik locale), en plus du réseau interne
du projet.

## Variables d'environnement

Définies dans `.env` (à copier depuis `.env.example`, non commité) :

| Variable | Utilisée par | Rôle |
|---|---|---|
| `POSTGRES_USER` | `postgres`, `backend` | Utilisateur de la base de données |
| `POSTGRES_PASSWORD` | `postgres`, `backend` | Mot de passe de la base de données |
| `POSTGRES_DB` | `postgres`, `backend` | Nom de la base de données |
| `PORT` | `backend` | Port sur lequel le serveur NestJS écoute dans le conteneur (`3000`) |
| `LOG_LEVEL` | `backend` | Niveau de log minimal (`info` par défaut ; `debug`, `warn`, `error`, `silent`...) |

`DATABASE_URL` pour le backend et `VITE_PROXY_TARGET` pour le frontend sont
dérivées automatiquement dans `docker-compose.yml` ; elles n'ont pas besoin
d'être définies manuellement.

### Production

Sur le VPS, sous `/home/mlr/marvinlerouge.dev/hexarot/`, `compose/` contient
uniquement le `docker-compose.prod.yml` récupéré par le workflow de déploiement,
et `shared/env/` contient les deux fichiers d'environnement (`chmod 600`, jamais
commités). Les conteneurs reçoivent leur configuration uniquement via
`env_file` : le fichier compose n'interpole rien depuis un fichier (le domaine
est écrit dans les règles Traefik ; `IMAGE_TAG` reçoit le SHA du commit déployé
via le workflow de déploiement, et vaut `latest` par défaut pour les commandes
compose manuelles).
`postgres` et `backend` chargent tous deux `app.env`, puis `secrets.env`, qui
est prioritaire.

| Fichier | Contenu | Modèle |
|---|---|---|
| `shared/env/app.env` | réglages non secrets : `NODE_ENV`, `PORT`, `FRONTEND_BASE_URL`, `JWT_EXPIRES_IN`, hôte SMTP et noms d'expéditeur, `SENTRY_ENVIRONMENT` | [`docker/env/app.env.example`](../docker/env/app.env.example) |
| `shared/env/secrets.env` | chaque sujet contenant un secret, regroupé en entier : `POSTGRES_*` et `DATABASE_URL`, `JWT_SECRET`, identifiants SMTP, `SEED_ADMIN_*`, DSN Sentry | [`docker/env/secrets.env.example`](../docker/env/secrets.env.example) |

`POSTGRES_PASSWORD` et le mot de passe contenu dans `DATABASE_URL` doivent
correspondre : le premier initialise le volume de la base (au premier démarrage
uniquement), le second sert à Prisma pour se connecter.

## Suivi des erreurs (Sentry)

Les erreurs non gérées du backend (les 5xx, pas les 4xx attendues) et les
erreurs non interceptées du frontend sont envoyées à Sentry. L'envoi est
désactivé dès que le DSN est vide, ce qui est le cas par défaut en
développement local et en CI. Seules les traces d'appel partent : ni corps de
requête, ni en-têtes, ni cookies, ni query string, ni informations utilisateur,
ni variables locales, ni lignes de code source, et pas de tracing ni de
session replay.

| Variable | Lue par | Source en local | Source en production |
|---|---|---|---|
| `SENTRY_BACKEND_DSN` | backend, à l'exécution | `.env` | `../shared/env/secrets.env` sur le VPS |
| `SENTRY_ENVIRONMENT` | backend, à l'exécution | `SENTRY_ENVIRONMENT` dans `.env` (`development`) | `app.env` (`production`) |
| `SENTRY_FRONTEND_DSN` | backend, à l'exécution (liste d'autorisation du relais) | `.env` | `secrets.env` |
| `VITE_SENTRY_DSN` | frontend, au build | `SENTRY_FRONTEND_DSN` dans `.env` | secret GitHub `VITE_SENTRY_DSN`, passé en argument de build |
| `VITE_SENTRY_ENVIRONMENT` | frontend, au build | `SENTRY_ENVIRONMENT` dans `.env` | `production`, fixé dans `build-push-deploy.yml` |

Le DSN du frontend se retrouve dans le bundle public : il identifie le projet,
ce n'est pas un secret.

Le frontend n'appelle pas Sentry directement : les bloqueurs de publicité et
la protection contre le pistage des navigateurs bloquent les requêtes vers
`*.sentry.io`. Il envoie ses événements à `/api/<empreinte de son DSN>` sur sa
propre origine, et le backend (`serveTunnelIntegration`) répond à ce chemin
avant Nest et transmet l'enveloppe à Sentry en flux. Seules les enveloppes du
`SENTRY_FRONTEND_DSN` et du DSN du backend sont relayées ; tout autre DSN
reçoit une 403. Le relais ne tourne que si le backend a un `SENTRY_BACKEND_DSN`, et
`SENTRY_FRONTEND_DSN` doit être exactement le DSN avec lequel le bundle a été
construit (`VITE_SENTRY_DSN`) : sinon, les événements du frontend sont perdus.
Le backend affiche un avertissement au démarrage quand un seul des deux est
défini. Le relais répond avant Nest, donc la limitation de débit et les
limites de taille de l'appli ne s'y appliquent pas ; un abus ne peut que
consommer le quota Sentry.

Configuration initiale, hors du dépôt :

1. Dans Sentry (région EU), créer deux projets : `hexarot-backend` (NestJS) et
   `hexarot-frontend` (Vue).
2. Dans les réglages *Security & Privacy* de chaque projet, activer *Data
   Scrubber*, *Use Default Scrubbers* et *Prevent Storing of IP Addresses*.
3. Ajouter le DSN du frontend comme secret du dépôt `VITE_SENTRY_DSN`.
4. Sur le VPS, ajouter `SENTRY_BACKEND_DSN=<DSN backend>` et
   `SENTRY_FRONTEND_DSN=<DSN frontend>` dans `../shared/env/secrets.env`, et
   `SENTRY_ENVIRONMENT=production` dans `../shared/env/app.env`, puis
   redéployer. Le backend charge les deux fichiers, `secrets.env` en dernier.

## Logs

Le backend journalise via pino (`nestjs-pino`) : chaque entrée, y compris les
messages de démarrage de Nest, est une ligne JSON sur stdout, lue avec
`docker logs hexarot-backend`. En développement local, les mêmes entrées sont
mises en forme (`pino-pretty`) ; avec `NODE_ENV=production`, c'est du JSON brut.

Chaque requête ajoute une ligne d'accès (`request completed`) avec son
identifiant, sa méthode, son chemin, son code de statut et son temps de
réponse. Comme le suivi des erreurs, elle ne contient aucune donnée privée : ni
en-têtes (donc pas de JWT), ni cookies, ni corps, ni query string, ni adresse du
client, et les messages désignent les utilisateurs par leur identifiant, jamais
par leur adresse e-mail. Les contrôles de santé ne sont pas journalisés.
`LOG_LEVEL` fixe le niveau minimal (`info` par défaut, `silent` sous les tests).

## Contrôle de santé

`GET /api/health` est public et répond `200 {"status":"ok"}` après un
`SELECT 1` sur la base, ou `503 {"status":"error"}` quand la base est
injoignable (non remonté à Sentry, comme toute erreur HTTP attendue). Il est
soumis à la limite de débit par défaut (20 requêtes par minute et par IP) : un
moniteur externe doit l'interroger au plus toutes les quelques secondes.

En production, `docker-compose.prod.yml` l'interroge toutes les 30 secondes
avec `wget` : Traefik ne route vers le backend qu'une fois celui-ci en bonne
santé, et le workflow de déploiement attend cet état jusqu'à 90 secondes, puis
échoue en affichant les dernières lignes de log du backend. La stack locale n'a
pas de healthcheck.

## CI/CD

GitHub Actions s'exécute sur les pull requests vers `main` (`.github/workflows/ci.yml`) :

- **Job backend :** installation des dépendances, `prisma migrate deploy`, seed de
  la base, lint, exécution de la suite Jest (contre un service PostgreSQL 16).
- **Job frontend :** installation des dépendances, lint, exécution de la suite
  Vitest (en parallèle du job backend).

`sync-backlog.yml` synchronise `BACKLOG.md` vers les Issues GitHub et un tableau
Kanban quand une pull request qui le modifie est mergée dans `main`. Il nécessite
un secret de repository `HEXAROT_PROJECT_TOKEN` (Personal Access Token classic
avec les scopes `repo` et `project`) ; voir
[CONTRIBUTING.fr.md](i18n/fr/CONTRIBUTING.fr.md) pour la configuration. Quand
toutes les dépendances d'une entrée sont `done`, le workflow la passe en `ready`
via sa propre pull request, que GitHub merge automatiquement une fois le check
obligatoire "CI status" passé. Il faut pour cela activer "Allow auto-merge" dans
les réglages du dépôt. Une relance ferme toute pull request d'auto-promotion
précédente encore ouverte, au lieu d'en ouvrir une en double. Les tests du script
se lancent avec `node --test .github/scripts/`.

`CHANGELOG.md` est régénéré principalement par un hook local `post-commit`
(ajouté à la fin de `.husky/post-commit`, qui appelle
`scripts/changelog-post-commit.sh`) qui exécute git-cliff et intègre le
résultat dans le même commit avant même qu'il soit poussé, si bien qu'une PR
de fonctionnalité contient déjà sa propre entrée de changelog. Chaque
développeur ajoute cet appel à son propre `.husky/post-commit` local
(gitignoré, personnel par machine, comme les autres hooks Husky non
`pre-commit` de ce repo ; non automatisable via `pre-commit install` puisque
ce repo utilise Husky et non le framework `pre-commit`).

En secours, `changelog.yml` régénère toujours `CHANGELOG.md` à chaque push sur
`main` et ouvre une pull request plutôt que de pousser directement, au cas où
un commit atterrirait sur `main` sans passer par le hook local. Il nécessite
l'activation de « Allow GitHub Actions to create and approve pull requests »
dans les paramètres Actions du repository.
