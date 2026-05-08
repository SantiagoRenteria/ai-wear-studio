using AiWearStudio.SharedKernel.Application;
using MediatR;

namespace AiWearStudio.Users.Core.Application.Commands.DeactivateUser;

public record DeactivateUserCommand(Guid UserId) : ICommand<Unit>;
