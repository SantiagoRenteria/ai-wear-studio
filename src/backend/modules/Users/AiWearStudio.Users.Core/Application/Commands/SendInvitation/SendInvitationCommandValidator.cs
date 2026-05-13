using AiWearStudio.Users.Core.Domain.Enums;
using FluentValidation;

namespace AiWearStudio.Users.Core.Application.Commands.SendInvitation;

public class SendInvitationCommandValidator : AbstractValidator<SendInvitationCommand>
{
    public SendInvitationCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320)
            .WithMessage("Email debe ser una dirección válida.");
        RuleFor(x => x.Role)
            .Must(r => r == UserRole.WorkshopAdmin || r == UserRole.Operator)
            .WithMessage("Solo se puede invitar con rol WorkshopAdmin u Operator.");
        RuleFor(x => x.TenantId).NotEqual(Guid.Empty).WithMessage("TenantId no puede ser vacío.");
        RuleFor(x => x.InvitedBy).NotEqual(Guid.Empty).WithMessage("InvitedBy no puede ser vacío.");
    }
}
