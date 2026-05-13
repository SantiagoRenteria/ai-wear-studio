using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AiWearStudio.DesignEngine.Infrastructure.Persistence;

public class DesignEngineDbContextFactory : IDesignTimeDbContextFactory<DesignEngineDbContext>
{
    public DesignEngineDbContext CreateDbContext(string[] args)
    {
        var opts = new DbContextOptionsBuilder<DesignEngineDbContext>()
            .UseNpgsql("Host=localhost;Database=design_engine_dev;Username=postgres;Password=postgres")
            .Options;
        return new DesignEngineDbContext(opts);
    }
}
