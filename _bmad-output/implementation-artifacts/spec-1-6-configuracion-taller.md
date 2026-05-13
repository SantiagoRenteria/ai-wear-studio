---
title: 'Story 1.6 — Configuración del Taller'
type: 'feature'
created: '2026-05-08'
status: 'done'
baseline_commit: '7cd4f25d0ac0a8b96cdb6874f469cbf404b5b299'
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Un `workshop_admin` no tiene forma de actualizar el nombre de su taller ni configurar preferencias operativas (colores de marca, notificaciones). Los endpoints de `/companies` son exclusivos de `platform_admin` y la entidad `Company` carece de método para modificar estos campos.

**Approach:** Agregar `Company.UpdateSettings()` en el dominio; nuevo command `UpdateCompanySettings` (MediatR); dos endpoints bajo `/api/v1/companies/me` (`GET` y `PATCH`) con RBAC `workshop_admin`; el tenant_id del JWT identifica unívocamente la compañía del caller.

## Boundaries & Constraints

**Always:**
- El `CompanyId` del command viene del claim `tenant_id` del JWT — el workshop_admin nunca pasa un companyId arbitrario en el body.
- `settings` se almacena como JSONB (`string?` en EF Core). El handler deserializa el JSON existente, aplica cambios parciales (merge) y re-serializa; los campos no incluidos en el request permanecen intactos.
- `domain_config: {}` debe existir siempre en el JSON de settings después de cualquier actualización (placeholder para futura feature de dominio personalizado), incluso si no se incluye en el request.
- BrandColors: cada valor debe ser un color hex válido `#RRGGBB` (6 dígitos). Rechazar con 400 si algún valor no cumple el formato.
- `NotificationConfigJson` se acepta como JSON string libre (sin schema fijo en Epic 1); el handler valida solo que sea JSON sintácticamente válido.
- El método `Company.UpdateSettings(string? newName, string settingsJson)` solo actualiza `Name` si `newName` es no-null; nunca asigna null a `Name`.
- `GET /api/v1/companies/me` retorna el perfil completo de la compañía incluyendo el objeto `settings` deserializado.
- Reutilizar error existente `COMPANY_NOT_FOUND` → GlobalExceptionMiddleware ya lo mapea a 404 — no hay cambios en middleware.

**Ask First:**
- Nada. Todos los edge-cases están definidos arriba.

**Never:**
- Permitir que workshop_admin modifique `Plan`, `PlanStatus`, `Slug`, `ActivatedBy` o `ActivatedAt`.
- Aceptar colores hex con 3 dígitos (`#RGB`) — solo `#RRGGBB`.
- Implementar el upload de logo (`IAssetStorage`) — diferido a Story 1.6b.
- Crear una migración nueva — la columna `settings jsonb` ya existe desde Story 1.4.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Update nombre | PATCH /companies/me `{ "name": "Nuevo Nombre" }` | 200, Company.Name actualizado en DB, otros settings sin cambio | N/A |
| Update brand colors válidos | PATCH `{ "brandColors": { "primary": "#FF5733" } }` | 200, settings.brand_colors con el valor | N/A |
| Color hex inválido | PATCH `{ "brandColors": { "primary": "rojo" } }` | 400 ValidationError | FluentValidation |
| Notification config | PATCH `{ "notificationConfig": "{\"orderUpdates\":true}" }` | 200, settings.notification_config actualizado | N/A |
| NotificationConfig JSON inválido | PATCH `{ "notificationConfig": "not-json" }` | 400 ValidationError | FluentValidation |
| domain_config siempre presente | Cualquier PATCH sin domain_config en request | settings contiene `"domain_config": {}` | N/A |
| Compañía no encontrada | CompanyId no existe en DB | 404 COMPANY_NOT_FOUND | Middleware existente |

</frozen-after-approval>

## Code Map

- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Entities/Company.cs` — agregar `UpdateSettings()`
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/UpdateCompanySettings/` — nuevo command/handler/validator (a crear)
- `AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs` — agregar GET + PATCH `/companies/me`
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Infrastructure/Persistence/CompanyAdminDbContext.cs` — solo lectura; `settings` ya está mapeado como `jsonb`
- `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Repositories/ICompanyRepository.cs` — `FindByIdAsync` + `SaveChangesAsync` son suficientes
- `tests/AiWearStudio.Users.Tests/Integration/CompanySettingsTests.cs` — nuevo archivo de tests (mismo proyecto que otros tests de integración)

## Tasks & Acceptance

**Execution:**
- [x] `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Entities/Company.cs` — agregar método `UpdateSettings(string? newName, string settingsJson)`: si `newName != null` → `Name = newName.Trim()`; siempre → `Settings = settingsJson`
- [x] `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/UpdateCompanySettings/UpdateCompanySettingsCommand.cs` — `record UpdateCompanySettingsCommand(Guid CompanyId, string? NewName, Dictionary<string, string>? BrandColors, string? NotificationConfigJson) : ICommand<Unit>`
- [x] `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/UpdateCompanySettings/UpdateCompanySettingsCommandValidator.cs` — validar: CompanyId != Guid.Empty; NewName si no-null → NotEmpty + MaxLength(200); cada valor de BrandColors → Matches(`^#[0-9A-Fa-f]{6}$`); NotificationConfigJson si no-null → JSON sintácticamente válido (intentar `JsonDocument.Parse`, catch → falla)
- [x] `modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/UpdateCompanySettings/UpdateCompanySettingsCommandHandler.cs` — (1) FindByIdAsync → COMPANY_NOT_FOUND si null; (2) deserializar `company.Settings` a `Dictionary<string, JsonElement>` (o `{}` si null); (3) aplicar BrandColors, NotificationConfig si provistos; (4) asegurar `domain_config: {}` si ausente; (5) serializar; (6) `company.UpdateSettings(request.NewName, settingsJson)`; (7) SaveChangesAsync
- [x] `AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs` — añadir grupo separado para `workshop_admin`: `GET /api/v1/companies/me` (lee tenant_id del JWT → FindByIdAsync → retorna id, name, slug, plan, planStatus, settings deserializado); `PATCH /api/v1/companies/me` (lee tenant_id del JWT → envía UpdateCompanySettingsCommand)
- [x] `tests/AiWearStudio.Users.Tests/Integration/CompanySettingsTests.cs` — 4 tests usando handler directo + Testcontainers

