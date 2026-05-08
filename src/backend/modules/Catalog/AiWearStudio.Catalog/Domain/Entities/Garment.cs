namespace AiWearStudio.Catalog.Domain.Entities;

public class Garment
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = default!;
    public string Category { get; private set; } = default!;
    public int DisplayOrder { get; private set; }

    public IReadOnlyCollection<GarmentColorVariant> ColorVariants => _colorVariants;
    private readonly List<GarmentColorVariant> _colorVariants = [];

    public IReadOnlyCollection<GarmentView> Views => _views;
    private readonly List<GarmentView> _views = [];

    private Garment() { }

    public static Garment Create(Guid id, string name, string category, int displayOrder) =>
        new() { Id = id, Name = name, Category = category, DisplayOrder = displayOrder };
}
