---
name: nestjs-best-practices
description: NestJS best practices and architecture patterns for building production-ready applications. This skill should be used when writing, reviewing, or refactoring NestJS code to ensure proper patterns for modules, dependency injection, security, and performance.
license: MIT
metadata:
  author: Kadajett
  version: '1.1.0'
---

# NestJS Best Practices

Comprehensive best practices guide for NestJS applications. Contains 40 rules across 10 categories, prioritized by impact to guide automated refactoring and code generation.

## ⚠️ Alcance en este repositorio

Esta skill es material genérico de terceros (autor: Kadajett, MIT). **La autoridad en este repo es
`apps/backend/.claude/rules/nestjs-patterns.md`** — ante cualquier conflicto, gana la regla del
proyecto, no esta skill.

Partes que **NO** aplican acá, porque asumen un stack distinto:

| La skill asume                          | Este repo usa                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `class-validator` / `class-transformer` | **Zod** + `ZodValidationPipe` con DTOs de `@vm/shared-types`. La regla del proyecto los prohíbe            |
| TypeORM / Mongoose                      | Sin base de datos todavía: repositorios en memoria detrás del patrón Controller → Service → Repository    |
| Passport.js (`@nestjs/passport`)        | Sin autenticación todavía                                                                                  |
| `@nestjs/microservices`                 | Monolito por capas; no instalado                                                                           |

Archivos de `rules/` afectados por lo anterior — leerlos con ese filtro:
`api-use-dto-serialization.md`, `security-validate-all-input.md`, `security-sanitize-output.md`,
`security-auth-jwt.md`, `db-use-migrations.md`, `db-use-transactions.md`, `db-avoid-n-plus-one.md`,
`perf-optimize-database.md`, `micro-use-patterns.md`, `micro-use-queues.md`,
`micro-use-health-checks.md`.

El resto —arquitectura (`arch-`), inyección de dependencias (`di-`), manejo de errores (`error-`),
guards y pipes (`security-use-guards.md`, `api-use-pipes.md`), testing (`test-`)— es neutral al
stack y coincide con la arquitectura del proyecto.

## When to Apply

Reference these guidelines when:

- Writing new NestJS modules, controllers, or services
- Implementing authentication and authorization
- Reviewing code for architecture and security issues
- Refactoring existing NestJS codebases
- Optimizing performance or database queries
- Building microservices architectures

## Rule Categories by Priority

| Priority | Category             | Impact      | Prefix      |
| -------- | -------------------- | ----------- | ----------- |
| 1        | Architecture         | CRITICAL    | `arch-`     |
| 2        | Dependency Injection | CRITICAL    | `di-`       |
| 3        | Error Handling       | HIGH        | `error-`    |
| 4        | Security             | HIGH        | `security-` |
| 5        | Performance          | HIGH        | `perf-`     |
| 6        | Testing              | MEDIUM-HIGH | `test-`     |
| 7        | Database & ORM       | MEDIUM-HIGH | `db-`       |
| 8        | API Design           | MEDIUM      | `api-`      |
| 9        | Microservices        | MEDIUM      | `micro-`    |
| 10       | DevOps & Deployment  | LOW-MEDIUM  | `devops-`   |

## Quick Reference

### 1. Architecture (CRITICAL)

- `arch-avoid-circular-deps` - Avoid circular module dependencies
- `arch-feature-modules` - Organize by feature, not technical layer
- `arch-module-sharing` - Proper module exports/imports, avoid duplicate providers
- `arch-single-responsibility` - Focused services over "god services"
- `arch-use-repository-pattern` - Abstract database logic for testability
- `arch-use-events` - Event-driven architecture for decoupling

### 2. Dependency Injection (CRITICAL)

- `di-avoid-service-locator` - Avoid service locator anti-pattern
- `di-interface-segregation` - Interface Segregation Principle (ISP)
- `di-liskov-substitution` - Liskov Substitution Principle (LSP)
- `di-prefer-constructor-injection` - Constructor over property injection
- `di-scope-awareness` - Understand singleton/request/transient scopes
- `di-use-interfaces-tokens` - Use injection tokens for interfaces

### 3. Error Handling (HIGH)

- `error-use-exception-filters` - Centralized exception handling
- `error-throw-http-exceptions` - Use NestJS HTTP exceptions
- `error-handle-async-errors` - Handle async errors properly

### 4. Security (HIGH)

- `security-auth-jwt` - Secure JWT authentication
- `security-validate-all-input` - Validate with class-validator
- `security-use-guards` - Authentication and authorization guards
- `security-sanitize-output` - Prevent XSS attacks
- `security-rate-limiting` - Implement rate limiting

### 5. Performance (HIGH)

- `perf-async-hooks` - Proper async lifecycle hooks
- `perf-use-caching` - Implement caching strategies
- `perf-optimize-database` - Optimize database queries
- `perf-lazy-loading` - Lazy load modules for faster startup

### 6. Testing (MEDIUM-HIGH)

- `test-use-testing-module` - Use NestJS testing utilities
- `test-e2e-supertest` - E2E testing with Supertest
- `test-mock-external-services` - Mock external dependencies

### 7. Database & ORM (MEDIUM-HIGH)

- `db-use-transactions` - Transaction management
- `db-avoid-n-plus-one` - Avoid N+1 query problems
- `db-use-migrations` - Use migrations for schema changes

### 8. API Design (MEDIUM)

- `api-use-dto-serialization` - DTO and response serialization
- `api-use-interceptors` - Cross-cutting concerns
- `api-versioning` - API versioning strategies
- `api-use-pipes` - Input transformation with pipes

### 9. Microservices (MEDIUM)

- `micro-use-patterns` - Message and event patterns
- `micro-use-health-checks` - Health checks for orchestration
- `micro-use-queues` - Background job processing

### 10. DevOps & Deployment (LOW-MEDIUM)

- `devops-use-config-module` - Environment configuration
- `devops-use-logging` - Structured logging
- `devops-graceful-shutdown` - Zero-downtime deployments

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/arch-avoid-circular-deps.md
rules/security-validate-all-input.md
rules/_sections.md
```

Each rule file contains:

- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- Additional context and references

## Full Compiled Document

For the complete guide with all rules expanded: `AGENTS.md`