**Acceptance Criteria:**
- **AC-SETTINGS-NAME**: Dado que un handler recibe `NewName = "Taller Nuevo"` para una compañía existente, cuando se ejecuta, entonces `company.Name == "Taller Nuevo"` en DB y los settings previos permanecen sin cambio.
- **AC-SETTINGS-COLORS**: Dado que el handler recibe `BrandColors = { "primary": "#FF5733", "secondary": "#C70039" }`, cuando se ejecuta, entonces `settings.brand_colors` contiene ambos colores y `domain_config` está presente.
- **AC-SETTINGS-NOTIFICATIONS**: Dado que el handler recibe `NotificationConfigJson = "{\"orderUpdates\":true}"`, cuando se ejecuta, entonces `settings.notification_config` refleja el valor y los demás campos del settings no cambian.
- **AC-SETTINGS-NOT-FOUND**: Dado que el CompanyId no existe en DB, cuando se ejecuta el handler, entonces se lanza `DomainException` con prefijo `COMPANY_NOT_FOUND`.

## Design Notes

**Merge parcial de settings JSON:**
```csharp
var dict = company.Settings is null
    ? new Dictionary<string, JsonElement>()
    : JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(company.Settings)!;
if (request.BrandColors is not null)
    dict["brand_colors"] = JsonSerializer.SerializeToElement(request.BrandColors);
if (request.NotificationConfigJson is not null)
    dict["notification_config"] = JsonDocument.Parse(request.NotificationConfigJson).RootElement;
if (!dict.ContainsKey("domain_config"))
    dict["domain_config"] = JsonSerializer.SerializeToElement(new { });
var settingsJson = JsonSerializer.Serialize(dict);
```

**Validación de NotificationConfigJson:**
```csharp
RuleFor(x => x.NotificationConfigJson)
    .Must(json => { try { JsonDocument.Parse(json!); return true; } catch { return false; } })
    .When(x => x.NotificationConfigJson is not null)
    .WithMessage("NotificationConfig debe ser JSON válido.");
```

## Verification

**Commands:**
- `dotnet build --no-restore -c Debug src/backend` -- expected: 0 errors, 0 warnings
- `dotnet test src/backend/tests/AiWearStudio.Users.Tests --filter "FullyQualifiedName~CompanySettingsTests" --no-build` -- expected: 4 passed

## Spec Change Log

## Suggested Review Order

**Dominio**

- Punto de entrada: método que unifica actualización de nombre y settings JSON en un solo lugar.
  [`Company.cs:56`](../../src/backend/modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Domain/Entities/Company.cs#L56)

**Lógica de aplicación**

- Merge parcial JSONB: deserializar → aplicar cambios → garantizar domain_config → serializar.
  [`UpdateCompanySettingsCommandHandler.cs:11`](../../src/backend/modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/UpdateCompanySettings/UpdateCompanySettingsCommandHandler.cs#L11)

- Garantía de domain_config placeholder en cada escritura.
  [`UpdateCompanySettingsCommandHandler.cs:29`](../../src/backend/modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/UpdateCompanySettings/UpdateCompanySettingsCommandHandler.cs#L29)

- Validación hex `#RRGGBB` compilada y validación de JSON libre para NotificationConfig.
  [`UpdateCompanySettingsCommandValidator.cs:9`](../../src/backend/modules/CompanyAdmin/AiWearStudio.CompanyAdmin/Application/Commands/UpdateCompanySettings/UpdateCompanySettingsCommandValidator.cs#L9)

**API / RBAC**

- Grupo separado workshop_admin con tenant_id extraído del JWT (no del body).
  [`CompaniesEndpoints.cs:144`](../../src/backend/AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs#L144)

- GET /me retorna settings deserializado; PATCH /me envía command con tenant del JWT.
  [`CompaniesEndpoints.cs:151`](../../src/backend/AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs#L151)

- Helper TryGetTenantId: única fuente de truth para leer claim `tenant_id`.
  [`CompaniesEndpoints.cs:201`](../../src/backend/AiWearStudio.Api/Endpoints/CompaniesEndpoints.cs#L201)

**Tests**

- 4 tests de integración contra DB real (Testcontainers): name, colors, notifications, not-found.
  [`CompanySettingsTests.cs:1`](../../src/backend/tests/AiWearStudio.Users.Tests/Integration/CompanySettingsTests.cs#L1)
