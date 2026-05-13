using AiWearStudio.SharedKernel.Common;
using Minio;
using Minio.DataModel.Args;

namespace AiWearStudio.DesignEngine.Infrastructure.Storage;

public class MinioAssetStorage(IMinioClient minio) : IAssetStorage
{
    public async Task<string> UploadAsync(
        string bucket, string key, Stream content, string contentType,
        CancellationToken ct = default)
    {
        await minio.PutObjectAsync(new PutObjectArgs()
            .WithBucket(bucket)
            .WithObject(key)
            .WithStreamData(content)
            .WithObjectSize(content.Length)
            .WithContentType(contentType), ct);

        return key;
    }

    public async Task<Stream> DownloadAsync(string bucket, string key, CancellationToken ct = default)
    {
        var ms = new MemoryStream();
        // Minio SDK v6 WithCallbackStream acepta solo Action<Stream> (síncrono).
        // CopyTo es intencional; el bloqueo es mínimo para operaciones de descarga.
        await minio.GetObjectAsync(new GetObjectArgs()
            .WithBucket(bucket)
            .WithObject(key)
            .WithCallbackStream(stream => stream.CopyTo(ms)), ct);
        ms.Position = 0;
        return ms;
    }

    public async Task DeleteAsync(string bucket, string key, CancellationToken ct = default)
    {
        await minio.RemoveObjectAsync(new RemoveObjectArgs()
            .WithBucket(bucket)
            .WithObject(key), ct);
    }
}
