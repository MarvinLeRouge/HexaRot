🇫🇷 Version française | [🇬🇧 English version](SECURITY.md)

---

# Politique de sécurité

## Versions supportées

HexaRot est en développement actif, pré-1.0. Seul l'état courant de la branche
`main` est supporté ; il n'y a pas de rétroportage de correctifs vers d'anciens
tags.

## Signaler une vulnérabilité

Si vous découvrez un problème de sécurité (par exemple, un moyen de faire fuiter
le contenu ou la longueur d'un message chiffré via le cryptogramme, ou une
vulnérabilité dans l'API ou les dépendances), merci de le signaler en privé plutôt
que d'ouvrir une issue publique :

- Utilisez le [signalement privé de vulnérabilités](https://github.com/MarvinLeRouge/HexaRot/security/advisories/new)
  de GitHub pour ce dépôt, ou
- Contactez le mainteneur directement par email (voir le profil GitHub pour les
  coordonnées).

Merci d'inclure les étapes de reproduction et, si possible, le composant concerné
(module backend, vue frontend, ou dépendance).

## Périmètre

HexaRot est un chiffre visuel à visée d'obfuscation et d'apprentissage, et non un
schéma de chiffrement validé cryptographiquement. Il évite délibérément de laisser
fuiter la longueur du message dans le cryptogramme (voir l'[ADR 0001](docs/adr/0001-no-message-length-exposure.md)),
mais ne doit pas être utilisé pour protéger des données sensibles face à un
attaquant déterminé.
