namespace AiWearStudio.Catalog.Application.Queries.GetAdminCatalog;

public record AdminGarmentDto(
    Guid Id,
    string Name,
    string Category,
    bool IsActive,
    IReadOnlyList<AdminColorDto> Colors);

public record AdminColorDto(Guid Id, string ColorName, string HexCode, bool IsActive);
