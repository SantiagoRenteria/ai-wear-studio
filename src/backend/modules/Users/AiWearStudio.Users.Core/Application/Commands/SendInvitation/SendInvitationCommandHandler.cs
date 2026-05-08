using AiWearStudio.SharedKernel.Common;
using AiWearStudio.SharedKernel.Domain;
using AiWearStudio.Users.Core.Domain.Entities;
using AiWearStudio.Users.Core.Domain.Repositories;
using MediatR;

namespace AiWearStudio.Users.Core.Application.Commands.SendInvitation;

public class SendInvitationCommandHandler(
    IUserInvitationRepository invitationRepository,
    IEmailSender emailSender)
    : IRequestHandler<SendInvitationCommand, Guid>
{
    public async Task<Guid> Handle(SendInvitationCommand request, CancellationToken ct)
    {
        var existing = await invitationRepository.FindPendingAsync(request.Email, request.TenantId, ct);
        if (existing is not null)
            throw new DomainException($"DUPLICATE_INVITATION: Ya existe una invitación pendiente para '{request.Email}' en este tenant.");

        var invitation = UserInvitation.Create(request.Email, request.Role, request.TenantId, request.InvitedBy);

        await invitationRepository.AddAsync(invitation, ct);
        await invitationRepository.SaveChangesAsync(ct);

        await emailSender.SendInvitationAsync(invitation.Email, invitation.Token, ct);

        return invitation.Id;
    }
}
