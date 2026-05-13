using AiWearStudio.SharedKernel.Application;

namespace AiWearStudio.DesignEngine.Core.Application.Commands.UploadDesignAsset;

public record UploadDesignAssetCommand(
    Guid DesignId,
    Guid TenantId,
    Stream FileStream,
    string ContentType,
    long FileSize) : ICommand<UploadAssetResult>;

public record UploadAssetResult(Guid AssetId, string Url);
