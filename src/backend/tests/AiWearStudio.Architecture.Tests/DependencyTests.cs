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
}
