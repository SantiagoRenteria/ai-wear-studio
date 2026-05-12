---
title: 'Story 1.5b — Invitación de Usuarios Internos'
type: 'feature'
created: '2026-05-08'
status: 'in-progress'
baseline_commit: 'bd2da0c326f5b9d5774bb9c956e1668caecf3a2b'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
  - '_bmad-output/implementation-artifacts/spec-1-5a-feature-flags.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No existe mecanismo para incorporar usuarios internos (`workshop_admin`, `operator`) a una compañía — solo hay registro público para clientes. Un `platform_admin` no puede crear talleres con equipo, ni un `workshop_admin` puede incorporar operarios.

**Approach:** Entidad `UserInvitation` + tabla `user_invitations` en BC Users; `SendInvitationCommand` (crea invitación, envía email stub) + `AcceptInvitationCommand` (consume token, crea User, retorna JWT); `IEmailSender` en SharedKernel con implementación de logging en Users.Infrastructure; endpoints `POST /api/v1/invitations` y `POST /api/v1/auth/accept-invitation`.

## Boundaries & Constraints

**Always:**
- `UserInvitation.Token` es un `Guid` generado con `Guid.NewGuid()`, almacenado en plain text (no es credencial de acceso, se transmite en el email).
- TTL de invitación: 48 horas desde `CreatedAt`.
- `SendInvitationCommand` rechaza con `DomainException("DUPLICATE_INVITATION:...")` si ya existe una invitación no expirada y no consumida para el mismo email+tenantId.
- `AcceptInvitationCommand`: (1) verifica token no expirado ni consumido; (2) verifica email no registrado como usuario B2B (índice `uix_email_b2b`); (3) crea User con `CreateInternalUser`, marca invitación consumida, persiste todo en un único `SaveChangesAsync` (mismo `UsersDbContext` Scoped); (4) retorna `AuthResponse` (accessToken + refreshToken) idéntico al de login.
- `IEmailSender` en SharedKernel.Common; `LoggingEmailSender` en Users.Infrastructure registrado como `Scoped` — loguea token en consola para desarrollo. Sin SMTP real en Epic 1.
- AC-RBAC-INVITE-SCOPE: el endpoint valida que si el caller tiene rol `workshop_admin`, el `tenantId` del request debe coincidir con el claim `tenant_id` del JWT — si no coincide → 403 `INVITE_SCOPE_VIOLATION`.
- Solo roles `platform_admin` y `workshop_admin` pueden llamar `POST /api/v1/invitations`. Solo se pueden invitar roles `WorkshopAdmin` y `Operator`.
- `IUserInvitationRepository` en Users.Core.Domain.Repositories; implementación en Users.Infrastructure.

**Ask First:**
- Nada. El comportamiento de todos los edge-cases está definido arriba.

**Never:**
- Implementar SMTP, SendGrid ni ningún proveedor real de email.
- Crear el User antes de que el invitado acepte (no hay estado `pending_activation` en User — la invitación pendiente IS el estado).
- Permitir invitar con rol `Customer` o `PlatformAdmin`.
- Reutilizar un token expirado o ya consumido.

## I/O & Edge-Case Matrix

