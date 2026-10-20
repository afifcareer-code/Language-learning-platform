# Security Policy

## Supported versions

The project is in early development. Only the latest commit on the default branch receives security fixes.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report vulnerabilities privately with GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) ("Report a vulnerability" on the repository's **Security** tab).

Please include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- Affected versions or commits

You should receive an acknowledgement within 7 days. We will keep you informed while we work on a fix and credit you in the release notes unless you prefer otherwise.

## Scope notes

v0.1 is designed for **single-user, self-hosted** use and has **no authentication**. Do not expose an instance to the public internet without putting authentication in front of it, for example through a reverse proxy. Missing authentication is a known limitation, not a vulnerability. Multi-user accounts are on the roadmap.
