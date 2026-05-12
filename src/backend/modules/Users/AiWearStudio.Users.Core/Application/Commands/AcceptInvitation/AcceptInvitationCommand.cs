using AiWearStudio.SharedKernel.Application;
using AiWearStudio.Users.Core.Application.DTOs;

namespace AiWearStudio.Users.Core.Application.Commands.AcceptInvitation;

public record AcceptInvitationCommand(Guid Token, string Password) : ICommand<AuthResponse>;
