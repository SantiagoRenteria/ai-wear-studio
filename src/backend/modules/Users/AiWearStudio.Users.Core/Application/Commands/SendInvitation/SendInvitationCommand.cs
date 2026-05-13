using AiWearStudio.SharedKernel.Application;
using AiWearStudio.Users.Core.Domain.Enums;
using MediatR;

namespace AiWearStudio.Users.Core.Application.Commands.SendInvitation;

public record SendInvitationCommand(string Email, UserRole Role, Guid TenantId, Guid InvitedBy) : ICommand<Guid>;
