using AiWearStudio.SharedKernel.Application;
using MediatR;

namespace AiWearStudio.Users.Core.Application.Commands.VerifyEmail;

public record VerifyEmailCommand(string Token) : ICommand<Unit>;
