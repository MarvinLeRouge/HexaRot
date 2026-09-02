[🇫🇷 Version française](user_guide.fr.md) | 🇬🇧 English version

---

# User guide

This guide covers using the HexaRot web interface: Encode, Decode, and Key.

## Encode: text → cryptogram

1. Go to the **Encode** view.
2. Type or paste the message to encode. It will be uppercased, and accented
   characters transliterated (é→E, à→A, ç→C…) automatically. Any character
   HexaRot cannot represent is reported so you can adjust the message.
3. Choose the encryption parameters:
   - **Pivot block size**: the size (in cases) of the square blocks the grid is
     rotated by.
   - **Rotation sequence and direction**: which rotation applies to each block,
     in which order, clockwise or counter-clockwise.
   - **Reading order**: the direction blocks are traversed (left-right/top-bottom,
     and variants), with an optional alternating mode.
   - **Output size**: small, medium, or large.
4. If a parameter combination weakens the cryptogram (detected via a GCD check
   against the alphabet's symbol dimensions), a warning is shown; you can adjust
   the parameters or proceed anyway.
5. Submit to get the cryptogram (PNG and SVG) and the generated key. **Save the
   key**: it is not stored anywhere by HexaRot, and it is the only way to decode
   the message later.
6. Copy or download the cryptogram and the key.

## Decode: cryptogram + key → text

1. Go to the **Decode** view.
2. Upload the cryptogram file (PNG or SVG) you want to decode.
3. Enter the key that was used to encode it, and the output size used at encode
   time.
4. Submit to reveal the decoded message.

Decoding always processes the full grid; if the original message was shorter
than the grid capacity, the padding characters decode as `?` and can be safely
ignored, they carry no information about the original message length.

## Key: generate or parse

- **Generate**: pick encryption parameters without encoding a message, to get a
  reusable key upfront (useful for sharing a key ahead of sending an encoded
  message).
- **Parse**: paste an existing key to see the parameters it encodes (pivot block
  size, rotation sequence and direction, reading order).

## Stale results

If you change a parameter after getting a result, the previous result is marked
as stale rather than discarded, so you can still copy or download it while you
decide whether to re-submit with the new parameters.
