using AiWearStudio.SharedKernel.Common;
using NetArchTest.Rules;
using Xunit;

namespace AiWearStudio.Architecture.Tests;

public class DependencyTests
{
    private const string SharedKernelNamespace = "AiWearStudio.SharedKernel";
    private const string UsersCorNamespace = "AiWearStudio.Users.Core";
    private const string DesignEngineCoreNamespace = "AiWearStudio.DesignEngine.Core";
    private const string OrdersCoreNamespace = "AiWearStudio.Orders.Core";

    [Fact]
    public void SharedKernel_ShouldNotDependOnAnyBoundedContext()
    {
        var result = Types.InAssembly(typeof(AiWearStudio.SharedKernel.Domain.Entity).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "AiWearStudio.Users",
                "AiWearStudio.DesignEngine",
                "AiWearStudio.Orders",
                "AiWearStudio.Catalog",
                "AiWearStudio.CompanyAdmin",
                "AiWearStudio.ProductionQueue",
                "AiWearStudio.Notifications")
            .GetResult();

        Assert.True(result.IsSuccessful, $"SharedKernel has forbidden dependencies: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }

    [Fact]
    public void UsersCore_ShouldOnlyDependOnSharedKernel()
    {
        var result = Types.InAssembly(typeof(AiWearStudio.Users.Core.AssemblyMarker).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(
                "AiWearStudio.Users.Infrastructure",
                "AiWearStudio.DesignEngine",
                "AiWearStudio.Orders",
                "AiWearStudio.Catalog",
                "AiWearStudio.CompanyAdmin",
                "AiWearStudio.ProductionQueue",
                "AiWearStudio.Notifications",
                "AiWearStudio.Api")
            .GetResult();

        Assert.True(result.IsSuccessful, $"Users.Core has forbidden dependencies: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }

    [Fact]
    public void NoBoundedContextCore_ShouldDependOnAnotherBoundedContextCore()
    {
        var usersResult = Types.InAssembly(typeof(AiWearStudio.Users.Core.AssemblyMarker).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(DesignEngineCoreNamespace, OrdersCoreNamespace)
            .GetResult();

        Assert.True(usersResult.IsSuccessful,
            $"BC.Core cross-reference detected: {string.Join(", ", usersResult.FailingTypeNames ?? [])}");
    }

    [Fact(DisplayName = "ARCH-05: IRateLimitPolicy interface reside en SharedKernel")]
    public void IRateLimitPolicy_Interface_ResideInSharedKernel()
    {
        var sharedKernelAssembly = typeof(AiWearStudio.SharedKernel.Domain.Entity).Assembly;
        var rateLimitType = sharedKernelAssembly.GetType("AiWearStudio.SharedKernel.Common.IRateLimitPolicy");

        Assert.NotNull(rateLimitType);
        Assert.True(rateLimitType.IsInterface, "IRateLimitPolicy debe ser una interface");
    }

    [Fact(DisplayName = "ARCH-15: Ninguna implementación de IRateLimitPolicy reside en SharedKernel")]
    public void IRateLimitPolicy_Implementations_NotInSharedKernel()
    {
        var sharedKernelAssembly = typeof(AiWearStudio.SharedKernel.Domain.Entity).Assembly;
        var rateLimitInterface = typeof(IRateLimitPolicy);

        var implementations = sharedKernelAssembly.GetTypes()
            .Where(t => t.IsClass && !t.IsAbstract && rateLimitInterface.IsAssignableFrom(t))
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(implementations);
    }

    [Fact(DisplayName = "ARCH-15b: DesignEngine.Core no depende de DesignEngine.Infrastructure")]
    public void DesignEngineCore_ShouldNotDependOnInfrastructure()
    {
        var result = Types.InAssembly(typeof(AiWearStudio.DesignEngine.Core.AssemblyMarker).Assembly)
            .ShouldNot()
            .HaveDependencyOn("AiWearStudio.DesignEngine.Infrastructure")
            .GetResult();

        Assert.True(result.IsSuccessful,
            $"DesignEngine.Core depends on Infrastructure: {string.Join(", ", result.FailingTypeNames ?? [])}");
    }
}