| Scenario | Input / Estado | Comportamiento Esperado | Error |
|----------|---------------|------------------------|-------|
| Invitar workshop_admin (platform_admin) | `POST /invitations { email, role: WorkshopAdmin, tenantId }` + JWT platform_admin | 201; UserInvitation persistida; email logueado con token | — |
| Invitar operator (workshop_admin propio tenant) | `POST /invitations { email, role: Operator, tenantId: propio }` + JWT workshop_admin | 201; UserInvitation persistida | — |
| RBAC scope violation | `POST /invitations { tenantId: ajeno }` + JWT workshop_admin | 403 RFC 7807 | `INVITE_SCOPE_VIOLATION` |
| Invitación duplicada (no expirada) | `POST /invitations` para email+tenant ya invitado | 409 RFC 7807 | `DUPLICATE_INVITATION` |
| Aceptar invitación válida | `POST /auth/accept-invitation { token, password }` | 200; User creado con rol+tenantId; AuthResponse con JWT | — |
| Token expirado | `POST /auth/accept-invitation` con token > 48h | 422 RFC 7807 | `INVITATION_EXPIRED` |
| Token ya consumido | `POST /auth/accept-invitation` con token consumido | 409 RFC 7807 | `INVITATION_ALREADY_CONSUMED` |
| Token inexistente | `POST /auth/accept-invitation` con token inválido | 404 RFC 7807 | `INVITATION_NOT_FOUND` |
| Email ya registrado (B2B) | Aceptar invitación de email con cuenta B2B activa | 409 RFC 7807 | `DUPLICATE_EMAIL` |

</frozen-after-approval>

## Code Map

**SharedKernel — nuevo:**
- `infrastructure/AiWearStudio.SharedKernel/Common/IEmailSender.cs` — interface: `Task SendInvitationAsync(string toEmail, Guid token, CancellationToken ct)`

**BC Users.Core — nuevos:**
- `modules/Users/AiWearStudio.Users.Core/Domain/Entities/UserInvitation.cs` — entidad: Id, Email, Role, TenantId, InvitedBy, Token (Guid), ExpiresAt, ConsumedAt?; `Consume()` method; `IsExpired` / `IsConsumed` computed
- `modules/Users/AiWearStudio.Users.Core/Domain/Repositories/IUserInvitationRepository.cs` — `FindByTokenAsync`, `FindPendingAsync(email, tenantId)`, `AddAsync`, `SaveChangesAsync`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/SendInvitation/SendInvitationCommand.cs` — record(Email, Role, TenantId, InvitedBy) : ICommand\<Guid\>
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/SendInvitation/SendInvitationCommandHandler.cs`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/SendInvitation/SendInvitationCommandValidator.cs`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/AcceptInvitation/AcceptInvitationCommand.cs` — record(Token, Password) : ICommand\<AuthResponse\>
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/AcceptInvitation/AcceptInvitationCommandHandler.cs`
- `modules/Users/AiWearStudio.Users.Core/Application/Commands/AcceptInvitation/AcceptInvitationCommandValidator.cs`

**BC Users.Infrastructure — nuevos y modificados:**
- `modules/Users/AiWearStudio.Users.Infrastructure/Services/LoggingEmailSender.cs` — implementa IEmailSender; loguea token con ILogger
- `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/Repositories/UserInvitationRepository.cs`
- `modules/Users/AiWearStudio.Users.Infrastructure/Persistence/UsersDbContext.cs` — agregar `DbSet<UserInvitation>` + configuración EF (tabla `user_invitations`, schema `users`, índice único en Token)
- `modules/Users/AiWearStudio.Users.Infrastructure/DependencyInjection.cs` — registrar IUserInvitationRepository + IEmailSender
- Migración `AddUserInvitations`

**API — modificados:**
- `AiWearStudio.Api/Endpoints/InvitationsEndpoints.cs` — nuevo; grupo `/api/v1/invitations` con `Roles = "platform_admin,workshop_admin"`; valida RBAC scope; `SendInvitationCommand` → 201
- `AiWearStudio.Api/Endpoints/AuthEndpoints.cs` — agregar `POST /accept-invitation` → `AcceptInvitationCommand` → 200
- `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — agregar handlers: INVITATION_NOT_FOUND→404, INVITATION_EXPIRED→422, INVITATION_ALREADY_CONSUMED→409, DUPLICATE_INVITATION→409, INVITE_SCOPE_VIOLATION→403
- `AiWearStudio.Api/Program.cs` — `app.MapInvitationsEndpoints()`

