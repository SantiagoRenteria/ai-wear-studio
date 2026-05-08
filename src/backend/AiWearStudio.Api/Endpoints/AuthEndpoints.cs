using AiWearStudio.Users.Core.Application.Commands.Login;
using AiWearStudio.Users.Core.Application.Commands.Logout;
using AiWearStudio.Users.Core.Application.Commands.RefreshToken;
using AiWearStudio.Users.Core.Application.Commands.RegisterCustomer;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AiWearStudio.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth");

        group.MapPost("/register", async (
            [FromBody] RegisterCustomerRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new RegisterCustomerCommand(request.Email, request.Password), ct);
            return Results.Created("/api/v1/auth/me", result);
        })
        .WithName("RegisterCustomer")
        .Produces(201)
        .ProducesProblem(400)
        .ProducesProblem(409);

        group.MapPost("/login", async (
            [FromBody] LoginRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new LoginCommand(request.Email, request.Password), ct);
            return Results.Ok(result);
        })
        .WithName("Login")
        .Produces(200)
        .ProducesProblem(400)
        .ProducesProblem(401);

        group.MapPost("/refresh", async (
            [FromBody] RefreshRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            var result = await sender.Send(new RefreshTokenCommand(request.Token), ct);
            return Results.Ok(result);
        })
        .WithName("RefreshToken")
        .Produces(200)
        .ProducesProblem(401);

        group.MapPost("/logout", async (
            [FromBody] LogoutRequest request,
            ISender sender,
            CancellationToken ct) =>
        {
            await sender.Send(new LogoutCommand(request.Token), ct);
            return Results.NoContent();
        })
        .WithName("Logout")
        .Produces(204);
    }
}

public record RegisterCustomerRequest(string Email, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string Token);
public record LogoutRequest(string Token);
