using AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;
using AiWearStudio.Catalog.Application.Queries.GetGarmentZones;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace AiWearStudio.Api.Endpoints;

public static class CatalogEndpoints
{
    public static void MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/catalog")
            .RequireAuthorization(new AuthorizeAttribute { Roles = "customer,workshop_admin" });

        group.MapGet("/garments", async (
            HttpContext ctx,
            ISender sender,
            CancellationToken ct) =>
        {
            if (!TryGetTenantId(ctx, out var tenantId))
                return Results.Problem(title: "Identidad no válida", detail: "El token no contiene un tenant_id válido.", statusCode: 401);

            var garments = await sender.Send(new GetCatalogGarmentsQuery(tenantId), ct);
            return Results.Ok(garments);
        })
        .WithName("GetCatalogGarments")
        .Produces<List<GarmentDto>>(200)
        .ProducesProblem(401)
        .ProducesProblem(403);

        group.MapGet("/garments/{garmentId:guid}/views/{viewId:guid}/zones", async (
            Guid garmentId,
            Guid viewId,
            HttpContext ctx,
            ISender sender,
            CancellationToken ct) =>
        {
            if (!TryGetTenantId(ctx, out var tenantId))
                return Results.Problem(title: "Identidad no válida", detail: "El token no contiene un tenant_id válido.", statusCode: 401);

            var zones = await sender.Send(new GetGarmentZonesQuery(garmentId, viewId, tenantId), ct);
            return Results.Ok(zones);
        })
        .WithName("GetGarmentZones")
        .Produces<List<PrintZoneDto>>(200)
        .ProducesProblem(401)
        .ProducesProblem(403)
        .ProducesProblem(404);
    }

    private static bool TryGetTenantId(HttpContext ctx, out Guid tenantId)
    {
        var raw = ctx.User.FindFirstValue("tenant_id");
        return Guid.TryParse(raw, out tenantId);
    }
}
