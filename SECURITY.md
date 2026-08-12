# EDEN OS Security Policy

EDEN OS is experimental research software and is not production security certified.

## Public repository secret policy

Do not commit:

- private signing keys;
- API keys or access tokens;
- passwords or real join tokens;
- customer credentials or datasets;
- production KMS/HSM material;
- seed phrases or cryptocurrency wallet secrets.

Development examples must use obvious placeholders or synthetic test secrets only.

## Current security boundaries

The current public research includes cryptographic hashes, HMAC sealing, Ed25519 development signing, provenance objects, replay-related tests and Merkle-style commitments. These mechanisms do not make the complete system independently audited or post-quantum secure.

Known production gaps include hardware-backed key custody, workload identity/mTLS, a post-quantum signature migration path, independent cryptographic review and broader adversarial testing.

## Reporting

Please use the repository issue tracker for non-sensitive security observations. Do not post live credentials, private keys or exploit material containing real secrets in a public issue.
