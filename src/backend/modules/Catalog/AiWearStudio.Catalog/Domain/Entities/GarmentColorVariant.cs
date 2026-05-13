namespace AiWearStudio.Catalog.Domain.Entities;

public class GarmentColorVariant
{
    public Guid Id { get; private set; }
    public Guid GarmentId { get; private set; }
    public string ColorName { get; private set; } = default!;
    public string HexCode { get; private set; } = default!;
    public int DisplayOrder { get; private set; }

    private GarmentColorVariant() { }

    public static GarmentColorVariant Create(Guid id, Guid garmentId, string colorName, string hexCode, int displayOrder) =>
        new() { Id = id, GarmentId = garmentId, ColorName = colorName, HexCode = hexCode, DisplayOrder = displayOrder };
}
