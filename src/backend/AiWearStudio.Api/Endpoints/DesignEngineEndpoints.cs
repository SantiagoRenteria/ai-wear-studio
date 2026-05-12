using AiWearStudio.DesignEngine.Core.Application.Commands.UpsertDesignDraft;
using AiWearStudio.DesignEngine.Core.Application.Queries.GetDesignDraft;
using AiWearStudio.SharedKernel.Domain;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace AiWearStudio.Api.Endpoints;

public static class DesignEngineEndpoints
{
    public static void MapDesignEngineEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/designs")
            .RequireAuthorization();

        group.MapGet("/{designId:guid}", async (
            Guid designId,
            HttpContext ctx,
            ISender sender,
            CancellationToken ct) =>
        {
            if (!TryGetTenant(ctx, out var tenantId))
                return Results.Problem(title: "Identidad no válida", statusCode: 401);

            var result = await sender.Send(new GetDesignDraftQuery(designId, tenantId), ct);
            if (result is null)
                return Results.NotFound();

            ctx.Response.Headers.ETag = $"\"{result.ETag}\"";
            return Results.Ok(result);
        })
        .WithName("GetDesignDraft")
        .Produces<DesignDraftDto>(200)
        .ProducesProblem(401)
        .ProducesProblem(404);

        group.MapMethods("/{designId:guid}", ["PATCH"], async (
            Guid designId,
            UpsertDesignDraftRequest body,
            HttpContext ctx,
            ISender sender,
            CancellationToken ct) =>
        {
            if (!TryGetTenantAndUser(ctx, out var tenantId, out var userId))
                return Results.Problem(title: "Identidad no válida", statusCode: 401);

            var ifMatch = ctx.Request.Headers["If-Match"].FirstOrDefault()?.Trim('"');
            if (string.IsNullOrWhiteSpace(ifMatch))
                return Results.Problem(title: "If-Match header requerido", statusCode: 400);

            try
            {
                var newETag = await sender.Send(
                    new UpsertDesignDraftCommand(designId, tenantId, userId, body.SnapshotJson, ifMatch), ct);

                ctx.Response.Headers.ETag = $"\"{newETag}\"";
                return Results.Ok(new { etag = newETag });
            }
            catch (DomainException ex) when (ex.Message.StartsWith("ETAG_MISMATCH"))
            {
                return Results.Problem(title: "Precondición fallida", detail: ex.Message, statusCode: 412);
            }
        })
        .WithName("UpsertDesignDraft")
        .Produces(200)
        .ProducesProblem(400)
        .ProducesProblem(401)
        .ProducesProblem(412);
    }

    private static bool TryGetTenant(HttpContext ctx, out Guid tenantId)
    {
        var raw = ctx.User.FindFirstValue("tenant_id");
        return Guid.TryParse(raw, out tenantId);
    }

    private static bool TryGetTenantAndUser(HttpContext ctx, out Guid tenantId, out Guid userId)
    {
        var rawTenant = ctx.User.FindFirstValue("tenant_id");
        var rawSub = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? ctx.User.FindFirstValue("sub");

        tenantId = Guid.Empty;
        userId = Guid.Empty;

        return Guid.TryParse(rawTenant, out tenantId) && Guid.TryParse(rawSub, out userId);
    }
}

public record UpsertDesignDraftRequest(string SnapshotJson);
