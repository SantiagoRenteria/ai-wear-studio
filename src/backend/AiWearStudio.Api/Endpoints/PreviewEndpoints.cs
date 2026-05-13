using AiWearStudio.SharedKernel.Domain;
using Minio;
using Minio.DataModel.Args;
using StackExchange.Redis;
using System.Text.RegularExpressions;

namespace AiWearStudio.Api.Endpoints;

public static class PreviewEndpoints
{
    private const long MaxFileSizeBytes = 5_242_880; // 5 MB
    private const int IpRateLimitPerMinute = 10;
    private const string PreviewBucket = "ai-wear-previews";

    private static readonly byte[] PngMagic = [0x89, 0x50, 0x4E, 0x47];
    private static readonly byte[] JpegMagic = [0xFF, 0xD8, 0xFF];

    // P11 patch: use const string instead of LuaScript.Prepare for consistency
    private const string RateLimitScript = """
        local c = redis.call('INCR', KEYS[1])
        if c == 1 then redis.call('EXPIRE', KEYS[1], 60) end
        return c
        """;

    public static void MapPreviewEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/preview/logo", async (
            HttpContext ctx,
            IMinioClient minio,
            IConnectionMultiplexer redis,
            IConfiguration config,
            CancellationToken ct) =>
        {
            // P5 patch: ForwardedHeaders middleware (registered in Program.cs) populates
            // RemoteIpAddress correctly from X-Forwarded-For when behind a proxy.
            var ip = ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            await EnforceIpRateLimitAsync(redis, ip);

            if (!ctx.Request.HasFormContentType)
                throw new DomainException("INVALID_FILE_TYPE");

            var form = await ctx.Request.ReadFormAsync(ct);
            var file = form.Files.GetFile("logo");
            if (file is null)
                throw new DomainException("INVALID_FILE_TYPE");

            if (file.Length > MaxFileSizeBytes)
                throw new DomainException("FILE_TOO_LARGE");

            // P4 patch: buffer into MemoryStream to guarantee a seekable stream
            // for magic-byte validation, regardless of the underlying IFormFile stream.
            using var ms = new MemoryStream((int)file.Length);
            using (var raw = file.OpenReadStream())
                await raw.CopyToAsync(ms, ct);
            ms.Position = 0;

            var contentType = ValidateFile(file.ContentType, ms);
            ms.Position = 0;

            var previewId = Guid.NewGuid();
            // P6 patch: extension derived from validated contentType, not from client filename
            var safeName = SanitizeFileName(file.FileName, contentType);
            var objectKey = $"temp/{previewId}/{safeName}";

            // P10 patch: catch MinIO infrastructure failures and surface as 503
            try
            {
                await minio.PutObjectAsync(new PutObjectArgs()
                    .WithBucket(PreviewBucket)
                    .WithObject(objectKey)
                    .WithStreamData(ms)
                    .WithObjectSize(file.Length)
                    .WithContentType(contentType), ct);
            }
            catch (Exception ex) when (ex is not DomainException and not OperationCanceledException)
            {
                return Results.Problem(
                    detail: "El servicio de vista previa no está disponible temporalmente.",
                    statusCode: 503,
                    title: "Servicio no disponible");
            }

            var publicBase = config["MinIO:PublicBaseUrl"] ?? "http://localhost:9000";
            var previewUrl = $"{publicBase.TrimEnd('/')}/{PreviewBucket}/{objectKey}";
            var expiresAt = DateTime.UtcNow.AddHours(2).ToString("o");

            return Results.Ok(new { previewUrl, expiresAt });
        })
        .WithName("PreviewLogo")
        .AllowAnonymous()
        .DisableAntiforgery()
        .Produces(200)
        .ProducesProblem(400)
        .ProducesProblem(429)
        .ProducesProblem(503);
    }

    // P3 patch: SVG rejected entirely — insufficient sanitization for anonymous uploads.
    // Only PNG and JPEG are accepted. SVG can be re-enabled with a dedicated sanitizer library.
    private static string ValidateFile(string declaredContentType, MemoryStream ms)
    {
        var header = new byte[512];
        ms.Read(header, 0, Math.Min(512, (int)ms.Length));
        ms.Position = 0;

        var normalizedType = declaredContentType.Split(';')[0].Trim().ToLowerInvariant();

        if (normalizedType == "image/png" && MatchesMagic(header, PngMagic))
            return "image/png";

        if (normalizedType == "image/jpeg" && MatchesMagic(header, JpegMagic))
            return "image/jpeg";

        throw new DomainException("INVALID_FILE_TYPE");
    }

    private static bool MatchesMagic(byte[] header, byte[] magic)
    {
        if (header.Length < magic.Length) return false;
        for (var i = 0; i < magic.Length; i++)
            if (header[i] != magic[i]) return false;
        return true;
    }

    // P6 patch: extension is always derived from the validated contentType —
    // never from the filename declared by the client.
    private static string SanitizeFileName(string fileName, string contentType)
    {
        var ext = contentType == "image/jpeg" ? ".jpg" : ".png";
        var name = Path.GetFileNameWithoutExtension(fileName);
        var safe = string.IsNullOrWhiteSpace(name)
            ? "preview"
            : Regex.Replace(name, @"[^a-zA-Z0-9_\-]", "_");
        if (safe.Length == 0) safe = "preview";
        return $"{safe[..Math.Min(safe.Length, 40)]}{ext}";
    }

    private static async Task EnforceIpRateLimitAsync(IConnectionMultiplexer redis, string ip)
    {
        var db = redis.GetDatabase();
        var key = $"preview:rate:{ip}";
        var count = (long)await db.ScriptEvaluateAsync(RateLimitScript, new RedisKey[] { key });
        if (count > IpRateLimitPerMinute)
            throw new DomainException("PREVIEW_RATE_LIMIT_EXCEEDED");
    }
}
