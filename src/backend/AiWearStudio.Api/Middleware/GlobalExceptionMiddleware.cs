using AiWearStudio.SharedKernel.Domain;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Text.Json;

namespace AiWearStudio.Api.Middleware;

public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    // PostgreSQL error code for unique constraint violation
    private const string PostgresUniqueViolation = "23505";

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException ex)
        {
            logger.LogWarning("Validation failed for {Path}", context.Request.Path);
            await WriteProblemAsync(context, 400, "Validation Error",
                string.Join("; ", ex.Errors.Select(e => $"{e.PropertyName}: {e.ErrorMessage}")));
        }
        catch (DomainException ex) when (ex.Message.StartsWith("INVALID_CREDENTIALS"))
        {
            await WriteProblemAsync(context, 401, "Credenciales inválidas",
                "El email o la contraseña son incorrectos.");
        }
        catch (DomainException ex) when (ex.Message.StartsWith("TOKEN_EXPIRED"))
        {
            await WriteProblemAsync(context, 401, "Token inválido",
                "El token de refresco no es válido o ha expirado.");
        }
        catch (DomainException ex) when (ex.Message.StartsWith("USER_NOT_FOUND"))
        {
            await WriteProblemAsync(context, 404, "Usuario no encontrado",
                "El usuario solicitado no existe.");
        }
        catch (DomainException ex) when (ex.Message.StartsWith("COMPANY_NOT_FOUND"))
        {
            await WriteProblemAsync(context, 404, "Compañía no encontrada",
                "La compañía solicitada no existe.");
        }
        catch (DomainException ex) when (ex.Message.StartsWith("DUPLICATE_SLUG"))
        {
            await WriteProblemAsync(context, 409, "Slug duplicado",
                "El slug especificado ya está en uso por otra compañía.");
        }
        catch (DomainException ex) when (ex.Message.StartsWith("DUPLICATE_EMAIL"))
        {
            await WriteProblemAsync(context, 409, "Email ya registrado",
                "Este email ya está registrado. Por favor, inicia sesión o usa otro email.");
        }
        catch (DomainException ex) when (ex.Message.StartsWith("ROLE_CONFLICT"))
        {
            await WriteProblemAsync(context, 409, "Conflicto de rol",
                "Este email ya está registrado como usuario interno y no puede usarse para registro de cliente.");
        }
        catch (DomainException ex)
        {
            await WriteProblemAsync(context, 422, "Error de negocio", ex.Message);
        }
        catch (DbUpdateException ex) when (IsSlugConstraintViolation(ex))
        {
            logger.LogWarning(ex, "Slug unique constraint violation for {Path}", context.Request.Path);
            await WriteProblemAsync(context, 409, "Slug duplicado",
                "El slug especificado ya está en uso por otra compañía.");
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Race condition: two concurrent registrations with the same email both pass the
            // application-layer check, then the DB unique partial index rejects the second insert.
            logger.LogWarning(ex, "Unique constraint violation for {Path}", context.Request.Path);
            await WriteProblemAsync(context, 409, "Email ya registrado",
                "Este email ya está registrado. Por favor, inicia sesión o usa otro email.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Path}", context.Request.Path);
            await WriteProblemAsync(context, 500, "Error interno", "Ha ocurrido un error inesperado.");
        }
    }

    private static bool IsSlugConstraintViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException pg
        && pg.SqlState == PostgresUniqueViolation
        && pg.ConstraintName == "uix_company_slug";

    private static bool IsUniqueConstraintViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException pg && pg.SqlState == PostgresUniqueViolation;

    private static async Task WriteProblemAsync(HttpContext context, int status, string title, string detail)
    {
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";
        var problem = new ProblemDetails { Status = status, Title = title, Detail = detail };
        await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}
