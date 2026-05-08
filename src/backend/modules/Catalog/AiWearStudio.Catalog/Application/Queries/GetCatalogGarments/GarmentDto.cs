namespace AiWearStudio.Catalog.Application.Queries.GetCatalogGarments;

public record GarmentDto(
    Guid Id,
    string Name,
    string Category,
    IReadOnlyList<ColorVariantDto> Colors);

public record ColorVariantDto(Guid Id, string ColorName, string HexCode);
