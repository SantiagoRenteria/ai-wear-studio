using MediatR;
using AiWearStudio.SharedKernel.Application;

namespace AiWearStudio.Api.Behaviors;

public class IdempotencyBehavior<TRequest, TResponse>(ILogger<IdempotencyBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ICommand<TResponse>
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        // Fase 1: pass-through. La lógica Redis de idempotencia se implementa en Story 1.3+ cuando el endpoint /orders/confirm lo requiere.
        logger.LogDebug("IdempotencyBehavior: {RequestType}", typeof(TRequest).Name);
        return await next();
    }
}
