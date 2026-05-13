using AiWearStudio.Users.Core.Application.Commands.SendInvitation;
using AiWearStudio.Users.Core.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AiWearStudio.Api.Endpoints;

public static class InvitationsEndpoints
{
    public static void MapInvitationsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/invitations")
            .RequireAuthorization();

        group.MapPost("/", async (
            [FromBody] SendInvitationRequest request,
            HttpContext httpContext,
            ISender sender,
            CancellationToken ct) =>
        {
            var claims = httpContext.User;
            var callerId = Guid.Parse(claims.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var callerRole = claims.FindFirstValue("role");
            var callerTenantId = claims.FindFirstValue("tenant_id") is { } t ? Guid.Parse(t) : (Guid?)null;

            var tenantId = request.TenantId;

            if (callerRole == "workshop_admin")
            {
                if (callerTenantId is null || callerTenantId != tenantId)
                    throw new AiWearStudio.SharedKernel.Domain.DomainException(
                        "INVITE_SCOPE_VIOLATION: Un WorkshopAdmin solo puede invitar a usuarios de su propio tenant.");
            }

            var id = await sender.Send(new SendInvitationCommand(request.Email, request.Role, tenantId, callerId), ct);
            return Results.Created($"/api/v1/invitations/{id}", new { id });
        })
        .WithName("SendInvitation")
        .Produces(201)
        .ProducesProblem(400)
        .ProducesProblem(403)
        .ProducesProblem(409)
        .RequireAuthorization(new AuthorizeAttribute { Roles = "platform_admin,workshop_admin" });
    }
}

public record SendInvitationRequest(string Email, UserRole Role, Guid TenantId);
