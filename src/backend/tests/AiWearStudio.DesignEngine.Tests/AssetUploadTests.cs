using AiWearStudio.DesignEngine.Core.Application.Commands.UploadDesignAsset;
using AiWearStudio.DesignEngine.Core.Application.Services;
using AiWearStudio.DesignEngine.Infrastructure.Handlers;
using AiWearStudio.SharedKernel.Common;
using AiWearStudio.SharedKernel.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Primitives;

namespace AiWearStudio.DesignEngine.Tests;

public class AssetUploadTests
{
    // --- helpers ---

    private static byte[] PngBytes()
    {
        // Valid PNG magic bytes header (minimal 12 bytes)
        var bytes = new byte[20];
        bytes[0] = 0x89; bytes[1] = 0x50; bytes[2] = 0x4E; bytes[3] = 0x47; // PNG
        bytes[4] = 0x0D; bytes[5] = 0x0A; bytes[6] = 0x1A; bytes[7] = 0x0A;
        return bytes;
    }

    private static MemoryStream StreamOf(byte[] data) => new(data);

    private static IConfiguration TestConfig(string publicBase = "http://test-minio:9000")
        => new InlineConfiguration(new Dictionary<string, string?> { ["MinIO:PublicBaseUrl"] = publicBase });

    // --- T6.1: AC-ASSET-AUTH ---

    [Fact(DisplayName = "AC-ASSET-AUTH: upload PNG autenticado retorna URL de MinIO")]
    [Trait("Category", "Integration")]
    public async Task UploadAsset_PngAuthenticated_Returns201WithMinioUrl()
    {
        var storage = new FakeAssetStorage();
        var handler = new UploadDesignAssetCommandHandler(storage, TestConfig());

        var designId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        using var stream = StreamOf(PngBytes());

        var result = await handler.Handle(
            new UploadDesignAssetCommand(designId, tenantId, stream, "image/png", stream.Length),
            CancellationToken.None);

        Assert.NotEqual(Guid.Empty, result.AssetId);
        Assert.StartsWith("http://test-minio:9000/ai-wear-assets/", result.Url);
        Assert.Contains(tenantId.ToString(), result.Url);
        Assert.Contains(designId.ToString(), result.Url);
        Assert.EndsWith(".png", result.Url);
        Assert.Single(storage.UploadedKeys);
    }

    // --- T6.2: AC-ASSET-SIZE ---

    [Fact(DisplayName = "AC-ASSET-SIZE: archivo > 10MB lanza ASSET_TOO_LARGE")]
    [Trait("Category", "Unit")]
    public void ValidateSize_Over10MB_ThrowsAssetTooLarge()
    {
        const long overLimit = AssetValidator.MaxAssetBytes + 1;
        var ex = Assert.Throws<DomainException>(() => AssetValidator.ValidateSize(overLimit));
        Assert.StartsWith("ASSET_TOO_LARGE", ex.Message);
    }

    [Fact(DisplayName = "AC-ASSET-SIZE: archivo exactamente 10MB es aceptado")]
    [Trait("Category", "Unit")]
    public void ValidateSize_Exactly10MB_DoesNotThrow()
    {
        AssetValidator.ValidateSize(AssetValidator.MaxAssetBytes); // should not throw
    }

    // --- T6.3: AC-ASSET-SVG ---

    [Fact(DisplayName = "AC-ASSET-SVG: SVG con <script> lanza SVG_UNSAFE_CONTENT")]
    [Trait("Category", "Unit")]
    public void ValidateSvgContent_WithScript_ThrowsSvgUnsafe()
    {
        const string svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>";
        var ex = Assert.Throws<DomainException>(() => AssetValidator.ValidateSvgContent(svg));
        Assert.StartsWith("SVG_UNSAFE_CONTENT", ex.Message);
    }

    [Fact(DisplayName = "AC-ASSET-SVG: SVG limpio es aceptado")]
    [Trait("Category", "Unit")]
    public void ValidateSvgContent_CleanSvg_DoesNotThrow()
    {
        const string svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"50\" cy=\"50\" r=\"40\"/></svg>";
        AssetValidator.ValidateSvgContent(svg); // should not throw
    }

    // --- stubs ---

    private sealed class FakeAssetStorage : IAssetStorage
    {
        public List<string> UploadedKeys { get; } = [];

        public Task<string> UploadAsync(string bucket, string key, Stream content, string contentType, CancellationToken ct = default)
        {
            UploadedKeys.Add(key);
            return Task.FromResult(key);
        }

        public Task<Stream> DownloadAsync(string bucket, string key, CancellationToken ct = default)
            => Task.FromResult<Stream>(new MemoryStream());

        public Task DeleteAsync(string bucket, string key, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    private sealed class InlineConfiguration(Dictionary<string, string?> values) : IConfiguration
    {
        public string? this[string key]
        {
            get => values.TryGetValue(key, out var v) ? v : null;
            set => values[key] = value;
        }

        public IConfigurationSection GetSection(string key) => throw new NotSupportedException();
        public IEnumerable<IConfigurationSection> GetChildren() => [];
        public IChangeToken GetReloadToken() => throw new NotSupportedException();
    }
}
