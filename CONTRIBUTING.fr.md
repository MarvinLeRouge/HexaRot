🇫🇷 Version française | [🇬🇧 English version](CONTRIBUTING.md)

---

# Contribuer à HexaRot

## Environnement de développement local

Le développement local passe par un reverse proxy Traefik local, sur le même principe
qu'en production, plutôt que de publier les ports des conteneurs directement.

### Prérequis

- Une instance Traefik déjà lancée localement, rattachée à un réseau Docker externe
  nommé `traefik-public`, avec un entrypoint `web` sur le port 80.
- Une entrée dans `/etc/hosts` faisant pointer `hexarot.marvinlerouge.local` vers
  `127.0.0.1` :
  ```
  127.0.0.1 hexarot.marvinlerouge.local
  ```

### Lancer la stack

```bash
docker compose up
```

- Frontend : `http://hexarot.marvinlerouge.local`
- API backend : `http://hexarot.marvinlerouge.local/api/...`
- PostgreSQL reste accessible directement sur `127.0.0.1:5433` pour l'outillage local
  (Prisma Studio, `psql`) - non routé via Traefik.

## Configuration de GitHub Actions

Le pipeline CI/CD nécessite un Personal Access Token (classic) stocké comme secret de
repository.

**Pourquoi un classic token ?** L'API GraphQL GitHub Projects v2 ne supporte pas les
fine-grained tokens à ce jour. Un classic token est donc requis pour les opérations sur
le Kanban.

### 1. Créer le token

Aller dans **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
et générer un nouveau token avec les scopes suivants :

- `repo` (scope entier)
- `project`

Nommer le token `HEXAROT_PROJECT_TOKEN`.

### 2. Stocker le token

Aller dans **repo GitHub → Settings → Secrets and variables → Actions → Repository secrets**
et créer un secret nommé `HEXAROT_PROJECT_TOKEN` avec la valeur du token.

### Sécurité

Le token est lié au compte propriétaire du repo. Ne jamais le committer dans le code.
Le renouveler immédiatement s'il est compromis.
