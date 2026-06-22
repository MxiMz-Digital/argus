# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes     |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: **security@mximz.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You will receive an acknowledgement within **48 hours** and a full response within **7 days**.

## Scope

- Vulnerabilities in `@mximz/argus` itself (the audit tool)
- False negatives in security rules that could give users unwarranted confidence
- Supply chain concerns about this package's own dependencies

## Out of Scope

- Vulnerabilities in projects *scanned by* Argus (report those to the relevant project)
- Rule disagreements or false positives (open a GitHub issue)

## Disclosure Policy

We follow coordinated disclosure. Once a fix is available and released, we will publish a CVE and credit the reporter (unless anonymity is requested).

---

*This policy follows the [OpenSSF vulnerability disclosure guide](https://openssf.org/blog/2023/06/14/openssf-releases-guide-to-coordinated-vulnerability-disclosure-for-open-source-software-projects/).*
