using AiWearStudio.SharedKernel.Common;

namespace AiWearStudio.Api.Filters;

public class TenantContextCaptureValidationFilter(IServiceCollection services) : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        ValidateNoSingletonCapturesTenantContext();
        return next;
    }

    private void ValidateNoSingletonCapturesTenantContext()
    {
        var violators = services
            .Where(sd => sd.Lifetime == ServiceLifetime.Singleton)
            .Where(sd => sd.ImplementationType is not null)
            .Where(sd => HasDirectTenantContextDependency(sd.ImplementationType!))
            .Select(sd => sd.ImplementationType!.FullName)
            .ToList();

        if (violators.Count > 0)
            throw new InvalidOperationException(
                $"Captive dependency detected: the following Singletons inject ITenantContext directly, " +
                $"which causes tenant isolation to break under concurrent requests: {string.Join(", ", violators)}. " +
                $"Use IHttpContextAccessor or a factory pattern instead.");
    }

    private static bool HasDirectTenantContextDependency(Type type)
    {
        return type.GetConstructors()
            .SelectMany(c => c.GetParameters())
            .Any(p => p.ParameterType == typeof(ITenantContext));
    }
}
