using AiWearStudio.SharedKernel.Application;
using AiWearStudio.Users.Core.Application.DTOs;

namespace AiWearStudio.Users.Core.Application.Commands.RefreshToken;

public record RefreshTokenCommand(string Token) : ICommand<AuthResponse>;
