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
dropped, and the result lists the characters that were dropped. A message can
be up to 29,000 characters long.

### Pivot block size {#pivot-block-size}

The image is cut into square blocks of this many squares per side (from 1 to
255), and each block is rotated. Larger blocks move squares further from
their original place; smaller blocks make a finer scramble. A size of 1 does
nothing, since rotating a single square leaves it unchanged.

The image is padded with random squares so that its width and height are
both multiples of this size.

### Rotation sequence {#rotation-sequence}

The angles (0°, 90°, 180° or 270°, clockwise) applied to the blocks, from 4
to 32 of them; the same angle can come back several times. The first block
gets the first angle, the second block the second one, and so on; after the
last angle, the sequence starts over. The form starts on 8 random angles, so
the default is not a guessable one: set the number of rotations, pick each
angle, or press Shuffle to draw new ones. At least one angle must be other
than 0°.

A longer sequence makes a key harder to guess, but HexaRot remains a visual
cipher, not strong encryption: someone who guesses the pivot block size and
the reading order can work out the angles one block at a time.

### Reading order {#reading-order}

The path used to visit the blocks, which decides which block gets which
rotation: left to right then top to bottom, right to left, top to bottom, or
bottom to top. The "alternating" variants reverse the direction at every new
row or column, like a snake.

### Cryptogram size {#cryptogram-size}

The size of each square in the image: small (8 pixels), medium (16 pixels) or
large (32 pixels). It does not change the scramble, only how big the image
is. The size is stored in the key, so you do not need to remember it.

The image cannot exceed about 66 million pixels. Small and medium always fit,
up to the 29,000 character limit. Large depends on the message length and the
pivot block size: with the default block of 5 it fits about 10,000
characters, and very large blocks may not fit at all. The Encode page warns
you before sending when a combination is too large.

### Weakness warning {#weakness-warning}

A Hexahue character is 2 squares wide and 3 squares tall. If the pivot block
size is a multiple of 2 or of 3 (for example 2, 3, 4 or 6), the blocks line
up with the character grid, and the rotations leave more of the original
pattern visible. HexaRot still encodes the message, but shows a warning with
the result. Ticking "Suppress weakness warnings" only hides that warning: it
does not make the cryptogram stronger. Sizes such as 5, 7 or 11 give a
stronger result.

## The key {#key}

The key packs every setting (pivot block size, rotation sequence, reading
order and cryptogram size) into a short code such as
`HR2·0ZL3ID`: the letters HR, a version number, a separator, then 6 to 16
characters (more for a longer rotation sequence). Keys starting with `HR1`,
made before the rotation sequence could vary in length, still work; they
also hold a rotation direction, shown when you parse one.

The key does not depend on the message, so you can reuse it for as many
messages as you like. Use "Existing key" on the Encode page to encode with a
key you already have; its settings, including the cryptogram size, then
replace the ones in the form.

HexaRot does not store your keys or your messages. Copy the key as soon as
you encode: without it, the image cannot be decoded.

## Decoding a cryptogram {#decoding}

To decode, you need two things: the image (PNG or SVG) and the key it was
encoded with. The key also records the cryptogram size, so there is nothing
else to pick. Upload the file, paste the key, and HexaRot undoes the rotations
and reads the characters back.

The image does not record where the message ends, on purpose, so that it
gives away nothing about the message length. The decoded text may therefore
end with `?` characters: they come from the random padding, and there can be many
of them with a large pivot block size. Any character position that matches no
character is shown as `?`.
