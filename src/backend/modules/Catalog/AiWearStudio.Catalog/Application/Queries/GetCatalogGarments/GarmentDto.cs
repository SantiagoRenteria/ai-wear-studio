namespace AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;

public record GarmentDto(
    Guid Id,
    string Name,
    string Category,
    IReadOnlyList<ColorVariantDto> Colors,
    IReadOnlyList<GarmentViewDto> Views);

public record ColorVariantDto(Guid Id, string ColorName, string HexCode);

public record GarmentViewDto(Guid Id, string ViewName);
