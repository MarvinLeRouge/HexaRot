# How HexaRot works {#concept}

HexaRot turns a text message into an image made of coloured squares, then
scrambles that image so it cannot be read without the right key.

It starts from **Hexahue**, a visual alphabet where each character is a block
of 2 squares wide by 3 squares tall, each square in one of a few colours.
Written as is, a Hexahue message is easy to read for anyone who knows the
alphabet.

HexaRot adds a second step: it cuts the image into small square blocks and
rotates each one. The rotations work on individual squares, not on whole
characters, so the characters are broken apart and the image looks like
random noise. Only someone with the key can undo the rotations and read the
message.

## Encoding a message {#encoding}

### The message {#message}

Before encoding, the message is converted to uppercase and accents are
removed (é becomes E, ç becomes C). Hexahue covers the letters A to Z, the
digits 0 to 9, the space, the full stop and the comma. Any other character is
dropped, and the result lists the characters that were dropped.

### Pivot block size {#pivot-block-size}

The image is cut into square blocks of this many squares per side (from 1 to
255), and each block is rotated. Larger blocks move squares further from
their original place; smaller blocks make a finer scramble. A size of 1 does
nothing, since rotating a single square leaves it unchanged.

The image is padded with random squares so that its width and height are
both multiples of this size.

### Rotation sequence {#rotation-sequence}

The order in which the four rotations (0°, 90°, 180° and 270°) are applied to
the blocks. The first block gets the first rotation, the second block the
second one, and so on; after the fourth block, the sequence starts over.
Drag the rotations to reorder them, or use the keyboard: pick one up with
Space, move it with the arrow keys, drop it with Space again.

### Rotation direction {#rotation-direction}

Whether the rotations turn clockwise or counter-clockwise.

### Reading order {#reading-order}

The path used to visit the blocks, which decides which block gets which
rotation: left to right then top to bottom, right to left, top to bottom, or
bottom to top. The "alternating" variants reverse the direction at every new
row or column, like a snake.

### Cryptogram size {#cryptogram-size}

The size of each square in the image: small (8 pixels), medium (16 pixels) or
large (32 pixels). It does not change the scramble, only how big the image
is. You need the same size to decode the image later.

### Weakness warning {#weakness-warning}

A Hexahue character is 2 squares wide and 3 squares tall. If the pivot block
size is a multiple of 2 or of 3 (for example 2, 3, 4 or 6), the blocks line
up with the character grid, and the rotations leave more of the original
pattern visible. HexaRot still encodes the message, but shows a warning with
the result. Ticking "Suppress weakness warnings" only hides that warning: it
does not make the cryptogram stronger. Sizes such as 5, 7 or 11 give a
stronger result.

## The key {#key}

The key packs every setting (pivot block size, rotation sequence, rotation
direction, reading order and cryptogram size) into a short code such as
`HR1·0005`: the letters HR, a version number, a separator, then a few
characters.

The key does not depend on the message, so you can reuse it for as many
messages as you like. Use "Existing key" on the Encode page to encode with a
key you already have; its settings, including the cryptogram size, then
replace the ones in the form.

HexaRot does not store your keys or your messages. Copy or download the key
and the cryptogram size as soon as you encode: without them, the image cannot
be decoded.

## Decoding a cryptogram {#decoding}

To decode, you need three things: the image (PNG or SVG), the key it was
encoded with, and the cryptogram size it was encoded at. The key records the
size too, but the Decode page still asks for it: pick the same size as when
encoding. Upload the file, paste the key, pick the size, and HexaRot undoes
the rotations and reads the characters back.

The image does not record where the message ends, on purpose, so that it
gives away nothing about the message length. The decoded text may therefore
end with `?` characters: they come from the random padding, and there can be many
of them with a large pivot block size. Any character position that matches no
character is shown as `?`.
