namespace AiWearStudio.SharedKernel.Domain;

public abstract class ValueObject
{
    protected abstract IEnumerable<object> GetEqualityComponents();
    public override bool Equals(object? obj) =>
        obj is ValueObject vo && GetEqualityComponents().SequenceEqual(vo.GetEqualityComponents());
    public override int GetHashCode() =>
        GetEqualityComponents().Aggregate(0, HashCode.Combine);
    public static bool operator ==(ValueObject? left, ValueObject? right) =>
        left?.Equals(right) ?? right is null;
    public static bool operator !=(ValueObject? left, ValueObject? right) => !(left == right);
}
