using AiWearStudio.CompanyAdmin.Domain.Enums;

namespace AiWearStudio.CompanyAdmin.Domain.Constants;

public static class FeatureFlags
{
    public const string AiGeneration = "ai_generation";
    public const string BulkExport = "bulk_export";
    public const string WhiteLabel = "white_label";

    public static readonly IReadOnlySet<string> All =
        new HashSet<string> { AiGeneration, BulkExport, WhiteLabel };

    public static IEnumerable<(string key, bool enabled)> DefaultsForPlan(Plan plan) =>
        plan switch
        {
            Plan.Demo => [
                (AiGeneration, true),
                (BulkExport, false),
                (WhiteLabel, false)
            ],
            Plan.SaaS => [
                (AiGeneration, true),
                (BulkExport, true),
                (WhiteLabel, false)
            ],
            Plan.LicenciaPermanente => [
                (AiGeneration, true),
                (BulkExport, true),
                (WhiteLabel, true)
            ],
            _ => []
        };
}
