🇫🇷 Version française | [🇬🇧 English version](CONTRIBUTING.md)

---

# Contribuer à HexaRot

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
