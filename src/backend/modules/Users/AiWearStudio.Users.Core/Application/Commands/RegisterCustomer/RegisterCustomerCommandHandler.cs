using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Application.DTOs;
using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;

namespace AiWearStudio.Users.Core.Application.Commands.RegisterCustomer;

public class RegisterCustomerCommandHandler(
    IUserRepository userRepository,
    IJwtTokenService jwtTokenService,
    IPasswordHasherService passwordHasher)
    : IRequestHandler<RegisterCustomerCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(RegisterCustomerCommand request, CancellationToken ct)
    {
        var email = request.Email.ToLowerInvariant().Trim();

        var existsAsInternal = await userRepository.ExistsWithEmailAndRoleGroupAsync(email, isCustomer: false, ct);
        if (existsAsInternal)
            throw new DomainException($"ROLE_CONFLICT: El email '{email}' ya está registrado como usuario interno.");

        var existsAsCustomer = await userRepository.ExistsWithEmailAndRoleGroupAsync(email, isCustomer: true, ct);
        if (existsAsCustomer)
            throw new DomainException($"DUPLICATE_EMAIL: El email '{email}' ya está registrado.");

        var hash = passwordHasher.HashPassword(request.Password);
        var userWithHash = User.CreateCustomer(email, hash);

        await userRepository.AddAsync(userWithHash, ct);
        await userRepository.SaveChangesAsync(ct);

        var accessToken = jwtTokenService.GenerateAccessToken(userWithHash);
        var refreshToken = jwtTokenService.GenerateRefreshToken();

        return new AuthResponse(accessToken, refreshToken);
    }
}
