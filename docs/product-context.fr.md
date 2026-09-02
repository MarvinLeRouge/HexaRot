🇫🇷 Version française | [🇬🇧 English version](product-context.md)

---

# Contexte produit

## Ce qu'est HexaRot

HexaRot est un chiffre visuel qui combine l'encodage de symboles par couleur avec
des rotations géométriques de blocs, pour produire des cryptogrammes faciles à
générer et difficiles à lire. Les paramètres de chiffrement (taille de bloc,
décalage de rotation, ordre de lecture, et plus) sont condensés dans une clé
compacte, offrant un contrôle fin sur la complexité de la sortie.

## Nature et public

HexaRot est une application web avec une API intégrée. L'interface web est le
point d'entrée principal ; l'API permet l'intégration dans des projets tiers mais
n'est pas l'objectif premier.

Le public visé est toute personne intéressée par la cryptographie visuelle en tant
que concept. Les usages spécifiques au geocaching (l'alphabet Hexahue est issu de
cette communauté) ne sont pas mis en avant comme un public cible particulier.

## Le chiffre, en bref

- **Alphabet visuel :** basé sur Hexahue, où chaque caractère est un bloc de 2×3
  cases de couleur. Le système repose sur une abstraction `VisualAlphabet`
  permettant d'ajouter d'autres alphabets visuels compatibles (grille, substitution
  caractère par caractère) à l'avenir ; seul Hexahue est implémenté aujourd'hui.
- **Pré-traitement :** le texte est mis en majuscules et les caractères accentués
  sont translittérés (é→E, à→A, ç→C…) ; tout caractère hors de l'alphabet et hors
  translittération est signalé à l'utilisateur plutôt que silencieusement ignoré.
- **Construction de la grille :** le message est disposé en lignes dimensionnées
  pour être un multiple de la taille de bloc pivot, avec un padding aléatoire
  complétant la grille.
- **Rotation :** la grille est divisée en blocs pivots, chacun tourné selon la
  séquence définie dans la clé. La rotation s'applique aux cases de couleur
  individuelles, pas aux symboles entiers, ce qui disloque le motif visuel et
  produit le bruit apparent du cryptogramme.
- **La clé :** une chaîne base36 compacte, réutilisable et indépendante du message
  (préfixe `HR`) condensant la version du système, la taille de bloc pivot, la
  séquence et la direction de rotation, et l'ordre de lecture. Voir l'[ADR 0001](adr/0001-no-message-length-exposure.md)
  pour comprendre pourquoi la clé et le cryptogramme ne contiennent délibérément
  aucune métadonnée de longueur.

## Objectif du projet

HexaRot est un projet personnel à double vocation :

- **Apprentissage :** TypeScript strict, architecture NestJS (modules, injection
  de dépendances, pipes), Prisma + PostgreSQL, Vue.js 3 Composition API, rendu
  d'images avec Sharp, encodage base36, algorithmes de rotation de matrices 2D,
  CI/CD GitHub Actions.
- **Portfolio :** démontrer une approche structurée sur un domaine algorithmique
  non trivial, du design du chiffre jusqu'à la livraison full-stack testée et
  documentée.

Voir [docs/roadmap.fr.md](roadmap.fr.md) pour ce qui est implémenté et ce qui est
prévu.
