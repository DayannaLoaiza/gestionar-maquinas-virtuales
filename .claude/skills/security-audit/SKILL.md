---
name: security-audit
description: 'OWASP Top 10 security audit of the whole monorepo (not just the diff). Scans authentication, authorization, input validation, and data exposure'
disable-model-invocation: true
context: fork
agent: security-auditor
argument-hint: '[scope: backend | frontend | all]'
---

<!--
Por qué este frontmatter:
- No se llama `security-review` para no tapar el comando de Claude Code `/security-review` (revisa
  el diff de la rama). Este audita el repo entero.
- context: fork + agent: security-auditor: corre en el agente de .claude/agents/, que no tiene Edit
  ni Write. La auditoría solo reporta.
- disable-model-invocation: es un audit largo; lo lanza la usuaria.
-->

Alcance: $ARGUMENTS (por defecto, todo el monorepo).

Antes de empezar, abrir con **Read** `apps/backend/CLAUDE.md` y `apps/frontend/CLAUDE.md`: así
cargan las reglas de cada app, que definen qué es un hallazgo y qué es una excepción deliberada.

# OWASP Top 10 Security Audit

Perform a comprehensive security review of the monorepo. Scan for vulnerabilities and output a
severity-ranked report.

## 1. Hardcoded Secrets Scan [A02: Cryptographic Failures]

```
Regex patterns to search in apps/ and packages/:
- API keys:           /['\"]sk[-_][a-zA-Z0-9]{20,}['\"]/
- AWS keys:           /AKIA[0-9A-Z]{16}/
- JWT tokens:         /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+/
- Connection strings: /(postgres(ql)?|mongodb|mysql):\/\/[^\s'"]+/
- Passwords:          /password\s*[:=]\s*['"][^'"]+['"]/  (excluding validation schemas)
- Generic secrets:    /secret\s*[:=]\s*['"][^'"]+['"]/   (excluding env validation)
```

Exclude: `.env*`, `node_modules/`, `.git/`, `*.md`, `*.example` files.
Severity: **CRITICAL** for actual secrets, **HIGH** for patterns that look suspicious.

## 2. Access Control [A01: Broken Access Control]

There is no `auth` module yet. If one exists when you run this audit:

```
Search: apps/backend/src/modules/**/*.controller.ts
Check: every controller has @UseGuards(JwtAuthGuard, RolesGuard) at class level
Check: write endpoints carry @Roles(ROLES.ADMIN) with the constant, never the string literal
Check: @Public() only where the route must work without a session, with the reason stated
```

If it doesn't exist, report a single **INFO**: "sin autenticación: todos los endpoints son
públicos" — not one finding per controller.

## 3. Input Validation [A03: Injection]

```
Search: @Body() parameters must have ZodValidationPipe with a schema from @vm/shared-types
Search: @Param() ids must have ParseUUIDPipe or a project pipe
Search: @Query() values must be parsed in the controller (normalizePagination, explicit checks)
```

Check that Zod object schemas don't use `.passthrough()` / `.loose()` on request bodies.
Severity: **HIGH** for missing body validation, **MEDIUM** for missing query validation.

## 4. Injection [A03: Injection]

Search for string-built queries or commands with user input (`exec(`, `spawn(` with a shell,
template literals into a query once a database exists). Severity: **CRITICAL** with user input.

## 5. CORS Configuration [A05: Security Misconfiguration]

Read the CORS configuration in `apps/backend/src/main.ts`:

```
Check: origin comes from CORS_ORIGIN (validated env), never '*' or true in production
Check: methods are restricted to the needed HTTP methods
```

Severity: **HIGH** for wildcard CORS in production config.

## 6. Password Hashing [A02: Cryptographic Failures]

```
Search for: scrypt, argon2, bcrypt, md5, sha1, sha256 + password context
Verify: Argon2id (C8), random salt per hash, OWASP minimum parameters (m=19 MiB, t=2, p=1)
```

Severity: **CRITICAL** for MD5/SHA-1/SHA-256 or a fixed salt.

## 7. Response Data Leakage [A01: Broken Access Control]

```
Verify: passwordHash is NEVER included in responses (services map to the shared User model)
Verify: tokens are NEVER exposed
Check: AllExceptionsFilter answers 5xx with the generic body and never the exception message
Check: validation errors answer VALIDATION_ERROR without the schema issues
```

Severity: **CRITICAL** for password hash leakage, **HIGH** for stack traces or internal messages.

## 8. Dependency Vulnerabilities [A06: Vulnerable Components]

```bash
pnpm audit --json 2>&1 || true
```

Severity: match the reported CVE severity.

## 9. Additional Checks

- **Rate Limiting**: not configured today — recommend it (LOW) before exposing auth endpoints.
- **Security headers**: Helmet is not installed — recommend it (LOW).
- **Frontend**: no secrets in `NEXT_PUBLIC_*` variables; no `dangerouslySetInnerHTML` with API data;
  error screens use `toUserMessage` and never render raw API errors.

## Output Report

```
================================================================
  SECURITY AUDIT REPORT — gestionar-maquinas-virtuales
  Date: $(date -u +"%Y-%m-%d %H:%M UTC")
  Scope: <backend | frontend | all>
================================================================

SUMMARY:
  CRITICAL: X findings
  HIGH:     X findings
  MEDIUM:   X findings
  LOW:      X findings

----------------------------------------------------------------
[CRITICAL] Finding Title
  File: path/to/file.ts:LINE
  Description: What the vulnerability is
  Impact: What an attacker could do
  Fix: How to remediate
----------------------------------------------------------------

================================================================
  RECOMMENDATIONS (Priority Order)
================================================================
1. ...
```
