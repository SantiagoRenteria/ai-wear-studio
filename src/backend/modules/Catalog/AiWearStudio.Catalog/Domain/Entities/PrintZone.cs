namespace AiWearStudio.Catalog.Domain.Entities;

public class PrintZone
{
    public Guid Id { get; private set; }
    public Guid GarmentViewId { get; private set; }
    public string Name { get; private set; } = default!;
    public decimal XCm { get; private set; }
    public decimal YCm { get; private set; }
    public decimal WidthCm { get; private set; }
    public decimal HeightCm { get; private set; }
    public Guid RecommendedTechniqueId { get; private set; }

    public PrintTechnique? RecommendedTechnique { get; private set; }

    private PrintZone() { }

    public static PrintZone Create(Guid id, Guid garmentViewId, string name,
        decimal xCm, decimal yCm, decimal widthCm, decimal heightCm, Guid recommendedTechniqueId) =>
        new()
        {
            Id = id, GarmentViewId = garmentViewId, Name = name,
            XCm = xCm, YCm = yCm, WidthCm = widthCm, HeightCm = heightCm,
            RecommendedTechniqueId = recommendedTechniqueId
        };
}
