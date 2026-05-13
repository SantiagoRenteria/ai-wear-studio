using AiWearStudio.Catalog.Application.Commands.SetColorStatus;
using AiWearStudio.Catalog.Application.Commands.SetGarmentStatus;
using AiWearStudio.Catalog.Application.Queries.GetAdminCatalog;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace AiWearStudio.Api.Endpoints;

public static class AdminCatalogEndpoints
{
    public static void MapAdminCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/catalog")
            .RequireAuthorization(new AuthorizeAttribute { Roles = "workshop_admin" });

        group.MapGet("/garments", async (HttpContext ctx, ISender sender, CancellationToken ct) =>
        {
            if (!TryGetTenantAndAdmin(ctx, out var tenantId, out _))
                return Results.Problem(title: "Identidad no válida", statusCode: 401);

            var result = await sender.Send(new GetAdminCatalogQuery(tenantId), ct);
            return Results.Ok(result);
        })
        .WithName("GetAdminCatalog")
        .Produces<List<AdminGarmentDto>>(200)
        .ProducesProblem(401);

        group.MapPatch("/garments/{garmentId:guid}", async (
            Guid garmentId,
            SetGarmentStatusRequest body,
            HttpContext ctx,
            ISender sender,
            CancellationToken ct) =>
        {
            if (!TryGetTenantAndAdmin(ctx, out var tenantId, out var adminId))
                return Results.Problem(title: "Identidad no válida", statusCode: 401);

            await sender.Send(new SetGarmentStatusCommand(tenantId, garmentId, body.IsActive, adminId), ct);
            return Results.Ok();
        })
        .WithName("SetGarmentStatus")
        .Produces(200)
        .ProducesProblem(401)
        .ProducesProblem(404);

        group.MapPatch("/garments/{garmentId:guid}/colors/{colorVariantId:guid}", async (
            Guid garmentId,
            Guid colorVariantId,
            SetColorStatusRequest body,
            HttpContext ctx,
            ISender sender,
            CancellationToken ct) =>
        {
            if (!TryGetTenantAndAdmin(ctx, out var tenantId, out var adminId))
                return Results.Problem(title: "Identidad no válida", statusCode: 401);

            await sender.Send(new SetColorStatusCommand(tenantId, garmentId, colorVariantId, body.IsActive, adminId), ct);
            return Results.Ok();
        })
        .WithName("SetColorStatus")
        .Produces(200)
        .ProducesProblem(401)
        .ProducesProblem(404)
        .ProducesProblem(422);
    }

    private static bool TryGetTenantAndAdmin(HttpContext ctx, out Guid tenantId, out Guid adminId)
    {
        var rawTenant = ctx.User.FindFirstValue("tenant_id");
        var rawSub = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? ctx.User.FindFirstValue("sub");

        tenantId = Guid.Empty;
        adminId = Guid.Empty;

        return Guid.TryParse(rawTenant, out tenantId) && Guid.TryParse(rawSub, out adminId);
    }
}

public record SetGarmentStatusRequest(bool IsActive);
public record SetColorStatusRequest(bool IsActive);
