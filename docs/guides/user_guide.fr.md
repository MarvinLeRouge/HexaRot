🇫🇷 Version française | [🇬🇧 English version](user_guide.md)

---

# Guide utilisateur

Ce guide couvre l'usage de l'interface web HexaRot : Encode, Decode et Key.

## Encode : texte → cryptogramme

1. Aller sur la vue **Encode**.
2. Saisir ou coller le message à encoder. Il sera mis en majuscules, et les
   caractères accentués translittérés (é→E, à→A, ç→C…) automatiquement. Tout
   caractère que HexaRot ne peut pas représenter est signalé afin d'ajuster le
   message.
3. Choisir les paramètres de chiffrement :
   - **Taille de bloc pivot** : la taille (en cases) des blocs carrés selon
     lesquels la grille est tournée.
   - **Séquence et direction de rotation** : quelle rotation s'applique à chaque
     bloc, dans quel ordre, sens horaire ou antihoraire.
   - **Ordre de lecture** : la direction de parcours des blocs (gauche-droite/
     haut-bas, et variantes), avec un mode alterné optionnel.
   - **Taille de sortie** : small, medium ou large.
4. Si une combinaison de paramètres affaiblit le cryptogramme (détecté via une
   vérification par PGCD par rapport aux dimensions du symbole de l'alphabet),
   un avertissement s'affiche ; il est possible d'ajuster les paramètres ou de
   continuer malgré tout.
5. Soumettre pour obtenir le cryptogramme (PNG et SVG) et la clé générée.
   **Sauvegarder la clé** : elle n'est stockée nulle part par HexaRot, et c'est
   le seul moyen de décoder le message par la suite.
6. Copier ou télécharger le cryptogramme et la clé.

## Decode : cryptogramme + clé → texte

1. Aller sur la vue **Decode**.
2. Charger le fichier cryptogramme (PNG ou SVG) à décoder.
3. Saisir la clé utilisée pour l'encoder, ainsi que la taille de sortie utilisée
   lors de l'encodage.
4. Soumettre pour révéler le message décodé.

Le décodage traite toujours la grille entière ; si le message original était
plus court que la capacité de la grille, les caractères de padding se décodent
en `?` et peuvent être ignorés sans risque, ils ne portent aucune information
sur la longueur du message original.

## Key : générer ou analyser

- **Générer** : choisir des paramètres de chiffrement sans encoder de message,
  pour obtenir une clé réutilisable à l'avance (utile pour partager une clé
  avant l'envoi d'un message encodé).
- **Analyser** : coller une clé existante pour voir les paramètres qu'elle
  encode (taille de bloc pivot, séquence et direction de rotation, ordre de
  lecture).

## Résultats périmés

Si un paramètre est modifié après l'obtention d'un résultat, le résultat
précédent est marqué comme périmé plutôt que supprimé, ce qui permet de le
copier ou le télécharger malgré tout avant de décider de soumettre à nouveau
avec les nouveaux paramètres.
