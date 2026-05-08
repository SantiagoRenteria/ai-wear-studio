namespace AiWearStudio.Catalog.Application.Queries.GetGarmentZones;

public record PrintZoneDto(
    Guid Id,
    string Name,
    decimal XCm,
    decimal YCm,
    decimal WidthCm,
    decimal HeightCm,
    string? RecommendedTechnique);
