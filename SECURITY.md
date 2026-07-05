# Security Policy

Thank you for helping keep the Adavi Digital Institute Learning Management System (LMS) secure.

The security of our students, instructors, administrators, and partner institutions is a top priority. We appreciate responsible disclosure of security vulnerabilities.

---

# Supported Versions

The following versions are currently supported with security updates.

| Version | Supported |
|----------|-----------|
| 1.x.x | ✅ Yes |
| 0.x.x | ❌ No |

Only the latest stable release receives security updates.

---

# Reporting a Security Vulnerability

**Do not report security vulnerabilities through public GitHub Issues or Discussions.**

Instead, report them privately using one of the following methods:

Email:
security@adavidigitalinstitute.com

Alternative:
info@adavidigitalinstitute.com

Subject Line:

Security Vulnerability Report

---

# What to Include

Please include as much information as possible:

- Vulnerability description
- Steps to reproduce
- Affected feature or endpoint
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Proof of Concept (PoC), if available
- Potential impact
- Suggested mitigation (optional)

Providing detailed information helps us investigate and resolve issues more quickly.

---

# Response Timeline

We aim to:

- Acknowledge receipt within **72 hours**
- Provide an initial assessment within **7 business days**
- Keep you informed throughout the remediation process
- Release a security fix as quickly as practical based on severity

---

# Responsible Disclosure

We ask that you:

- Give us reasonable time to investigate and fix the issue before making it public.
- Avoid accessing, modifying, or deleting data that does not belong to you.
- Do not disrupt the availability or integrity of our services.
- Do not exploit vulnerabilities beyond what is necessary to demonstrate the issue.

We are committed to working collaboratively with researchers acting in good faith.

---

# Security Best Practices

Developers contributing to this project must:

- Never commit `.env` files.
- Never commit API keys, passwords, or tokens.
- Store secrets using environment variables.
- Use HTTPS in production.
- Validate and sanitize all user input.
- Protect against SQL Injection, XSS, and CSRF attacks.
- Hash passwords using bcrypt or Argon2.
- Keep dependencies up to date.
- Enable rate limiting on authentication endpoints.
- Use secure HTTP headers.
- Enforce Role-Based Access Control (RBAC).
- Log security-related events without exposing sensitive data.

---

# Dependency Management

Before merging changes:

- Run dependency audits (`npm audit` or equivalent).
- Update vulnerable packages.
- Remove unused dependencies.
- Verify package integrity.

---

# Authentication & Authorization

The LMS uses:

- JSON Web Tokens (JWT)
- Secure password hashing
- Role-Based Access Control
- Protected API routes

Contributors must ensure these mechanisms remain secure when making changes.

---

# Data Protection

The platform may process sensitive educational and personal information.

Developers must:

- Encrypt sensitive data where appropriate.
- Never expose personally identifiable information (PII) in logs.
- Follow applicable privacy regulations and institutional policies.
- Use secure storage for uploaded files.

---

# Third-Party Services

This project may integrate with services such as:

- PostgreSQL
- Cloudinary
- Paystack
- Google OAuth
- OpenAI
- SMTP email providers

Keep API keys confidential and rotate credentials if compromise is suspected.

---

# Security Updates

Security updates will be documented in:

- CHANGELOG.md
- Release Notes
- GitHub Releases

Critical vulnerabilities may be patched outside of the normal release schedule.

---

# Contact

Security Team

Email:
security@adavidigitalinstitute.com

General Enquiries

Email:
info@adavidigitalinstitute.com

Thank you for helping us maintain a secure and reliable learning platform.
