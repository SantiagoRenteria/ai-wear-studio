namespace AiWearStudio.SharedKernel.Common;

public interface IEmailSender
{
    Task SendInvitationAsync(string toEmail, Guid token, CancellationToken ct = default);
    Task SendVerificationEmailAsync(string toEmail, string token, CancellationToken ct = default);
}
