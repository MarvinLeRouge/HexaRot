# Le principe de HexaRot {#concept}

HexaRot transforme un message texte en une image faite de carrés colorés, puis
brouille cette image pour qu'elle soit illisible sans la bonne clé.

Le point de départ est **Hexahue**, un alphabet visuel où chaque caractère est
un bloc de 2 carrés de large sur 3 carrés de haut, chaque carré étant d'une
couleur parmi quelques-unes. Tel quel, un message en Hexahue se lit facilement
pour qui connaît l'alphabet.

HexaRot ajoute une seconde étape : il découpe l'image en petits blocs carrés
et fait pivoter chacun d'eux. Les rotations portent sur les carrés
individuels, pas sur les caractères entiers : les caractères sont disloqués et
l'image ressemble à du bruit aléatoire. Seule une personne qui possède la clé
peut annuler les rotations et lire le message.

## Encoder un message {#encoding}

### Le message {#message}

Avant l'encodage, le message est passé en majuscules et les accents sont
retirés (é devient E, ç devient C). Hexahue couvre les lettres de A à Z, les
chiffres de 0 à 9, l'espace, le point et la virgule. Tout autre caractère est
ignoré, et le résultat indique la liste des caractères ignorés. Un message
peut compter jusqu'à 29 000 caractères.

### Taille du bloc pivot {#pivot-block-size}

L'image est découpée en blocs carrés de ce nombre de carrés de côté (de 1 à
255), et chaque bloc est pivoté. Des blocs plus grands déplacent les carrés
plus loin de leur position d'origine ; des blocs plus petits donnent un
brouillage plus fin. Une taille de 1 n'a aucun effet, puisque faire pivoter un
carré seul ne le change pas.

L'image est complétée par des carrés aléatoires pour que sa largeur et sa
hauteur soient toutes deux des multiples de cette taille.

### Séquence de rotation {#rotation-sequence}

L'ordre dans lequel les quatre rotations (0°, 90°, 180° et 270°) sont
appliquées aux blocs. Le premier bloc reçoit la première rotation, le deuxième
bloc la deuxième, et ainsi de suite ; après le quatrième bloc, la séquence
recommence. Faites glisser les rotations pour les réordonner, ou utilisez le
clavier : saisissez-en une avec Espace, déplacez-la avec les flèches,
déposez-la avec Espace.

### Sens de rotation {#rotation-direction}

Indique si les rotations se font dans le sens horaire ou antihoraire.

### Sens de lecture {#reading-order}

Le chemin suivi pour parcourir les blocs, qui détermine quel bloc reçoit
quelle rotation : de gauche à droite puis de haut en bas, de droite à gauche,
de haut en bas ou de bas en haut. Les variantes "alternées" inversent le
sens à chaque nouvelle ligne ou colonne, comme un serpent.

### Taille du cryptogramme {#cryptogram-size}

La taille de chaque carré dans l'image : petite (8 pixels), moyenne
(16 pixels) ou grande (32 pixels). Elle ne change rien au brouillage, seulement
aux dimensions de l'image. La taille est enregistrée dans la clé : inutile de
la retenir.

L'image ne peut pas dépasser environ 66 millions de pixels. Les tailles petite
et moyenne passent toujours, jusqu'à la limite de 29 000 caractères. La taille
grande dépend de la longueur du message et du bloc pivot : avec le bloc de 5
par défaut, elle accepte environ 10 000 caractères, et les très grands blocs
peuvent ne pas passer du tout. La page Encoder vous prévient avant l'envoi
quand une combinaison est trop grande.

### Avertissement de faiblesse {#weakness-warning}

Un caractère Hexahue mesure 2 carrés de large et 3 carrés de haut. Si la
taille du bloc pivot est un multiple de 2 ou de 3 (par exemple 2, 3, 4 ou 6),
les blocs s'alignent sur la grille des caractères, et les rotations laissent
visible une plus grande part du motif d'origine. HexaRot encode quand même le
message, mais affiche un avertissement avec le résultat. Cocher "Ignorer les
avertissements de faiblesse" masque seulement cet avertissement : le
cryptogramme n'en devient pas plus solide. Des tailles comme 5, 7 ou 11 donnent
un résultat plus solide.

## La clé {#key}

La clé regroupe tous les réglages (taille du bloc pivot, séquence et sens de
rotation, sens de lecture et taille du cryptogramme) dans un code court comme
`HR1·0005` : les lettres HR, un numéro de version, un séparateur, puis
quelques caractères.

La clé ne dépend pas du message : vous pouvez la réutiliser pour autant de
messages que vous le souhaitez. Choisissez "Clé existante" sur la page
Encoder pour encoder avec une clé que vous avez déjà ; ses réglages, y compris
la taille du cryptogramme, remplacent alors ceux du formulaire.

HexaRot n'enregistre ni vos clés ni vos messages. Copiez la clé dès
l'encodage : sans elle, l'image ne pourra pas être décodée.

## Décoder un cryptogramme {#decoding}

Pour décoder, il faut deux éléments : l'image (PNG ou SVG) et la clé qui a
servi à l'encoder. La clé contient aussi la taille du cryptogramme, il n'y a
donc rien d'autre à choisir. Envoyez le fichier, collez la clé, et HexaRot
annule les rotations puis relit les caractères.

L'image n'indique pas où le message se termine, volontairement, pour ne rien
révéler de sa longueur. Le texte décodé peut donc se terminer par des
caractères `?` : ils proviennent du remplissage aléatoire, et peuvent être nombreux avec
une grande taille de bloc pivot. Tout emplacement qui ne correspond à aucun
caractère est affiché sous la forme `?`.
