# Security Policy

## Supported Versions

SolveForge is an actively maintained open-source project. Security fixes are applied to the latest commit on the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| Older   | :x:                |

## Reporting a Vulnerability

We take the security and integrity of SolveForge seriously. If you discover a security vulnerability, please do **NOT** open a public issue.

Instead, please report the vulnerability privately by contacting the maintainer:
- **Maintainer**: Pranshu Pujara
- **GitHub**: [@PranshuPujara](https://github.com/PranshuPujara)
- **Email / Security Advisory**: Please open a [GitHub Private Vulnerability Report](https://github.com/PranshuPujara/SolveForge/security/advisories/new) if available, or contact via GitHub profile.

Please include:
- A description of the issue and potential impact
- Step-by-step instructions or proof-of-concept to reproduce the vulnerability
- Any proposed remediation or mitigation

### Response Timeline
- We will acknowledge receipt of your report within 48 hours.
- We will keep you informed of our progress toward fixing the issue.
- Once fixed, we will publicly credit your contribution (unless you prefer to remain anonymous).

## Architecture & Security Model
- **No Database**: SolveForge does not store credentials, passwords, or personal data on servers.
- **Client Storage**: User data is confined to the client's local storage in their own browser.
- **Rate Limiting**: Backend endpoints are rate-limited to 30 requests per minute per IP to protect public CP APIs and mitigate abuse.

