using AiWearStudio.SharedKernel.Common;
using Microsoft.Extensions.Logging;

namespace AiWearStudio.Users.Infrastructure.Services;

public class LoggingEmailSender(ILogger<LoggingEmailSender> logger) : IEmailSender
{
    public Task SendInvitationAsync(string toEmail, Guid token, CancellationToken ct = default)
    {
        logger.LogInformation("INVITATION_EMAIL to={Email} token={Token}", toEmail, token);
        return Task.CompletedTask;
    }
}
