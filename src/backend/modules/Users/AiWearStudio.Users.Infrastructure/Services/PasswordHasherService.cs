using AiWearStudio.Users.Core.Application.Interfaces;
using AiWearStudio.Users.Core.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace AiWearStudio.Users.Infrastructure.Services;

public class PasswordHasherService(IPasswordHasher<User> inner) : IPasswordHasherService
{
    public string HashPassword(string password) =>
        inner.HashPassword(null!, password);

    public bool VerifyPassword(string hashedPassword, string providedPassword) =>
        inner.VerifyHashedPassword(null!, hashedPassword, providedPassword) != PasswordVerificationResult.Failed;
}
