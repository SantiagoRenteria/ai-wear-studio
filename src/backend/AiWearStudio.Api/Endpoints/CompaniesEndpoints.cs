using AiWearStudio.CompanyAdmin.Application.Commands.AssignPlan;
using AiWearStudio.CompanyAdmin.Application.Commands.CreateCompany;
using AiWearStudio.CompanyAdmin.Application.Commands.SuspendCompany;
using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.CompanyAdmin.Domain.Repositories;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiWearStudio.Api.Endpoints;

public static class CompaniesEndpoints
{
    public static void MapCompaniesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/companies")
            .RequireAuthorization(new AuthorizeAttribute { Roles = "platform_admin" });

        group.MapPost("/", async (
            CreateCompanyRequest req,
            ISender sender,
            HttpContext ctx,
            CancellationToken ct) =>
        {
            if (!TryGetAdminId(ctx, out var adminId))
                return Results.Problem(title: "Identidad no válida", detail: "El token no contiene un identificador de usuario válido.", statusCode: 401);
            var id = await sender.Send(new CreateCompanyCommand(req.Name, req.Slug, req.Plan, adminId), ct);
            return Results.Created($"/api/v1/companies/{id}", new { id });
        })
        .WithName("CreateCompany")
        .Produces(201)
        .ProducesProblem(400)
        .ProducesProblem(401)
        .ProducesProblem(403)
        .ProducesProblem(409);

        group.MapGet("/", async (ICompanyRepository repo, CancellationToken ct) =>
        {
            var companies = await repo.ListAsync(ct);
            return Results.Ok(companies.Select(c => new
            {
                c.Id, c.Name, c.Slug, c.Plan, c.PlanStatus, c.CreatedAt, c.ActivatedAt
            }));
        })
        .WithName("ListCompanies")
        .Produces(200)
        .ProducesProblem(401)
        .ProducesProblem(403);

        group.MapGet("/{id:guid}", async (Guid id, ICompanyRepository repo, CancellationToken ct) =>
        {
            var company = await repo.FindByIdAsync(id, ct);
            if (company is null)
                return Results.Problem(title: "Compañía no encontrada", detail: "La compañía solicitada no existe.", statusCode: 404);

            return Results.Ok(new
            {
                company.Id, company.Name, company.Slug, company.Plan,
                company.PlanStatus, company.CreatedAt, company.ActivatedAt, company.ActivatedBy
            });
        })
        .WithName("GetCompany")
        .Produces(200)
        .ProducesProblem(401)
        .ProducesProblem(403)
        .ProducesProblem(404);

        group.MapPatch("/{id:guid}/plan", async (
            Guid id,
            AssignPlanRequest req,
            ISender sender,
            HttpContext ctx,
            CancellationToken ct) =>
        {
            if (!TryGetAdminId(ctx, out var adminId))
                return Results.Problem(title: "Identidad no válida", detail: "El token no contiene un identificador de usuario válido.", statusCode: 401);
            await sender.Send(new AssignPlanCommand(id, req.NewPlan, adminId, req.Reason), ct);
            return Results.Ok();
        })
        .WithName("AssignPlan")
        .Produces(200)
        .ProducesProblem(400)
        .ProducesProblem(401)
        .ProducesProblem(403)
        .ProducesProblem(404);

        group.MapPatch("/{id:guid}/suspend", async (
            Guid id,
            SuspendCompanyRequest req,
            ISender sender,
            HttpContext ctx,
            CancellationToken ct) =>
        {
            if (!TryGetAdminId(ctx, out var adminId))
                return Results.Problem(title: "Identidad no válida", detail: "El token no contiene un identificador de usuario válido.", statusCode: 401);
            await sender.Send(new SuspendCompanyCommand(id, adminId, req.Reason), ct);
            return Results.Ok();
        })
        .WithName("SuspendCompany")
        .Produces(200)
        .ProducesProblem(400)
        .ProducesProblem(401)
        .ProducesProblem(403)
        .ProducesProblem(404);
    }

    private static bool TryGetAdminId(HttpContext ctx, out Guid adminId)
    {
        var sub = ctx.User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out adminId);
    }
}

public record CreateCompanyRequest(string Name, string Slug, Plan Plan);
public record AssignPlanRequest(Plan NewPlan, string? Reason);
public record SuspendCompanyRequest(string? Reason);
