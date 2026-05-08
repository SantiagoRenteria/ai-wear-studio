using AiWearStudio.Users.Core.Application.Commands.DeactivateUser;
using MediatR;
using Microsoft.AspNetCore.Authorization;

namespace AiWearStudio.Api.Endpoints;

public static class UsersEndpoints
{
    public static void MapUsersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/users");

        group.MapDelete("/{id:guid}", async (
            Guid id,
            ISender sender,
            CancellationToken ct) =>
        {
            await sender.Send(new DeactivateUserCommand(id), ct);
            return Results.NoContent();
        })
        .WithName("DeactivateUser")
        .Produces(204)
        .ProducesProblem(401)
        .ProducesProblem(403)
        .ProducesProblem(404)
        .RequireAuthorization(new AuthorizeAttribute { Roles = "platform_admin" });
    }
}
