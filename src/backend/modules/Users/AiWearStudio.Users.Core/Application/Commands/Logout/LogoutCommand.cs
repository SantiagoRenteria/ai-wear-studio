using AiWearStudio.SharedKernel.Application;
using MediatR;

namespace AiWearStudio.Users.Core.Application.Commands.Logout;

public record LogoutCommand(string Token) : ICommand<Unit>;
