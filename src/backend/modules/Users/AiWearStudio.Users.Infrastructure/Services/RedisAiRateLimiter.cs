using AiWearStudio.SharedKernel.Common;
using StackExchange.Redis;

namespace AiWearStudio.Users.Infrastructure.Services;

public class RedisAiRateLimiter(IConnectionMultiplexer redis) : IAiRateLimiter
{
    private const int Limit = 10;
    private const int TtlSeconds = 86400;

    private const string Script = """
        local c = tonumber(redis.call('GET', KEYS[1]) or 0)
        if c >= tonumber(ARGV[1]) then return -1 end
        local n = redis.call('INCR', KEYS[1])
        if n == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2])) end
        return n
        """;

    public async Task<int> CheckAndIncrementAsync(Guid userId, CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        var key = $"rate_limit:ai:{userId}";
        var result = await db.ScriptEvaluateAsync(Script,
            new RedisKey[] { key },
            new RedisValue[] { Limit, TtlSeconds });
        return (int)result;
    }
}