**Tests:**
- `tests/AiWearStudio.Users.Tests/Integration/InvitationTests.cs` — 5 tests: AC-INVITE-SEND, AC-INVITE-SCOPE, AC-INVITE-ACCEPT, AC-INVITE-EXPIRED, AC-INVITE-CONSUMED

## Tasks & Acceptance

**Execution:**
- [ ] `infrastructure/.../Common/IEmailSender.cs` — interface
- [ ] `modules/Users/.../Domain/Entities/UserInvitation.cs` — entidad con factory + Consume()
- [ ] `modules/Users/.../Domain/Repositories/IUserInvitationRepository.cs` — interface
- [ ] `modules/Users/.../Application/Commands/SendInvitation/` — command + handler + validator
- [ ] `modules/Users/.../Application/Commands/AcceptInvitation/` — command + handler + validator
- [ ] `modules/Users/.../Infrastructure/Services/LoggingEmailSender.cs` — stub
- [ ] `modules/Users/.../Infrastructure/Persistence/Repositories/UserInvitationRepository.cs`
- [ ] `modules/Users/.../Infrastructure/Persistence/UsersDbContext.cs` — DbSet + configuración
- [ ] Migración EF `AddUserInvitations`
- [ ] `modules/Users/.../Infrastructure/DependencyInjection.cs` — registrar nuevos servicios
- [ ] `AiWearStudio.Api/Endpoints/InvitationsEndpoints.cs` — nuevo archivo
- [ ] `AiWearStudio.Api/Endpoints/AuthEndpoints.cs` — agregar `POST /accept-invitation`
- [ ] `AiWearStudio.Api/Middleware/GlobalExceptionMiddleware.cs` — 5 nuevos handlers
- [ ] `AiWearStudio.Api/Program.cs` — registrar InvitationsEndpoints
- [ ] `tests/.../Integration/InvitationTests.cs` — 5 tests Testcontainers

**Acceptance Criteria:**
- Dado JWT platform_admin, cuando `POST /api/v1/invitations { email, role: WorkshopAdmin, tenantId }`, entonces se persiste `UserInvitation` con `ExpiresAt = CreatedAt + 48h` y `ConsumedAt = null`.
- Dado JWT workshop_admin con `tenant_id = A`, cuando `POST /api/v1/invitations { tenantId: B }` (B ≠ A), entonces respuesta 403 RFC 7807 con código `INVITE_SCOPE_VIOLATION`.
- Dado token válido (no expirado, no consumido), cuando `POST /api/v1/auth/accept-invitation { token, password }`, entonces `User` existe en DB con `Role` y `TenantId` de la invitación, `UserInvitation.ConsumedAt != null`, y la respuesta contiene `accessToken` y `refreshToken` válidos.
- Dado token con `ExpiresAt < UtcNow`, cuando `AcceptInvitationCommandHandler` procesa, entonces lanza `DomainException("INVITATION_EXPIRED:...")`.
- Dado token ya consumido (`ConsumedAt != null`), cuando handler procesa, entonces lanza `DomainException("INVITATION_ALREADY_CONSUMED:...")`.

## Design Notes

**Un único SaveChangesAsync en AcceptInvitation:** `UserInvitation.Consume()`, `User.CreateInternalUser()` y `RefreshToken.Create()` se añaden a los tracked changes del `UsersDbContext` Scoped compartido. El handler llama `userRepository.SaveChangesAsync(ct)` una sola vez al final — persiste los tres cambios atómicamente.

**LoggingEmailSender:** Loguea `"[INVITATION] To: {email} | Token: {token} | ExpiresAt: {expiresAt}"` en nivel Information. Suficiente para desarrollo; la URL completa del frontend se construirá cuando exista el frontend.

## Verification

**Commands:**
- `dotnet build AiWearStudio.slnx` — expected: 0 errores, 0 warnings
- `dotnet test tests/AiWearStudio.Users.Tests --filter Category=Integration` — expected: 29 tests pasan (24 anteriores + 5 nuevos AC-INVITE-*)
