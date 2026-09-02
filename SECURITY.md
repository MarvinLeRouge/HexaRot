[🇫🇷 Version française](SECURITY.fr.md) | 🇬🇧 English version

---

# Security Policy

## Supported versions

HexaRot is under active development, pre-1.0. Only the latest state of the `main`
branch is supported; there is no back-porting of fixes to older tags.

## Reporting a vulnerability

If you find a security issue (for example, a way to leak encrypted message content
or length through the cryptogram, or a vulnerability in the API or dependencies),
please report it privately rather than opening a public issue:

- Use GitHub's [private vulnerability reporting](https://github.com/MarvinLeRouge/HexaRot/security/advisories/new)
  for this repository, or
- Contact the maintainer directly by email (see the GitHub profile for contact
  details).

Please include steps to reproduce and, if applicable, the affected component
(backend module, frontend view, or dependency).

## Scope notes

HexaRot is a visual cipher for obfuscation and learning purposes, not a
cryptographically vetted encryption scheme. It intentionally avoids leaking
message-length metadata in the cryptogram (see [ADR 0001](docs/adr/0001-no-message-length-exposure.md)),
but should not be relied upon for protecting sensitive data against a motivated
attacker.
