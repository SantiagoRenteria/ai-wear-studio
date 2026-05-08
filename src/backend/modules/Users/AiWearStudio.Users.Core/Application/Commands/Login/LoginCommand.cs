using AiWearStudio.SharedKernel.Application;
using AiWearStudio.Users.Core.Application.DTOs;

namespace AiWearStudio.Users.Core.Application.Commands.Login;

public record LoginCommand(string Email, string Password) : ICommand<AuthResponse>;
