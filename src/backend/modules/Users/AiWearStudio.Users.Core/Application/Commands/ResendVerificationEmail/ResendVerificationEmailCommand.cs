using AiWearStudio.SharedKernel.Application;
using MediatR;

namespace AiWearStudio.Users.Core.Application.Commands.ResendVerificationEmail;

public record ResendVerificationEmailCommand(string Email) : ICommand<Unit>;
