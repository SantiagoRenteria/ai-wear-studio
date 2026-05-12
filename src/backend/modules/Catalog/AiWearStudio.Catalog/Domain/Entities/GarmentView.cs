namespace AiWearStudio.Catalog.Domain.Entities;

public class GarmentView
{
    public Guid Id { get; private set; }
    public Guid GarmentId { get; private set; }
    public string ViewName { get; private set; } = default!;
    public int DisplayOrder { get; private set; }

    public IReadOnlyCollection<PrintZone> PrintZones => _printZones;
    private readonly List<PrintZone> _printZones = [];

    private GarmentView() { }

    public static GarmentView Create(Guid id, Guid garmentId, string viewName, int displayOrder) =>
        new() { Id = id, GarmentId = garmentId, ViewName = viewName, DisplayOrder = displayOrder };
}
