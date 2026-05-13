using AiWearStudio.DesignEngine.Core.Application.Commands.UploadDesignAsset;
using AiWearStudio.SharedKernel.Common;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace AiWearStudio.DesignEngine.Infrastructure.Handlers;

public class UploadDesignAssetCommandHandler(IAssetStorage storage, IConfiguration config)
    : IRequestHandler<UploadDesignAssetCommand, UploadAssetResult>
{
    private const string Bucket = "ai-wear-assets";

    public async Task<UploadAssetResult> Handle(UploadDesignAssetCommand request, CancellationToken ct)
    {
        var ext = request.ContentType switch
        {
            "image/png" => ".png",
            "image/jpeg" => ".jpg",
            "image/webp" => ".webp",
            "image/svg+xml" => ".svg",
            _ => ".bin",
        };

        var assetId = Guid.NewGuid();
        var key = $"{request.TenantId}/{request.DesignId}/{assetId}{ext}";

        await storage.UploadAsync(Bucket, key, request.FileStream, request.ContentType, ct);

        var publicBase = config["MinIO:PublicBaseUrl"]
            ?? throw new InvalidOperationException("MinIO:PublicBaseUrl not configured");
        var url = $"{publicBase.TrimEnd('/')}/{Bucket}/{key}";

        return new UploadAssetResult(assetId, url);
    }
}
