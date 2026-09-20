```md
# Security Policy

## Reporting a Vulnerability

Please do **not** report security vulnerabilities through public GitHub
issues.

Instead, report them privately to the maintainer.

Email:

security@maisonorderplanning.in

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Affected component
- Proof of concept, if available
- Suggested mitigation, if known

Please do not include real user credentials, API keys or other sensitive
information in the report.

## Responsible Disclosure

Please allow reasonable time for investigation and remediation before
public disclosure.

## Scope

Security issues involving the following areas are particularly important:

- Authentication
- Authorization
- JWT/session handling
- TOTP/2FA
- Password reset
- Payment processing
- Admin authorization
- API rate limiting
- Database access
- File uploads
- AWS S3 access
- Background job authentication
- Secret management
- Dependency vulnerabilities

## Secrets

Never commit:

- API keys
- JWT secrets
- Database credentials
- SMTP passwords
- AWS credentials
- Cashfree credentials
- OAuth secrets
- Redis credentials
- Gemini API keys

If a secret is accidentally committed, rotate it immediately.

## Supported Versions

Security fixes are primarily applied to the latest version of MAISON.

| Version | Supported |
|---|---|
| Latest | Yes |
| Older versions | Best effort |
