using AiWearStudio.CompanyAdmin.Domain.Enums;
using AiWearStudio.CompanyAdmin.Domain.Repositories;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace AiWearStudio.Api.Middleware;

public class CompanySuspensionMiddleware(RequestDelegate next, IServiceScopeFactory scopeFactory)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            await next(context);
            return;
        }

        var tenantIdClaim = context.User.FindFirst("tenant_id")?.Value;

        if (Guid.TryParse(tenantIdClaim, out var tenantId))
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var companyRepo = scope.ServiceProvider.GetRequiredService<ICompanyRepository>();

            var company = await companyRepo.FindByIdAsync(tenantId, context.RequestAborted);
            if (company?.PlanStatus == PlanStatus.Suspended)
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/problem+json";
                var problem = new ProblemDetails
                {
                    Status = 403,
                    Title = "Compañía suspendida",
                    Detail = "El acceso a esta compañía ha sido suspendido. Contacta al soporte."
                };
                await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
                return;
            }
        }

        await next(context);
    }
}
