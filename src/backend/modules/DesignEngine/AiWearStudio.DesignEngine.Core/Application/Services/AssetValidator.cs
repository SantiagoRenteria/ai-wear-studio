using AiWearStudio.SharedKernel.Domain;

namespace AiWearStudio.DesignEngine.Core.Application.Services;

public static class AssetValidator
{
    public const long MaxAssetBytes = 10L * 1024 * 1024;

    public static string DetectContentType(Stream stream)
    {
        Span<byte> header = stackalloc byte[12];
        var read = stream.Read(header);
        stream.Position = 0;

        if (read >= 4 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47)
            return "image/png";

        if (read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
            return "image/jpeg";

        if (read >= 12
            && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
            && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
            return "image/webp";

        if (read >= 4)
        {
            var prefix = System.Text.Encoding.UTF8.GetString(header[..Math.Min(read, 5)]);
            if (prefix.StartsWith("<?xml", StringComparison.OrdinalIgnoreCase)
                || prefix.StartsWith("<svg", StringComparison.OrdinalIgnoreCase))
                return "image/svg+xml";
        }

        throw new DomainException("INVALID_FILE_TYPE");
    }

    public static void ValidateSize(long fileSize)
    {
        if (fileSize > MaxAssetBytes)
            throw new DomainException("ASSET_TOO_LARGE");
    }

    public static void ValidateSvgContent(string content)
    {
        var lower = content.ToLowerInvariant();
        if (lower.Contains("<script")
            || lower.Contains("javascript:")
            || lower.Contains("data:text/")
            || lower.Contains("data:application/")
            || lower.Contains("onload=")
            || lower.Contains("onerror=")
            || lower.Contains("onclick=")
            || lower.Contains("onmouse")
            || lower.Contains("onkey")
            || lower.Contains("onfocus=")
            || lower.Contains("onblur=")
            || lower.Contains("oninput=")
            || lower.Contains("onsubmit=")
            || lower.Contains("onchange="))
            throw new DomainException("SVG_UNSAFE_CONTENT");
    }
}
