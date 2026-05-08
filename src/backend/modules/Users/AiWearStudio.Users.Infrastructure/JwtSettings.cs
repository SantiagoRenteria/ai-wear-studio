namespace AiWearStudio.Users.Infrastructure;

public class JwtSettings
{
    public string Secret { get; set; } = default!;
    public string Issuer { get; set; } = default!;
    public string Audience { get; set; } = default!;
    public int TtlMinutes { get; set; } = 60;
    public int RefreshTokenTtlDays { get; set; } = 30;
}
