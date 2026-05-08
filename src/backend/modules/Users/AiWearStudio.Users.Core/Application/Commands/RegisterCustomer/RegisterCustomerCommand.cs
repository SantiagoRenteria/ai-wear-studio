using AiWearStudio.SharedKernel.Application;
using AiWearStudio.Users.Core.Application.DTOs;

namespace AiWearStudio.Users.Core.Application.Commands.RegisterCustomer;

public record RegisterCustomerCommand(string Email, string Password) : ICommand<AuthResponse>;
