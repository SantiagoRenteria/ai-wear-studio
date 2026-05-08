using MediatR;
namespace AiWearStudio.SharedKernel.Application;

public interface IQuery<TResponse> : IRequest<TResponse> { }
