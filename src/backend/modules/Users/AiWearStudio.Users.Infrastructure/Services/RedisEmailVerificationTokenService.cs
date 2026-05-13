using AiWearStudio.Users.Core.Application.Services;
using StackExchange.Redis;
using System.Security.Cryptography;

namespace AiWearStudio.Users.Infrastructure.Services;

public class RedisEmailVerificationTokenService(IConnectionMultiplexer redis) : IEmailVerificationTokenService
{
    private const long TokenTtlSeconds = 86400;
    private const long ResendWindowSeconds = 900;
    private const int ResendLimit = 3;

    // P2 patch: atomic create — GET old token, DEL old token-key, SET new token-key and user-key.
    // Dynamic key construction inside Lua is safe for non-cluster Redis.
    private const string CreateScript = """
        local oldToken = redis.call('GET', KEYS[1])
        if oldToken ~= false then
            redis.call('DEL', 'email:verify:' .. tostring(oldToken))
        end
        redis.call('SET', 'email:verify:' .. ARGV[1], ARGV[3], 'EX', tonumber(ARGV[2]))
        redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]))
        return 1
        """;

    // P6 patch: atomic consume — GET then DEL both keys in one script.
    private const string ConsumeScript = """
        local userId = redis.call('GET', KEYS[1])
        if userId == false then return false end
        redis.call('DEL', KEYS[1])
        redis.call('DEL', 'email:verify:user:' .. tostring(userId))
        return userId
        """;

    public async Task<string> CreateTokenAsync(Guid userId, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var userKey = $"email:verify:user:{userId}";

        await db.ScriptEvaluateAsync(CreateScript,
            new RedisKey[] { userKey },
            new RedisValue[] { token, TokenTtlSeconds, userId.ToString() });

        return token;
    }

    public async Task<Guid?> ConsumeTokenAsync(string token, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        var tokenKey = $"email:verify:{token}";

        var result = await db.ScriptEvaluateAsync(ConsumeScript, new RedisKey[] { tokenKey });
        if (result.IsNull || !Guid.TryParse((string?)result, out var userId))
            return null;

        return userId;
    }

    public async Task<bool> CheckAndIncrementResendAsync(string email, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        var key = $"resend:limit:{email}";

        const string script = """
            local c = redis.call('INCR', KEYS[1])
            if c == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return c
            """;

        var result = (long)await db.ScriptEvaluateAsync(script, new RedisKey[] { key },
            new RedisValue[] { ResendWindowSeconds });

        return result <= ResendLimit;
    }
}
