namespace AiWearStudio.Catalog.Domain.Entities;

public class PrintTechnique
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = default!;
    public string Description { get; private set; } = default!;

    private PrintTechnique() { }

    public static PrintTechnique Create(Guid id, string name, string description) =>
        new() { Id = id, Name = name, Description = description };
}
