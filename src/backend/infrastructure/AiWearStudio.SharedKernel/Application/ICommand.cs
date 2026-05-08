using MediatR;
namespace AiWearStudio.SharedKernel.Application;

public interface ICommand<TResponse> : IRequest<TResponse> { }
public interface ICommand : IRequest { }
