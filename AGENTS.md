# AGENTS.md

## Purpose

This document defines coding guidance, architectural guidance, and expectations for all AI coding agents working on C# and ASP.NET Core projects.

When multiple valid approaches exist, choose the simplest solution that preserves readability and maintainability.

---

## Table of Contents

### Part I: C# Language & Coding Guidelines

- [Core Principles](#core-principles)
- [C# Coding Guidelines](#c-coding-guidelines)
  - [Naming](#naming)
  - [Language Features](#language-features)
  - [Async](#async)
  - [Locking](#locking)
  - [Multi-Threading](#multi-threading)
  - [Exceptions](#exceptions)
  - [LINQ](#linq)
  - [PLINQ](#plinq)
  - [Boxing and Unboxing](#boxing-and-unboxing)
- [Value Objects](#value-objects)
- [Nullable Reference Types](#nullable-reference-types)
- [Generic Variance](#generic-variance)
- [High-Performance Memory Patterns](#high-performance-memory-patterns)
  - [Object Pooling](#object-pooling)
- [Modern C# Disposal Patterns](#modern-c-disposal-patterns)
- [TimeProvider Abstraction](#timeprovider-abstraction)
- [Documentation Standards](#documentation-standards)
- [Constants](#constants)
- [Complexity Metrics](#complexity-metrics)
  - [Cyclomatic Complexity](#cyclomatic-complexity)
  - [Cognitive Complexity](#cognitive-complexity)

## Part II: Architecture & ASP.NET Core

- [Architecture](#architecture)
  - [General](#general)
  - [Messaging Infrastructure](#messaging-infrastructure)
- [Central Package Management](#central-package-management)
- [Service Naming Conventions](#service-naming-conventions)
- [Event-Driven Architecture](#event-driven-architecture)
- [Service-Oriented Architecture](#service-oriented-architecture)
- [Domain-Driven Design](#domain-driven-design)
- [Resilience and Reliability](#resilience-and-reliability)
- [ASP.NET Core](#aspnet-core)
  - [API Style](#api-style)
  - [Endpoint Design](#endpoint-design)
  - [API Versioning](#api-versioning)
  - [Dependency Injection](#dependency-injection)
    - [Service Lifetimes](#service-lifetimes)
  - [Configuration](#configuration)
    - [Options Pattern](#options-pattern)
  - [Logging](#logging)
  - [Health Checks](#health-checks)
  - [Background Jobs](#background-jobs)
  - [Middleware & Filters](#middleware--filters)
  - [Problem Details](#problem-details)
  - [Worker Services](#worker-services)
  - [System.Threading.Channels](#systemthreadingchannels)
  - [Caching](#caching)
    - [Output Caching & Response Caching](#output-caching--response-caching)
  - [Rate Limiting](#rate-limiting)
  - [OpenAPI](#openapi)
  - [Feature Flags](#feature-flags)
  - [CQRS](#cqrs)
  - [Authentication & Authorization](#authentication--authorization)
  - [HttpClient & IHttpClientFactory](#httpclient--ihttpclientfactory)
  - [Distributed Tracing](#distributed-tracing)
  - [Metrics & OpenTelemetry](#metrics--opentelemetry)
  - [Persistence Guidelines](#persistence-guidelines)
    - [DTO Projections via Select()](#dto-projections-via-select)
    - [AsNoTracking() for Read-Only Queries](#asnotracking-for-read-only-queries)
    - [Avoiding N+1 Queries](#avoiding-n1-queries)
    - [Migrations Strategy](#migrations-strategy)
    - [IEntityTypeConfiguration over OnModelCreating](#ientitytypeconfiguration-over-onmodelcreating)
    - [Owned Entities, Complex Types, and Value Objects](#owned-entities-complex-types-and-value-objects)
    - [Avoid Loading Large Graphs Unnecessarily](#avoid-loading-large-graphs-unnecessarily)
  - [Testing Standards](#testing-standards)
    - [Unit Testing](#unit-testing)
    - [Integration Testing](#integration-testing)
    - [Architecture Testing](#architecture-testing)
  - [Security Standards](#security-standards)
  - [Preferred Framework Patterns](#preferred-framework-patterns)
  - [Domain Behaviour Pattern](#domain-behaviour-pattern)
- [System.Text.Json](#systemtextjson)
- [gRPC](#grpc)
- [SignalR](#signalr)
- [Server-Sent Events](#server-sent-events)

## Part III: SonarQube C# Rules

- [SonarQube Overview](#sonarqube-overview)
- [Bugs](#bugs)
- [Vulnerabilities](#vulnerabilities)
- [Code Smells](#code-smells)
- [Security Hotspots](#security-hotspots)

## Part IV: AI Agent Instructions

- [AI Agent Instructions](#ai-agent-instructions)

---

## Core Principles

1. Prefer simplicity over cleverness (KISS)
2. Follow SOLID principles.
3. Avoid duplication (DRY).
4. Avoid unnecessary abstractions (YAGNI).
5. Favour readability over brevity.
6. Keep classes cohesive.
7. Keep methods focused.
8. Prefer explicit code over framework magic.

---

## C# Coding Guidelines

## Naming

### Types

Use PascalCase.

```csharp
public class UserService
{
}
```

### Methods

Use PascalCase and verb-based names.

```csharp
CreateUser()
ValidateToken()
CalculateTotal()
```

### Properties

Use PascalCase.

Boolean properties should be predicates.

```csharp
IsActive
HasPermission
CanDelete
```

### Fields

Use _camelCase for private fields.

```csharp
private readonly ILogger<UserService> _logger;
```

### Parameters and Locals

Use camelCase.

---

### Interfaces

Prefix with I.

```csharp
IUserRepository
IEmailSender
```

### When to Add an Interface

Introduce an interface when there is a demonstrated need for abstraction — not by default for every class.

**Introduce an interface when:**

- There are multiple implementations (e.g., `SmtpEmailSender` and `SendGridEmailSender`).
- The type is part of a public API contract that consumers should depend on.
- Testing requires substituting the dependency (e.g., mocking `IOrderRepository`).
- The abstraction crosses a significant boundary (persistence, external services, infrastructure).

**Do not introduce an interface when:**

- There is only one implementation and no expectation of alternates.
- The type is an internal detail that will never be substituted.
- The abstraction adds indirection without value (YAGNI).

**Noncompliant:**

```csharp
// Single implementation, no alternates planned
public interface IOrderService { }
public sealed class OrderService : IOrderService { }
```

**Compliant:**

```csharp
// Multiple implementations expected
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct);
}

public sealed class SmtpEmailSender : IEmailSender { }
public sealed class SendGridEmailSender : IEmailSender { }
```

---

## Language Features

### Namespaces

Use file-scoped namespaces.

```csharp
namespace MyApplication.Domain;
```

### var

Use var when the type is obvious.

```csharp
var user = new User();
```

Prefer explicit types for primitives.

```csharp
int count = 10;
bool enabled = true;
```

### Records

Prefer records for DTOs and immutable data.

```csharp
public sealed record CreateUserRequest(
    string Email,
    string Password);
```

### Required Members

Use required properties where appropriate to enforce initialization at construction time.

```csharp
public sealed class CreateUserCommand
{
    public required string Email { get; init; }
    public required string Password { get; init; }
}
```

### Primary Constructors

Use when they improve readability by reducing boilerplate for simple classes with few dependencies.

```csharp
public sealed class UserService(ILogger<UserService> logger, IUserRepository repository)
{
    public async Task<User> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching user {UserId}", id);
        return await repository.GetByIdAsync(id, ct);
    }
}
```

Avoid excessive constructor parameter lists. When a class has more than four or five dependencies, consider refactoring into smaller, more focused classes.

### Collection Expressions

Prefer modern collection syntax.

```csharp
List<string> names = [];
```

### Pattern Matching

Prefer modern pattern matching.

```csharp
if (user is null)
{
}
```

### AsyncLocal

Use `AsyncLocal<T>` for state that must flow across async boundaries. Unlike `ThreadStatic`, values follow the async execution context even when continuations resume on different threads.

**Noncompliant:**

```csharp
[ThreadStatic]
private static int _counter;

public async Task ProcessAsync()
{
    _counter++;
    await Task.Delay(100);
    Console.WriteLine(_counter); // May be wrong thread
}
```

**Compliant:**

```csharp
private static readonly AsyncLocal<int> _counter = new();

public async Task ProcessAsync()
{
    _counter.Value++;
    await Task.Delay(100);
    Console.WriteLine(_counter.Value);
}
```

---

## Async

Use asynchronous APIs for all I/O operations. Asynchronous code scales better and avoids blocking threads.

### Avoid Blocking

Never block on asynchronous code. These patterns cause deadlocks in many contexts and defeat the purpose of `async`/`await`.

**Noncompliant:**

```csharp
public User GetUser(Guid id)
{
    // Deadlock risk in ASP.NET Core
    return _repository.GetByIdAsync(id).Result;
}
```

**Compliant:**

```csharp
public async Task<User> GetUserAsync(Guid id)
{
    return await _repository.GetByIdAsync(id);
}
```

### Propagate Async Throughout the Call Stack

Async calls should propagate all the way up the call stack.

**Noncompliant:**

```csharp
public User GetUser(Guid id)
{
    return GetUserAsync(id).GetAwaiter().GetResult();
}

private async Task<User> GetUserAsync(Guid id)
{
    return await _repository.GetByIdAsync(id);
}
```

**Compliant:**

```csharp
public async Task<User> GetUserAsync(Guid id)
{
    return await _repository.GetByIdAsync(id);
}
```

### Prefer `await` over synchronous equivalents

**Noncompliant:**

```csharp
public void ProcessFile(string path)
{
    var text = File.ReadAllText(path);
    Console.WriteLine(text);
}
```

**Compliant:**

```csharp
public async Task ProcessFileAsync(string path)
{
    var text = await File.ReadAllTextAsync(path);
    Console.WriteLine(text);
}
```

### Always pass `CancellationToken`

Thread cancellation is a cooperative mechanism. Propagate cancellation tokens to allow graceful shutdown and timeout handling.

**Noncompliant:**

```csharp
public async Task<List<Order>> GetOrdersAsync()
{
    return await _context.Orders.ToListAsync();
}
```

**Compliant:**

```csharp
public async Task<List<Order>> GetOrdersAsync(CancellationToken ct = default)
{
    return await _context.Orders.ToListAsync(ct);
}
```

### Avoid `async void`

`async void` methods cannot be awaited and exceptions thrown inside them crash the process. Use `async Task` instead, except for top-level event handlers.

**Noncompliant:**

```csharp
public async void ProcessOrder(Guid orderId)
{
    await _orderService.ProcessAsync(orderId);
}
```

**Compliant:**

```csharp
public async Task ProcessOrderAsync(Guid orderId)
{
    await _orderService.ProcessAsync(orderId);
}
```

### Return `Task` directly when no post-processing is needed

When a method does nothing after an awaited call, return the `Task` directly to avoid creating an unnecessary state machine.

**Noncompliant:**

```csharp
public async Task SaveAsync(Order order)
{
    await _repository.SaveAsync(order);
}
```

**Compliant:**

```csharp
public Task SaveAsync(Order order)
{
    return _repository.SaveAsync(order);
}
```

### Do not use `Task.Run` for I/O-bound work

`Task.Run` is for CPU-bound work. For I/O, use native async APIs directly.

**Noncompliant:**

```csharp
public Task<string> ReadFileAsync(string path)
{
    return Task.Run(() => File.ReadAllText(path));
}
```

**Compliant:**

```csharp
public Task<string> ReadFileAsync(string path)
{
    return File.ReadAllTextAsync(path);
}
```

#### Summary of anti-patterns to avoid

- `.Result` — blocks thread, deadlock risk
- `.Wait()` — blocks thread, deadlock risk
- `.GetAwaiter().GetResult()` — blocks thread, deadlock risk
- `async void` — unhandled exceptions crash the process
- `Task.Run(() => syncIO())` — wastes thread pool threads

---

## Locking

### Synchronous Locking

Use `lock` for simple thread synchronization in synchronous code. Prefer a dedicated private object to avoid deadlocks from external locking.

On .NET 9 and later, prefer the `System.Threading.Lock` type over `object`.

**Legacy (`object`):**

```csharp
public sealed class Counter
{
    private readonly object _syncRoot = new();
    private int _value;

    public int Increment()
    {
        lock (_syncRoot)
        {
            return ++_value;
        }
    }
}
```

**Preferred (.NET 9+):**

```csharp
public sealed class Counter
{
    private readonly Lock _lockObject = new();
    private int _value;

    public int Increment()
    {
        lock (_lockObject)
        {
            return ++_value;
        }
    }
}
```

### Asynchronous Locking

Do not use `lock` inside `async` methods because the body may yield and resume on a different thread. Use `SemaphoreSlim` instead.

**Noncompliant:**

```csharp
public sealed class AsyncCounter
{
    private readonly object _syncRoot = new();
    private int _value;

    public async Task<int> IncrementAsync()
    {
        lock (_syncRoot) // Compiler error in async method
        {
            await Task.Delay(10); // Cannot await inside lock
            return ++_value;
        }
    }
}
```

**Compliant:**

```csharp
public sealed class AsyncCounter : IAsyncDisposable
{
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private int _value;

    public async Task<int> IncrementAsync()
    {
        await _semaphore.WaitAsync();
        try
        {
            await Task.Delay(10);
            return ++_value;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        _semaphore.Dispose();
    }
}
```

Guidelines:

- Use `lock` for synchronous code only.
- Use `SemaphoreSlim` with `WaitAsync` for async code.
- Always release the semaphore in a `finally` block.
- Dispose `SemaphoreSlim` when the owning object is disposed.
- Consider `AsyncLock` abstractions only when they simplify complex coordination; otherwise prefer explicit `SemaphoreSlim`.

---

## Multi-Threading

### Thread Pool

Avoid creating threads manually. The thread pool manages thread lifecycle and avoids the overhead of thread creation and destruction.

**Noncompliant:**

```csharp
public void Process()
{
    var thread = new Thread(() => DoWork());
    thread.Start();
}
```

**Compliant:**

```csharp
public Task ProcessAsync()
{
    return Task.Run(() => DoWork());
}
```

### Concurrent Collections

Prefer `System.Collections.Concurrent` for shared mutable state rather than manually synchronizing access to standard collections.

```csharp
public sealed class MessageQueue
{
    private readonly ConcurrentQueue<string> _queue = new();

    public void Enqueue(string message)
    {
        _queue.Enqueue(message);
    }

    public bool TryDequeue(out string? message)
    {
        return _queue.TryDequeue(out message);
    }
}
```

### Interlocked

Use `Interlocked` for simple atomic operations on shared variables rather than `lock`.

```csharp
public sealed class Counter
{
    private int _value;

    public int Increment()
    {
        return Interlocked.Increment(ref _value);
    }
}
```

### `volatile` is not atomic

`volatile` only guarantees visibility, not atomicity. Do not use it for compound operations.

**Noncompliant:**

```csharp
private volatile int _counter;

public void Increment()
{
    _counter++; // Not atomic
}
```

**Compliant:**

```csharp
private int _counter;

public void Increment()
{
    Interlocked.Increment(ref _counter);
}
```

---

## Exceptions

Exceptions are for exceptional situations only.

Do not use exceptions for normal control flow.

**Noncompliant:**

```csharp
public void ProcessOrder(Guid orderId)
{
    try
    {
        var order = _repository.Get(orderId);
        order.Process();
    }
    catch (OrderNotFoundException)
    {
        // Using exception for expected case
        return;
    }
}
```

**Compliant:**

```csharp
public void ProcessOrder(Guid orderId)
{
    var order = _repository.Get(orderId);
    if (order is null)
    {
        // Handle expected case explicitly
        return;
    }

    order.Process();
}
```

Prefer explicit result types for expected failures:

```csharp
public sealed record Result<T>
{
    public T? Value { get; init; }
    public string? Error { get; init; }
    public bool IsSuccess => Error is null;

    public static Result<T> Success(T value) => new() { Value = value };
    public static Result<T> Failure(string error) => new() { Error = error };
}
```

### Use `ArgumentNullException.ThrowIfNull` for guard clauses

Prefer built-in guard methods over manual null checks and custom exceptions.

**Noncompliant:**

```csharp
public void ProcessOrder(Order order)
{
    if (order is null)
    {
        throw new ArgumentNullException(nameof(order));
    }
}
```

**Compliant:**

```csharp
public void ProcessOrder(Order order)
{
    ArgumentNullException.ThrowIfNull(order);
}
```

### Do not catch generic exceptions unless re-throwing

Catching `Exception` hides bugs and makes debugging difficult.

**Noncompliant:**

```csharp
public void Process()
{
    try
    {
        DoWork();
    }
    catch (Exception)
    {
        // Swallows all exceptions silently
    }
}
```

**Compliant:**

```csharp
public void Process()
{
    try
    {
        DoWork();
    }
    catch (InvalidOperationException ex)
    {
        _logger.LogError(ex, "Processing failed");
        throw;
    }
}
```

### Preserve stack traces when re-throwing

Use `throw;` not `throw ex;` to preserve the original stack trace.

**Noncompliant:**

```csharp
try
{
    DoWork();
}
catch (Exception ex)
{
    throw ex; // Loses original stack trace
}
```

**Compliant:**

```csharp
try
{
    DoWork();
}
catch (Exception)
{
    throw; // Preserves original stack trace
}
```

### Use `ExceptionDispatchInfo` for async exception propagation

When capturing and re-throwing exceptions across async boundaries, preserve the original stack trace and Watson bucket information.

```csharp
public async Task ProcessAsync()
{
    ExceptionDispatchInfo? captured = null;
    try
    {
        await DoWorkAsync();
    }
    catch (Exception ex)
    {
        captured = ExceptionDispatchInfo.Capture(ex);
    }

    // Later...
    captured?.Throw();
}
```

---

## LINQ

Use LINQ when it improves readability over imperative loops.

```csharp
var activeUsers = users
    .Where(u => u.IsActive)
    .OrderBy(u => u.LastName)
    .Select(u => new UserDto(u.Id, u.Email))
    .ToList();
```

Avoid overly complex query chains. When queries become difficult to read, break them into smaller named steps.

**Noncompliant:**

```csharp
var result = orders
    .Where(o => o.Status == OrderStatus.Completed)
    .SelectMany(o => o.Items)
    .Where(i => i.Price > 100)
    .GroupBy(i => i.Category)
    .Select(g => new { Category = g.Key, Total = g.Sum(i => i.Price), Count = g.Count() })
    .Where(x => x.Total > 1000)
    .OrderByDescending(x => x.Total)
    .Take(10)
    .ToList();
```

**Compliant:**

```csharp
var expensiveItems = orders
    .Where(o => o.Status == OrderStatus.Completed)
    .SelectMany(o => o.Items)
    .Where(i => i.Price > 100);

var categorySummaries = expensiveItems
    .GroupBy(i => i.Category)
    .Select(g => new CategorySummary(g.Key, g.Sum(i => i.Price), g.Count()));

var topCategories = categorySummaries
    .Where(x => x.Total > 1000)
    .OrderByDescending(x => x.Total)
    .Take(10)
    .ToList();
```

## PLINQ

Use PLINQ when processing large, CPU-bound datasets in-memory. Parallel LINQ splits work across multiple cores, but it introduces overhead from partitioning and thread coordination. Use it only when the operation is compute-intensive and the source collection is large enough to offset that overhead.

**Compliant:**

```csharp
var highValueOrders = orders
    .AsParallel()
    .WithCancellation(ct)
    .Where(o => o.CalculateComplexMetrics() > Threshold)
    .Select(o => new OrderSummary(o.Id, o.Total))
    .ToList();
```

Guidelines:

- Do not use PLINQ for I/O-bound or short collections; the overhead exceeds the benefit.
- Always use `.AsOrdered()` when the consumer requires order preservation.
- Prefer `.WithDegreeOfParallelism(Environment.ProcessorCount)` when you need explicit control.
- Do not mutate shared state inside PLINQ lambdas; use thread-safe accumulators or return projections.
- Use `.WithCancellation()` to allow cooperative cancellation.

**Noncompliant:**

```csharp
var total = 0;
orders.AsParallel().ForEach(o => total += o.Total); // Race condition
```

**Compliant:**

```csharp
var total = orders.AsParallel().Sum(o => o.Total);
```

---

## Boxing and Unboxing

Boxing is the process of converting a value type to a reference type (`object` or an interface). Unboxing is the reverse. These operations allocate on the heap and copy data, which impacts performance and increases GC pressure. Avoid implicit and explicit boxing in hot paths.

**Noncompliant:**

```csharp
public void Process(int value)
{
    object boxed = value; // Implicit boxing
    int unboxed = (int)boxed; // Unboxing
}
```

**Compliant:**

```csharp
public void Process(int value)
{
    // Operate on value type directly; no boxing
    int doubled = value * 2;
}
```

### Avoid Boxing in Collections

Using value types with `ArrayList` or non-generic `IList` forces boxing.

**Noncompliant:**

```csharp
var list = new ArrayList();
list.Add(42); // Boxing
```

**Compliant:**

```csharp
var list = new List<int>();
list.Add(42); // No boxing
```

### Avoid Boxing with Interpolated Strings and `ToString()`

Value types implement `IFormattable` and `IConvertible`, which can cause boxing when passed to `object` parameters in logging or string formatting.

**Noncompliant:**

```csharp
_logger.LogInformation("Value: {Value}", 42); // Boxing to object
```

**Compliant:**

```csharp
_logger.LogInformation("Value: {Value}", 42.ToString()); // No boxing
```

### Generic Constraints to Prevent Boxing

Use generic methods with `where T : struct` or interfaces to avoid boxing value types.

**Compliant:**

```csharp
public T Max<T>(T a, T b) where T : IComparable<T>
{
    return a.CompareTo(b) > 0 ? a : b; // No boxing for value types
}
```

Guidelines:

- Prefer generic collections (`List<T>`, `Dictionary<TKey, TValue>`) over non-generic ones.
- Use strongly typed overloads when available (e.g., `Console.WriteLine(int)` instead of `Console.WriteLine(object)`).
- Be aware that boxing can occur when casting structs to interfaces.
- Avoid passing value types to methods that accept `object` or `IEnumerable` in performance-critical code.
- Use `Span<T>`, `ReadOnlySpan<T>`, and `Memory<T>` for high-performance buffer manipulation without boxing.

---

## Complexity Metrics

### Cyclomatic Complexity

Cyclomatic complexity measures the number of independent paths through a method. A higher value indicates more decision points and a greater risk of defects. Keep methods simple by extracting nested conditionals and loops into smaller, focused methods.

**Noncompliant:**

```csharp
public decimal CalculateDiscount(Order order)
{
    if (order is null)
    {
        return 0;
    }

    if (!order.IsVerified)
    {
        return 0;
    }

    if (order.Total < 100)
    {
        return 0;
    }

    if (order.CustomerType == CustomerType.VIP)
    {
        if (order.Total > 1000)
        {
            return order.Total * 0.20m;
        }
        return order.Total * 0.10m;
    }
    else if (order.CustomerType == CustomerType.Loyal)
    {
        return order.Total * 0.05m;
    }
    else
    {
        return 0;
    }
}
```

**Compliant:**

```csharp
public decimal CalculateDiscount(Order order)
{
    if (!IsEligibleForDiscount(order))
    {
        return 0;
    }

    return order.CustomerType switch
    {
        CustomerType.VIP => CalculateVipDiscount(order.Total),
        CustomerType.Loyal => order.Total * 0.05m,
        _ => 0
    };
}

private static bool IsEligibleForDiscount(Order? order)
{
    return order is not null
        && order.IsVerified
        && order.Total >= 100;
}

private static decimal CalculateVipDiscount(decimal total)
{
    return total > 1000
        ? total * 0.20m
        : total * 0.10m;
}
```

Guidelines:

- Keep cyclomatic complexity low (default threshold 10) by reducing nested `if` statements and loops.
- Extract validation logic into private helper methods.
- Prefer `switch` expressions over deep `if/else` chains.
- Return early to reduce nesting depth.

### Cognitive Complexity

Cognitive complexity measures how difficult code is to understand, penalizing nested structures more than sequential ones. Methods with high cognitive complexity (default threshold 15) are harder to maintain and test. Refactor by flattening nesting and extracting logical steps into named methods.

**Noncompliant:**

```csharp
public void Process(Order order)
{
    if (order is not null)
    {
        if (order.Items is not null)
        {
            foreach (var item in order.Items)
            {
                if (item.Quantity > 0)
                {
                    if (item.Price > 0)
                    {
                        // ... deeply nested logic
                    }
                }
            }
        }
    }
}
```

**Compliant:**

```csharp
public void Process(Order order)
{
    if (order is null || order.Items is null)
    {
        return;
    }

    foreach (var item in order.Items)
    {
        ProcessItem(item);
    }
}

private void ProcessItem(Item item)
{
    if (item.Quantity <= 0 || item.Price <= 0)
    {
        return;
    }

    // ...
}
```

Guidelines:

- Use guard clauses and early returns to flatten nesting.
- Extract nested loops and conditionals into well-named helper methods.
- Avoid mixing multiple levels of abstraction in a single method.
- Keep cognitive complexity low (default threshold 15).

---

## Documentation Standards

### XML Documentation

Use XML documentation comments exclusively for public APIs and important domain behaviour.

Prefer:

```csharp
/// <summary>
/// Creates a new user account.
/// </summary>
/// <param name="request">The creation request.</param>
/// <returns>The created user.</returns>
```

Avoid:

```csharp
// Creates a user
```

Use XML documentation for:

- All types
- All methods
- Domain concepts
- Complex business rules

Avoid non-XML comments unless absolutely necessary.

---

## Constants

Avoid magic strings and magic numbers.

Prefer constants abstractions.

```csharp
public static class SessionStatus
{
    public const string Active = "Active";
    public const string Revoked = "Revoked";
    public const string Expired = "Expired";
}
```

```csharp
public static class ValidationLimits
{
    public const int MaxEmailLength = 256;
    public const int MaxDisplayNameLength = 100;
}
```

Guidelines:

- Prefer static classes containing const values.
- Centralize domain constants.
- Avoid repeating string literals.
- Avoid unexplained numeric values.
- Give constants meaningful names.

---

## Problem Details

Prefer extending problem details as per below:

```csharp
/// <summary>
/// Extension methods for configuring ProblemDetails with custom properties.
/// </summary>
public static class ProblemDetailsExtensions
{
    /// <summary>
    /// Adds ProblemDetails services with custom extensions for detailed error information.
    /// </summary>
    /// <param name="services">The service collection to add ProblemDetails services to.</param>
    /// <returns>The service collection for method chaining.</returns>
    public static IServiceCollection AddCustomProblemDetails(this IServiceCollection services)
    {
        services.AddProblemDetails();

        services.ConfigureOptions<ConfigureProblemDetailsOptions>();

        return services;
    }
}
```

```csharp
/// <summary>
/// Configures ProblemDetails options with custom extensions for detailed error information.
/// Adds contextual metadata to error responses including machine name, timestamps,
/// request identifiers, exception details, and user information for comprehensive debugging.
/// </summary>
public sealed class ConfigureProblemDetailsOptions : IConfigureOptions<ProblemDetailsOptions>
{
    /// <inheritdoc/>
    public void Configure(ProblemDetailsOptions options)
    {
        options.CustomizeProblemDetails = context =>
        {
            // Machine name where the error occurred for infrastructure tracking
            context.ProblemDetails.Extensions["machineName"] = Environment.MachineName;

            // UTC timestamp when the error occurred for temporal correlation
            context.ProblemDetails.Extensions["timestamp"] = DateTime.UtcNow;

            // Request identifier for distributed tracing and log correlation
            context.ProblemDetails.Extensions["requestId"] = context.HttpContext.TraceIdentifier;

            // Service name for identifying the source service in distributed systems
            context.ProblemDetails.Extensions["serviceName"] = ServiceDefaults.Name;

            // User agent string for client identification and debugging
            context.ProblemDetails.Extensions["userAgent"] = context.HttpContext.Request.Headers.UserAgent.ToString();

            // HTTP method used in the request for context and debugging
            context.ProblemDetails.Extensions["method"] = context.HttpContext.Request.Method;

            // Exception type and stack trace when an exception caused the error
            if (context.Exception is not null)
            {
                // Full type name of the exception for debugging and error categorization
                context.ProblemDetails.Extensions["exceptionType"] = context.Exception.GetType().FullName;

                // Stack trace for detailed debugging (should be filtered in production)
                context.ProblemDetails.Extensions["stackTrace"] = context.Exception.StackTrace ?? string.Empty;
            }

            // User identifier if the request was authenticated
            var userId = context.HttpContext.User?.FindFirst("sub")?.Value
                         ?? context.HttpContext.User?.FindFirst("userId")?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                context.ProblemDetails.Extensions["userId"] = userId;
            }
        };
    }
}
```

---

## Preferred Framework Patterns

Prefer:

- Extension methods for entity behaviour.
- Extension methods for IServiceCollection registrations.
- Extension methods for endpoint mapping.
- ConfigureOptions classes for option binding.
- XML documentation comments.
- Constants classes over magic strings and magic numbers.
- Strongly typed options.

---

## Domain Behaviour Pattern

### Entity Behaviour

Prefer adding behaviour through extension methods rather than methods on entity classes.

Example:

```csharp
/// <summary>
/// Extension methods for managing Session entity properties and status.
/// </summary>
public static class SessionExtensions
{
    /// <summary>
    /// Marks the session as revoked.
    /// </summary>
    /// <param name="session">The session to revoke.</param>
    /// <param name="revokedAt">The timestamp when revoked. Defaults to current UTC time.</param>
    /// <returns>The session for method chaining.</returns>
    public static Session MarkAsRevoked(
        this Session session,
        DateTimeOffset? revokedAt = null)
    {
        session.Status = SessionStatus.Revoked;
        session.RevokedAt = revokedAt ?? DateTimeOffset.UtcNow;

        return session;
    }
}
```

Guidelines:

- Prefer extension methods for entity behaviour.
- Keep entities focused on state and persistence concerns.
- Group extensions by entity.
- Return the entity when method chaining improves readability.
- Place extensions close to the feature they belong to.

---

## Value Objects

Value objects are immutable objects defined by their attributes rather than identity. Two value objects with the same data are equal. Use them for concepts like money, addresses, and email values.

```csharp
public sealed record Money
{
    public required decimal Amount { get; init; }
    public required string Currency { get; init; }

    public Money Add(Money other)
    {
        ArgumentNullException.ThrowIfNull(other);

        if (Currency != other.Currency)
        {
            throw new InvalidOperationException("Cannot add money with different currencies.");
        }

        return this with { Amount = Amount + other.Amount };
    }
}
```

Guidelines:

- Make value objects immutable.
- Implement equality based on value, not reference.
- Validate invariants in the constructor or factory method.
- Use `record` types where possible.
- Return new instances instead of mutating state.

---

### Service Lifetimes

Prefer constructor injection and understand the implications of each lifetime.

### Transient

A new instance is created every time the service is requested.

```csharp
services.AddTransient<IEmailSender, SmtpEmailSender>();
```

Use for:

- Stateless services
- Lightweight services with no shared state
- Services that are not thread-safe

### Scoped

One instance per request (or per scope).

```csharp
services.AddScoped<IOrderRepository, OrderRepository>();
```

Use for:

- Entity Framework `DbContext`
- Request-specific state
- Services that should share state within a single request

### Singleton

One instance for the lifetime of the application.

```csharp
services.AddSingleton<ICacheService, MemoryCacheService>();
```

Use for:

- Shared caches
- Configuration readers
- Thread-safe state that must persist across requests

### Captive Dependencies

Do not inject a service with a shorter lifetime into a service with a longer lifetime. This creates a captive dependency that lives longer than intended.

**Noncompliant:**

```csharp
public sealed class CacheService : ICacheService // Singleton
{
    private readonly IOrderRepository _repository; // Scoped — captive!

    public CacheService(IOrderRepository repository)
    {
        _repository = repository;
    }
}
```

**Compliant:**

```csharp
public sealed class CacheService : ICacheService // Singleton
{
    private readonly IServiceProvider _serviceProvider;

    public CacheService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task WarmCacheAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
        // Use repository within the scope
    }
}
```

Guidelines:

- Prefer transient for stateless services.
- Use scoped for `DbContext` and request-bound state.
- Use singleton sparingly; ensure thread safety.
- Never inject scoped services into singletons directly.
- Resolve scoped services inside singletons by creating a scope.

---

## Generic Variance

C# supports generic variance through the `in` and `out` keywords on interface type parameters. Variance controls whether a generic interface can be implicitly converted when its type arguments have an inheritance relationship.

### Covariance (`out`)

A type parameter marked with `out` is covariant. It allows a more derived type to be used where a less derived type is expected. Covariance only applies to return types (output positions).

**Compliant:**

```csharp
public interface IEventReader<out TEvent>
{
    TEvent Read();
}

public sealed class OrderEventReader : IEventReader<OrderCreatedEvent>
{
    public OrderCreatedEvent Read()
    {
        return new OrderCreatedEvent(Guid.NewGuid());
    }
}

// Usage: covariant assignment
IEventReader<object> reader = new OrderEventReader(); // Valid because OrderCreatedEvent : object
```

Guidelines:

- Use `out` for interfaces that only produce values (readers, factories, sequences).
- `IEnumerable<T>` is covariant because it only outputs values.
- Do not declare `out` parameters if the interface has any method that accepts `T` as input.

### Contravariance (`in`)

A type parameter marked with `in` is contravariant. It allows a less derived type to be used where a more derived type is expected. Contravariance only applies to input positions (parameters).

**Compliant:**

```csharp
public interface IEventHandler<in TEvent>
{
    void Handle(TEvent @event);
}

public sealed class DomainEventHandler : IEventHandler<DomainEvent>
{
    public void Handle(DomainEvent @event)
    {
        Console.WriteLine($"Handled: {@event.GetType().Name}");
    }
}

// Usage: contravariant assignment
IEventHandler<OrderCreatedEvent> handler = new DomainEventHandler(); // Valid because OrderCreatedEvent : DomainEvent
```

Guidelines:

- Use `in` for interfaces that only consume values (handlers, comparers, writers).
- `IComparer<T>` is contravariant because it only accepts values for comparison.
- Do not declare `in` parameters if the interface has any method that returns `T`.

## Invariance (default)

Without `in` or `out`, the type parameter is invariant. The exact type must match; no implicit conversion is allowed.

**Noncompliant:**

```csharp
public interface IRepository<T> // Invariant
{
    T GetById(Guid id);
    void Save(T entity);
}

// This interface cannot safely be covariant or contravariant
// because T appears in both input and output positions.
```

Guidelines:

- Keep interfaces invariant unless there is a clear, safe use case for variance.
- Do not add `in` or `out` to type parameters that appear in both input and output positions.
- Prefer explicit variance declarations to communicate intent to consumers.

---

## High-Performance Memory Patterns

Prefer modern memory-efficient patterns for hot paths and high-throughput code. Use `Span<T>`, `Memory<T>`, `stackalloc`, and `IAsyncEnumerable<T>` to reduce allocations and improve cache locality.

### Span<T> and ReadOnlySpan<T>

`Span<T>` provides a type-safe, memory-safe view into contiguous memory without allocation.

**Compliant:**

```csharp
public int ParseIds(ReadOnlySpan<char> input, Span<int> output)
{
    int count = 0;
    foreach (var range in input.Split(','))
    {
        if (int.TryParse(input[range], out int id))
        {
            output[count++] = id;
        }
    }
    return count;
}
```

Guidelines:

- Use `Span<T>` for synchronous APIs operating on contiguous memory.
- Use `ReadOnlySpan<T>` for read-only views.
- Prefer `Span<T>` over `byte[]` or `char[]` for parsing and transformation.
- `Span<T>` cannot be stored on the heap; use it for local stack-scoped operations.

## Memory<T> and ReadOnlyMemory<T>

`Memory<T>` is the heap-friendly equivalent of `Span<T>`, suitable for async operations and field storage.

**Compliant:**

```csharp
public async Task ProcessStreamAsync(Stream stream, Memory<byte> buffer)
{
    int read;
    while ((read = await stream.ReadAsync(buffer)) > 0)
    {
        ProcessChunk(buffer.Span.Slice(0, read));
    }
}
```

Guidelines:

- Use `Memory<T>` when data must outlive the current stack frame (e.g., async methods).
- Use `ReadOnlyMemory<T>` for read-only data shared across threads.
- Convert `Memory<T>` to `Span<T>` via `.Span` for synchronous processing.

### Stackalloc

Use `stackalloc` for small, fixed-size buffers to avoid heap allocations in hot paths.

**Compliant:**

```csharp
public int SumSmallArray(ReadOnlySpan<int> values)
{
    Span<int> buffer = stackalloc int[values.Length];
    values.CopyTo(buffer);
    int sum = 0;
    foreach (var value in buffer)
    {
        sum += value;
    }
    return sum;
}
```

Guidelines:

- Limit `stackalloc` to small buffers (typically < 1 KB) to avoid stack overflow.
- Use `stackalloc` with `Span<T>`; avoid unsafe pointer arithmetic.
- Prefer `stackalloc` over pooled arrays for short-lived, small buffers.

## IAsyncEnumerable<T>

Use `IAsyncEnumerable<T>` for streaming large datasets or consuming async sequences without buffering everything in memory.

**Compliant:**

```csharp
public async IAsyncEnumerable<OrderDto> StreamOrdersAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var order in _repository.StreamAllAsync(ct))
    {
        yield return MapToDto(order);
    }
}
```

Consumption:

```csharp
await foreach (var order in orderService.StreamOrdersAsync(ct))
{
    await ProcessAsync(order, ct);
}
```

Guidelines:

- Use `IAsyncEnumerable<T>` for paginated or streamed data instead of `Task<List<T>>`.
- Apply `[EnumeratorCancellation]` to ensure cancellation tokens flow correctly.
- Avoid materializing `IAsyncEnumerable<T>` into a list unless the consumer requires random access.

## Object Pooling

For hot paths that allocate heavily, use `ArrayPool<T>` and `ObjectPool<T>` to reduce GC pressure.

```csharp
public sealed class OrderBufferWriter
{
    private static readonly ArrayPool<byte> Pool = ArrayPool<byte>.Shared;

    public void WriteOrders(ReadOnlySpan<Order> orders, IBufferWriter<byte> output)
    {
        var buffer = Pool.Rent(4096);
        try
        {
            // Write to buffer
        }
        finally
        {
            Pool.Return(buffer, clearArray: true);
        }
    }
}
```

Guidelines:

- Always return rented arrays, even on exception paths; use `try/finally`.
- Set `clearArray: true` for buffers that contain sensitive data.
- Prefer `ObjectPool<T>` for short-lived object reuse over repeated `new` allocations.
- Do not pool objects that hold unmanaged resources or have complex disposal requirements.

---

## Nullable Reference Types

Enable nullable reference types (`<Nullable>enable</Nullable>`) in all projects. This shifts null safety from runtime exceptions to compile-time warnings.

## Nullability Annotations

Use `?` to annotate nullable reference types. Omit it for non-nullable references.

**Compliant:**

```csharp
public sealed class User
{
    public required string Email { get; init; } // Non-nullable: must be provided
    public string? Nickname { get; init; }     // Nullable: may be omitted
}
```

Guidelines:

- Default to non-nullable. Only mark `?` when `null` is a meaningful, expected state.
- Use `null` for optional or missing values, not magic strings like `""`.
- Always check for `null` before dereferencing nullable references, or use the null-forgiving operator `!` only when the compiler cannot prove non-nullability but you can.

## Null-Forgiving Operator (`!`)

Use `!` sparingly. It suppresses compiler warnings but does not change runtime behaviour.

**Noncompliant:**

```csharp
public string GetUppercase(string? name)
{
    return name!.ToUpper(); // Risky: name could still be null at runtime
}
```

**Compliant:**

```csharp
public string GetUppercase(string? name)
{
    ArgumentNullException.ThrowIfNull(name);
    return name.ToUpper();
}
```

Guidelines:

- Prefer explicit null checks or `??` fallback over `!`.
- Use `!` only after validation or when the framework guarantees non-null (e.g., `ArgumentNullException.ThrowIfNull`).

## Nullable Value Types (`Nullable<T>`)

Value types are inherently non-nullable. Use `T?` shorthand for `Nullable<T>` when a value type needs to represent absence.

**Compliant:**

```csharp
public sealed class Order
{
    public required DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? ShippedAt { get; init; } // May not have shipped yet
}
```

Guidelines:

- Use `DateTimeOffset?` instead of `DateTimeOffset.MinValue` for optional dates.
- Use `int?` instead of sentinel values like `-1` for optional integers.

## Migration Strategy

When enabling nullable reference types on an existing codebase:

1. Start at the leaf nodes (domain models, value objects) and work outward.
2. Suppress warnings temporarily with `#nullable disable` around legacy code blocks, not globally.
3. Add `?` to parameters and properties that legitimately accept `null`.
4. Remove `#nullable disable` as each section is migrated.

Guidelines:

- Do not globally disable nullable reference types.
- Do not add `?` to every reference type to silence warnings; this defeats the purpose.
- Treat nullable warnings as errors in CI.

---

## Modern C# Disposal Patterns

Use modern disposal patterns to ensure deterministic resource cleanup, especially in async code. Prefer `IAsyncDisposable`, `using` declarations, and safe null-coalescing disposal.

### IAsyncDisposable

Implement `IAsyncDisposable` when cleanup involves async I/O (e.g., flushing streams, closing connections).

**Compliant:**

```csharp
public sealed class AsyncResource : IAsyncDisposable
{
    private readonly Stream _stream;

    public AsyncResource(Stream stream)
    {
        _stream = stream;
    }

    public async ValueTask DisposeAsync()
    {
        await _stream.FlushAsync();
        await _stream.DisposeAsync();
    }
}
```

Usage:

```csharp
await using var resource = new AsyncResource(stream);
// Use resource
```

Guidelines:

- Implement `IAsyncDisposable` when disposal involves async operations.
- Return `ValueTask` from `DisposeAsync` for efficient single await.
- If a type implements both `IDisposable` and `IAsyncDisposable`, prefer `await using`.

## using Declarations

Use `using` declarations (C# 8+) for concise, scope-bound resource management.

**Compliant:**

```csharp
public async Task ProcessFileAsync(string path)
{
    using var stream = File.OpenRead(path);
    using var reader = new StreamReader(stream);
    var content = await reader.ReadToEndAsync();
    // stream and reader disposed at end of scope
}
```

Guidelines:

- Prefer `using var` over explicit `try/finally` with `Dispose()` for local resources.
- Use `await using var` for `IAsyncDisposable` types.
- Avoid nesting `using` declarations too deeply; extract methods if disposal becomes complex.

### Safe Null-Coalescing Disposal

Dispose nested dependencies safely without null checks cluttering `Dispose` methods.

**Compliant:**

```csharp
public sealed class CompositeResource : IDisposable
{
    private readonly IDisposable? _first;
    private readonly IDisposable? _second;

    public void Dispose()
    {
        _first?.Dispose();
        _second?.Dispose();
    }
}
```

Guidelines:

- Use null-conditional disposal (`?.Dispose()`) for optional dependencies.
- Implement dispose patterns only when a class holds unmanaged resources or complex hierarchies.
- Do not implement a finalizer unless the class directly owns unmanaged resources.

---

## TimeProvider Abstraction

Never use `DateTime.UtcNow`, `DateTimeOffset.UtcNow`, or `Task.Delay` directly in business logic. Inject `TimeProvider` for deterministic testing and time-based operations.

```csharp
public sealed class OrderProcessor(TimeProvider timeProvider)
{
    public void Process()
    {
        var now = timeProvider.GetUtcNow();
    }

    public ITimer CreateExpiryTimer(TimerCallback callback)
    {
        return timeProvider.CreateTimer(callback, null, TimeSpan.FromMinutes(5), TimeSpan.Zero);
    }
}
```

Registration:

```csharp
builder.Services.AddSingleton(TimeProvider.System);
```

Guidelines:

- Register `TimeProvider.System` in DI by default.
- Use `timeProvider.GetUtcNow()` instead of `DateTimeOffset.UtcNow`.
- Use `timeProvider.CreateTimer()` for testable recurring timers.
- Never use `DateTime.Now` in server code.

---

## Architecture

## General

- Use a layered architecture with four layers: **Api**, **Application**, **Domain**, **Persistence**.
- Organize code by technical concern (layer), not by feature.
- There is no separate Infrastructure layer. Cross-cutting infrastructure — messaging (event bus, publishers, consumers), cryptography/JWT/secret protection, external HTTP clients, options/configuration binding, logging extensions, and observability — lives under **Application**.
- **Domain** holds entities, value objects, domain constants, and domain behaviour, and depends on nothing else. **Persistence** holds the `DbContext`, `IEntityTypeConfiguration` classes, and persistence/query helpers (EF Core only). **Application** holds services/orchestration, DTOs/contracts, validators, results, and the infrastructure listed above. **Api** holds HTTP endpoints (and, for worker services, the inbound adapter is the hosted `BackgroundService`, which lives under Application).
- Keep dependency direction flowing inward: Api → Application → Domain; Persistence → Domain; Domain depends on nothing.
- Implement the layers as **folders within a single project per service**; namespaces mirror the folder path (e.g. `Company.Service.Catalogue.Application.Messaging`). Prefer folders over additional assemblies unless separation provides a clear benefit.

Preferred structure (folders within each service project):

```text
src/<Service>/
├── Api/              # HTTP endpoints (minimal APIs / controllers)
├── Application/      # services, DTOs, validators, messaging, crypto, clients, logging, observability
├── Domain/          # entities, value objects, domain constants, domain behaviour
├── Persistence/     # DbContext, IEntityTypeConfiguration, query helpers
└── Program.cs       # composition root

tests/
```

For worker (non-HTTP) services, omit `Api/` and place the hosted `BackgroundService` consumers under `Application/`.

## Messaging Infrastructure

- Use the Outbox Pattern to ensure atomicity between database commits and event publishing.
- Prefer a centralized messaging abstraction (e.g., `IEventPublisher`, `IEventConsumer`) over direct broker SDK usage.
- Keep broker-specific code isolated under `Application/Messaging` (there is no separate Infrastructure layer).

Preferred structure for event-driven services:

```text
src/<Service>/
├── Api/
├── Application/
│   ├── Messaging/        # publishers, consumers, serializers
│   └── Logging/
├── Domain/
│   └── Events/
└── Persistence/
    └── Outbox/

tests/
```

---

## Central Package Management

For multi-project solutions, use Central Package Management (CPM) to lock dependency versions centrally and prevent transitive version conflicts.

```xml
<!-- Directory.Packages.props -->
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Microsoft.AspNetCore.OpenApi" Version="9.0.0" />
    <PackageVersion Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.0" />
  </ItemGroup>
</Project>
```

```xml
<!-- MyProject.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" />
  </ItemGroup>
</Project>
```

Guidelines:

- Never declare versions in individual `.csproj` files.
- Audit `Directory.Packages.props` quarterly for CVEs.
- Use `Directory.Build.props` for shared MSBuild properties across all projects.
- Keep CPM enabled at the solution root.

---

## Service Naming Conventions

## Assembly Naming

- All service assemblies must include `.Service.` in their name.
- Use the format: `{Company}.{Domain}.Service.{Capability}`

Examples:

```csharp
ArbitrageIQ.Trading.Service.OrderManagement
ArbitrageIQ.Trading.Service.Pricing
ArbitrageIQ.Trading.Service.Execution
```

## Namespace Naming

- Root namespaces must match the assembly name.
- Use file-scoped namespaces as per C# standards.

```csharp
namespace ArbitrageIQ.Trading.Service.OrderManagement.Domain;
```

## Project Naming

- Project names (`.csproj`) must follow assembly naming conventions.
- Solution folders should group services by domain or bounded context.

## Repository Naming

- Git repositories should follow the pattern: `{domain}-service-{capability}`
- Use lowercase with hyphen separators.

Examples:

```text
trading-service-order-management
trading-service-pricing
trading-service-execution
```

### Service Identifier

- Each service must define a stable, unique service name constant.
- Use this identifier for logging, tracing, and service discovery.

```csharp
public static class ServiceDefaults
{
    public const string Name = "order-management-service";
}
```

---

## Event-Driven Architecture

## Communication Style

- Prefer asynchronous messaging over synchronous HTTP calls between services.
- Use synchronous HTTP only for edge-facing APIs or when a real-time response is strictly required.
- Avoid chaining synchronous calls across service boundaries.

## Event Contracts

- Treat event schemas as public contracts.
- Version events explicitly using a `Version` property or namespace.
- Avoid breaking changes; prefer additive evolution.

```csharp
public sealed record OrderCreatedEvent
{
    public required Guid OrderId { get; init; }
    public required Guid CustomerId { get; init; }
    public required DateTimeOffset OccurredAt { get; init; }
    public required int Version { get; init; } = 1;
}
```

## Event Types

- Prefer domain events for business-significant occurrences.
- Use integration events for cross-service communication.
- Keep domain events internal to the service; translate to integration events at the boundary.

## Idempotency

- All event handlers must be idempotent.
- Use natural keys or idempotency keys to detect duplicate processing.

```csharp
public sealed class OrderCreatedHandler : IEventHandler<OrderCreatedEvent>
{
    public async Task HandleAsync(OrderCreatedEvent @event, CancellationToken ct)
    {
        if (await _orderRepository.ExistsAsync(@event.OrderId, ct))
        {
            return; // Already processed
        }

        // Process event...
    }
}
```

---

## Service-Oriented Architecture

### Service Boundaries

- Align service boundaries with business capabilities (bounded contexts).
- Each service owns its data exclusively; no shared databases between services.
- Avoid distributed transactions; use eventual consistency and sagas.

### Service Contracts

- Expose minimal surface area.
- Use stable, coarse-grained contracts.
- Avoid leaking internal domain models in integration events or APIs.

## Dependency Direction

- Services depend on abstractions, not on other service implementations.
- Prefer a thin anti-corruption layer at integration points.

```csharp
public interface IInventoryClient
{
    Task<Result> ReserveStockAsync(ReserveStockRequest request, CancellationToken ct);
}
```

## Anti-Corruption Layer

When integrating with external services or legacy systems, build an explicit ACL to translate external contracts into your domain language and protect your bounded context from leakage.

```csharp
public interface ILegacyOrderClient { /* external contract */ }

public sealed class LegacyOrderAdapter(
    ILegacyOrderClient client,
    ILogger<LegacyOrderAdapter> logger) : IOrderSource
{
    public async Task<Order> GetOrderAsync(OrderId id, CancellationToken ct)
    {
        var dto = await client.GetRawAsync(id.Value, ct);
        // Translate, validate, sanitize
        return MapToDomain(dto);
    }
}
```

Guidelines:

- The ACL owns all translation and validation of external data.
- Never reference external DTOs in application or domain layers.
- Keep the adapter thin; it should not contain business logic, only mapping and validation.
- Define explicit interfaces (`IOrderSource`) so the domain depends on abstractions.

---

## Domain-Driven Design

## Business Logic

Business rules belong in domain objects.

Prefer:

```csharp
user.Activate();
order.Cancel();
```

Avoid:

```csharp
user.IsActive = true;
order.Status = OrderStatus.Cancelled;
```

when domain behaviour exists.

---

## Entities

Entities should protect invariants through constructors and methods rather than allowing direct mutation of state.

**Noncompliant:**

```csharp
public class Order
{
    public Guid Id { get; set; }
    public OrderStatus Status { get; set; }
    public List<OrderItem> Items { get; set; } = [];
}
```

**Compliant:**

```csharp
public sealed class Order
{
    public Guid Id { get; private set; }
    public OrderStatus Status { get; private set; }
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();
    private readonly List<OrderItem> _items = [];

    public Order(Guid id)
    {
        Id = id;
        Status = OrderStatus.Pending;
    }

    public void AddItem(OrderItem item)
    {
        ArgumentNullException.ThrowIfNull(item);
        _items.Add(item);
    }

    public void Cancel()
    {
        if (Status == OrderStatus.Shipped)
        {
            throw new InvalidOperationException("Cannot cancel a shipped order.");
        }

        Status = OrderStatus.Cancelled;
    }
}
```

Avoid exposing mutable state unnecessarily. Prefer immutable or read-only properties for collections and value objects.

---

### Domain Events

Use domain events for side effects and cross-cutting concerns within a service.

Avoid coupling domain logic directly to infrastructure concerns.

### Publishing

- Raise domain events from aggregates.
- Dispatch domain events before or after persistence (depending on consistency requirements).
- Translate domain events to integration events at the application boundary; do not expose domain events directly outside the service.

---

## Resilience and Reliability

## Retry Policies

Apply transient fault handling at infrastructure boundaries. Use jittered exponential backoff to avoid thundering herd. Never retry indefinitely.

```csharp
public sealed class ResilientHttpClient
{
    private readonly HttpClient _client;
    private readonly ILogger<ResilientHttpClient> _logger;

    public ResilientHttpClient(HttpClient client, ILogger<ResilientHttpClient> logger)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string url, CancellationToken ct = default)
    {
        var retryCount = 0;
        const int maxRetries = 3;

        while (true)
        {
            try
            {
                var response = await _client.GetAsync(url, ct);
                response.EnsureSuccessStatusCode();
                return await response.Content.ReadFromJsonAsync<T>(ct);
            }
            catch (HttpRequestException ex) when (retryCount < maxRetries)
            {
                retryCount++;
                var delay = TimeSpan.FromSeconds(Math.Pow(2, retryCount))
                    + TimeSpan.FromMilliseconds(Random.Shared.Next(0, 100));

                _logger.LogWarning(ex,
                    "Request to {Url} failed. Retry {RetryCount}/{MaxRetries} in {DelayMs}ms",
                    url, retryCount, maxRetries, delay.TotalMilliseconds);

                await Task.Delay(delay, ct);
            }
        }
    }
}
```

Guidelines:

- Apply transient fault handling at infrastructure boundaries.
- Use jittered exponential backoff for retries.
- Avoid infinite retries; define a dead-letter mechanism.
- Only retry idempotent operations.

## Circuit Breakers

Use circuit breakers for synchronous HTTP calls to downstream services. Log state transitions (open, half-open, closed) for observability.

```csharp
public sealed class InventoryCircuitBreaker
{
    private readonly CircuitBreaker _breaker = new(
        failureThreshold: 5,
        recoveryTimeout: TimeSpan.FromSeconds(30));

    public async Task<Result> CallAsync(Func<Task<Result>> operation)
    {
        if (_breaker.State == CircuitState.Open)
        {
            return Result.Failure("Circuit breaker is open; downstream service unavailable.");
        }

        try
        {
            var result = await operation();
            _breaker.RecordSuccess();
            return result;
        }
        catch (Exception ex)
        {
            _breaker.RecordFailure();
            throw;
        }
    }
}
```

Guidelines:

- Use circuit breakers for synchronous HTTP calls to downstream services.
- Log state transitions (open, half-open, closed) for observability.
- Provide a degraded or cached fallback when the circuit is open.

## Dead-Letter Queues

Failed messages after retries must move to a dead-letter queue. Alert on dead-letter queue growth; do not silently drop failed events.

```csharp
public sealed class DeadLetterPublisher
{
    private readonly IMessageBroker _broker;
    private readonly ILogger<DeadLetterPublisher> _logger;

    public async Task PublishAsync(FailedMessage message, CancellationToken ct)
    {
        _logger.LogError(
            "Moving message {MessageId} to dead-letter queue after {RetryCount} attempts. Error: {Error}",
            message.MessageId, message.RetryCount, message.LastError);

        await _broker.SendAsync("dead-letter-queue", message, ct);
    }
}
```

## Timeouts

Always specify timeouts for external calls. Default to fail-fast rather than hang indefinitely.

```csharp
public async Task<OrderDto?> GetOrderAsync(Guid orderId, CancellationToken ct)
{
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
    cts.CancelAfter(TimeSpan.FromSeconds(5));

    try
    {
        return await _orderClient.GetOrderAsync(orderId, cts.Token);
    }
    catch (OperationCanceledException) when (!ct.IsCancellationRequested)
    {
        _logger.LogError("Order service call timed out for {OrderId}", orderId);
        return null;
    }
}
```

Guidelines:

- Always specify timeouts for external calls.
- Default to fail-fast rather than hang indefinitely.
- Distinguish between user-initiated cancellation and timeout cancellation.

---

## ASP.NET Core

## API Style

Minimal APIs are preferred, but equally consider using controllers as per below.

Prefer:

```csharp
app.MapPost("/users", CreateUserHandler.HandleAsync);
```

```csharp
    [Route($"{Routes.BaseRoute.Name}")]
    public sealed class TestEndpoint : EndpointBase
    {
        [HttpGet]
        public override async Task<ActionResult> HandleAsync(CancellationToken cancellationToken = default)
        {
            return Ok();
        }
    }
```

---

## Endpoint Design

Endpoints should remain thin.

Responsibilities:

- Endpoint: HTTP concerns.
- Application: orchestration.
- Domain: business rules.
- Persistence: data access.

Avoid placing business logic directly inside endpoints.

---

## API Versioning

Use URL path versioning or header versioning. Avoid query-string versioning for public APIs.

Prefer:

```csharp
[Route("api/v{version:apiVersion}/[controller]")]
[ApiController]
public sealed class OrdersController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<OrderDto>> GetOrder(Guid id)
    {
        // ...
    }
}
```

Guidelines:

- Default to URL path versioning for clarity.
- Include the API version in OpenAPI documentation.
- Support at least one previous version with deprecation headers.
- Avoid breaking changes; prefer additive evolution within a major version.

---

## Dependency Injection

Use constructor injection exclusively.

Avoid:

- Service locators
- Static service providers
- Global state

Group registrations using extension methods.

```csharp
services.AddApplication();
services.AddPersistence();
services.AddInfrastructure();
```

### Keyed Services

When multiple implementations of the same interface are registered, use keyed services instead of marker interfaces or factory delegates.

Registration:

```csharp
builder.Services.AddKeyedSingleton<ICacheStore, RedisCacheStore>("redis");
builder.Services.AddKeyedSingleton<ICacheStore, InMemoryCacheStore>("memory");
```

Usage:

```csharp
public sealed class ProductService(
    [FromKeyedServices("redis")] ICacheStore cache)
{
}
```

Guidelines:

- Prefer keyed services over `IEnumerable<T>` resolution when only one instance is needed per consumer.
- Use `FromKeyedServicesAttribute` in constructors.
- Avoid keyed services when a single default implementation is sufficient; use standard registration instead.

---

## Configuration

Use strongly typed options.

Prefer:

```csharp
services.Configure<JwtOptions>(
    configuration.GetSection("Jwt"));
```

Avoid magic strings throughout the application.

### Options Pattern

Prefer dedicated ConfigureOptions classes using IConfigureOptions<T>.

```csharp
public sealed class JwtOptions
{
    public required string Issuer { get; init; }
    public required string Audience { get; init; }
}
```

```csharp
public sealed class ConfigureJwtOptions
    : IConfigureOptions<JwtOptions>
{
    private readonly IConfiguration _configuration;

    /// <summary>
    /// Initializes a new instance of the ConfigureJwtOptions class.
    /// </summary>
    /// <param name="configuration">Application configuration.</param>
    public ConfigureJwtOptions(
        IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Configures JWT options.
    /// </summary>
    /// <param name="options">The options instance.</param>
    public void Configure(JwtOptions options)
    {
        _configuration
            .GetSection("Jwt")
            .Bind(options);
    }
}
```

Registration:

```csharp
services.AddSingleton<
    IConfigureOptions<JwtOptions>,
    ConfigureJwtOptions>();
```

Avoid:

```csharp
services.Configure<JwtOptions>(
    configuration.GetSection("Jwt"));
```

Guidelines:

- Prefer IConfigureOptions<T> implementations.
- Keep configuration binding in a single location.
- Prefer strongly typed options.
- Avoid magic configuration keys throughout the application.
- Inject IOptions<T>, IOptionsSnapshot<T>, or IOptionsMonitor<T>.
- Keep Program.cs focused on composition rather than implementation details.

---

## Logging

Use structured logging.

Prefer:

```csharp
_logger.LogInformation(
    "User {UserId} created",
    user.Id);
```

Avoid string interpolation in log messages.

Prefer using .NET Aspire Dashboard Standalone or .NET Aspire.

Always use extension methods that use the [LoggerMessage] attribute.

```csharp
public static partial class LoggingExtensions
{
    // ==========================================
    // Authentication Events (1000-1099)
    // ==========================================

    /// <summary>
    /// Logs successful user login.
    /// </summary>
    [LoggerMessage(
        EventId = 1001,
        Level = LogLevel.Information,
        Message = "User {UserId} logged in successfully from {IpAddress}")]
    public static partial void UserLoggedIn(
        this ILogger logger,
        string userId,
        string ipAddress);
}
```

### Distributed Tracing

- Propagate correlation IDs (`traceparent`, `correlation-id`) across all events and HTTP calls.
- Include correlation IDs in every log entry and event metadata.

```csharp
public sealed record OrderCreatedEvent
{
    public required Guid OrderId { get; init; }
    public required string CorrelationId { get; init; }
}
```

---

## Health Checks

Add health checks for all external dependencies (databases, message brokers, downstream services).

```csharp
public sealed class DatabaseHealthCheck : IHealthCheck
{
    private readonly AppDbContext _context;

    public DatabaseHealthCheck(AppDbContext context)
    {
        _context = context;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken ct = default)
    {
        try
        {
            await _context.Database.ExecuteSqlRawAsync("SELECT 1", ct);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Database connection failed", ex);
        }
    }
}
```

Registration:

```csharp
services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database")
    .AddCheck<MessageBrokerHealthCheck>("message-broker");
```

Guidelines:

- Distinguish between liveness and readiness probes.
- Do not expose sensitive health check details publicly.
- Health checks should be lightweight and non-blocking.
- Return `503 Service Unavailable` when any critical dependency is unhealthy.

---

## Background Jobs

Use `IHostedService` or `BackgroundService` for recurring or long-running background tasks.

```csharp
public sealed class OutboxProcessor : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OutboxProcessor> _logger;

    public OutboxProcessor(
        IServiceProvider serviceProvider,
        ILogger<OutboxProcessor> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var publisher = scope.ServiceProvider
                    .GetRequiredService<IOutboxPublisher>();

                await publisher.ProcessAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Outbox processing failed");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
```

Guidelines:

- Always respect `CancellationToken` for graceful shutdown.
- Use `IServiceProvider.CreateScope()` when scoped services are needed in background services.
- Catch and log exceptions inside loops; never let background tasks crash silently.
- Prefer dedicated job schedulers (e.g., Hangfire, Quartz) for complex scheduling needs.

---

## Middleware & Filters

Keep middleware thin and focused on cross-cutting HTTP concerns: logging, correlation IDs, authentication, and exception handling. Place business logic in application services, not middleware.

### Middleware Ordering

Middleware runs in the order it is added. The correct sequence matters:

```csharp
app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.UseOutputCache();
app.MapControllers();
```

Guidelines:

- Register `UseExceptionHandler` early to catch exceptions from downstream middleware.
- Register `UseAuthentication` and `UseAuthorization` before endpoints that require auth.
- Register `UseOutputCache` after auth so cached responses respect identity.

### Action Filters

Use action filters for cross-cutting concerns that apply to specific controllers or actions.

```csharp
public sealed class ValidateModelStateFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            context.Result = new BadRequestObjectResult(context.ModelState);
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        // Post-action logic
    }
}
```

Registration:

```csharp
services.AddControllers(options =>
{
    options.Filters.Add<ValidateModelStateFilter>();
});
```

Guidelines:

- Prefer middleware for global concerns; use filters when the concern only applies to MVC/minimal API routes.
- Keep filters stateless; use constructor injection for dependencies.
- Do not perform business logic inside filters.

### Exception Handling Middleware

Global exception handling should translate unhandled exceptions to [`ProblemDetails`](AGENTS.md:1033) responses and log appropriately.

```csharp
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Unhandled exception occurred");

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An error occurred",
            Detail = exception.Message
        };

        httpContext.Response.StatusCode = problemDetails.Status.Value;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}
```

Registration:

```csharp
services.AddExceptionHandler<GlobalExceptionHandler>();
services.AddProblemDetails();
```

Guidelines:

- Use `IExceptionHandler` (.NET 8+) over custom middleware when possible.
- Never expose stack traces or sensitive details in production responses.
- Always log the full exception with correlation IDs before returning a sanitized response.

---

## Worker Services

Worker services are headless, non-HTTP applications designed for long-running background processing, scheduled tasks, event consumers, and message-driven workflows. They run independently of any web API and are deployed as separate processes.

## When to Use a Worker Service

Use a worker service when the application must:

- Consume events or messages from a broker (e.g., RabbitMQ, Kafka, Azure Service Bus).
- Run scheduled or periodic background tasks (e.g., nightly reports, data cleanup).
- Perform long-running processing pipelines (e.g., ETL, file ingestion, ML inference).
- Operate as a saga orchestrator or process manager in an event-driven system.

**Prefer a worker service over a web API** when there is no requirement for HTTP endpoints or real-time request/response interaction.

## Project Setup

Create the project using the Worker template:

```bash
dotnet new worker -n ArbitrageIQ.Trading.WorkerService.OrderProcessing
```

This generates a `Program.cs` that calls `IHostBuilder` and registers the default worker:

```csharp
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddHostedService<OrderProcessingWorker>();

var host = builder.Build();
host.Run();
```

## Worker Implementation

Derive from `BackgroundService` and implement `ExecuteAsync`. Always respect the `CancellationToken` for graceful shutdown.

```csharp
public sealed class OrderProcessingWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<OrderProcessingWorker> _logger;

    public OrderProcessingWorker(
        IServiceProvider serviceProvider,
        ILogger<OrderProcessingWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var processor = scope.ServiceProvider
                    .GetRequiredService<IOrderProcessor>();

                await processor.ProcessNextAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Order processing failed");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
```

### Worker Service DI

Worker services use the same `IServiceCollection` registration model as web APIs. Group registrations using extension methods.

```csharp
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure();
builder.Services.AddPersistence();
builder.Services.AddHostedService<OrderProcessingWorker>();
```

Guidelines:

- Use `IServiceProvider.CreateScope()` when scoped services are needed inside the worker loop.
- Never let unhandled exceptions crash the worker process; catch and log inside `ExecuteAsync`.
- Keep worker classes focused on scheduling and lifecycle concerns.
- Offload business logic to application-layer services.

## Naming Conventions

Worker services follow the same conventions as standard services but use `.WorkerService.` (or `worker-service-`) in place of `.Service.` (or `service-`).

**Assembly:**

```csharp
ArbitrageIQ.Trading.WorkerService.OrderProcessing
```

**Repository:**

```text
trading-worker-service-order-processing
```

**Namespace:**

```csharp
namespace ArbitrageIQ.Trading.WorkerService.OrderProcessing.Domain;
```

**Service Identifier:**

```csharp
public static class ServiceDefaults
{
    public const string Name = "order-processing-worker-service";
}
```

## Worker in an ASP.NET Application

A worker can run inside an existing ASP.NET Core web application by registering it alongside controllers or minimal APIs. This is useful when a service must expose both HTTP endpoints and background processing.

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddHostedService<OutboxProcessor>();

var app = builder.Build();
app.MapControllers();
app.Run();
```

Guidelines:

- Only co-locate a worker with a web API when the background work is tightly coupled to the same bounded context.
- Prefer separate worker service projects for heavy background workloads to allow independent scaling and deployment.
- Ensure workers do not compete with HTTP request threads for CPU or memory; use resource limits or separate pods in containerised environments.

---

### System.Threading.Channels

`System.Threading.Channels` provides a bounded or unbounded queue for producer-consumer scenarios, especially useful for backpressure-aware processing pipelines.

## Bounded Channel

Use a bounded channel to apply backpressure when the consumer cannot keep up with the producer.

```csharp
public sealed class OrderProcessor
{
    private readonly Channel<Order> _channel;

    public OrderProcessor()
    {
        _channel = Channel.CreateBounded<Order>(new BoundedChannelOptions(1000)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false
        });
    }

    public async Task EnqueueAsync(Order order, CancellationToken ct = default)
    {
        await _channel.Writer.WriteAsync(order, ct);
    }

    public async Task ProcessAsync(CancellationToken ct = default)
    {
        await foreach (var order in _channel.Reader.ReadAllAsync(ct))
        {
            await ProcessSingleAsync(order, ct);
        }
    }
}
```

Guidelines:

- Use `CreateBounded` when memory is constrained or backpressure is required.
- Set `FullMode` to `Wait` rather than dropping items.
- Use `CreateUnbounded` only when memory is not a concern and dropping is unacceptable.
- Always complete the channel writer (`_channel.Writer.Complete()`) on shutdown.

---

## Caching

Prefer `IMemoryCache` for short-lived, per-process caches. Use `IDistributedCache` for multi-node environments.

```csharp
public sealed class CachedProductRepository : IProductRepository
{
    private readonly IProductRepository _inner;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public CachedProductRepository(IProductRepository inner, IMemoryCache cache)
    {
        _inner = inner;
        _cache = cache;
    }

    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var cacheKey = $"product:{id}";

        if (_cache.TryGetValue(cacheKey, out Product? cached))
        {
            return cached;
        }

        var product = await _inner.GetByIdAsync(id, ct);
        if (product is not null)
        {
            _cache.Set(cacheKey, product, CacheDuration);
        }

        return product;
    }
}
```

Guidelines:

- Treat cache as a performance layer, not a source of truth.
- Use deterministic cache keys based on identifiers.
- Always fall back to the underlying data source on cache miss.
- Set explicit expiration (absolute or sliding) to avoid stale data.
- Invalidate cache on data mutations.

### FusionCache

For advanced caching scenarios, consider using [FusionCache](https://github.com/ZiggyCreatures/FusionCache) as a higher-level abstraction over `IMemoryCache` and `IDistributedCache`. It provides a multi-level cache with built-in cache stampede protection, auto-recovery, and circuit breaker patterns.

Registration with Redis backplane for multi-node environments:

```csharp
builder.Services.AddFusionCache()
    .WithDefaultEntryOptions(new FusionCacheEntryOptions
    {
        Duration = TimeSpan.FromMinutes(5),
        IsFailSafeEnabled = true,
        FactorySoftTimeout = TimeSpan.FromMilliseconds(100),
        FactoryHardTimeout = TimeSpan.FromSeconds(1)
    })
    .WithDistributedCache(
        new RedisCache(new RedisCacheOptions
        {
            Configuration = builder.Configuration.GetConnectionString("Redis")
        }))
    .WithBackplane(
        new RedisBackplane(new RedisBackplaneOptions
        {
            Configuration = builder.Configuration.GetConnectionString("Redis")
        }));
```

Usage:

```csharp
public sealed class CachedProductRepository : IProductRepository
{
    private readonly IProductRepository _inner;
    private readonly IFusionCache _cache;

    public CachedProductRepository(IProductRepository inner, IFusionCache cache)
    {
        _inner = inner;
        _cache = cache;
    }

    public async Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _cache.GetOrSetAsync<Product?>(
            $"product:{id}",
            async token => await _inner.GetByIdAsync(id, token),
            token: ct);
    }
}
```

Guidelines:

- Use `GetOrSetAsync` to prevent cache stampede.
- Enable fail-safe to return stale data during downstream outages.
- Configure soft/hard timeouts to prevent slow factories from blocking callers.
- Use Redis backplane to synchronize invalidation across nodes in multi-instance deployments.
- Always configure distributed cache when using backplane.

---

## Output Caching & Response Caching

### Response Caching

Use `[ResponseCache]` for simple HTTP-based caching where the browser or intermediary CDN should cache the response.

```csharp
[ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
[HttpGet("products/{id}")]
public async Task<ActionResult<ProductDto>> GetProduct(Guid id)
{
    // ...
}
```

Guidelines:

- Use `ResponseCache` for static or rarely changing data.
- Set `VaryByQueryKeys` when the response depends on query parameters.
- Do not use response caching for authenticated or user-specific data without `VaryByHeader` for Authorization.

### Output Caching (.NET 7+)

Use `OutputCache` for server-side response caching with more control over cache keys, tags, and invalidation.

```csharp
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(builder =>
        builder.Expire(TimeSpan.FromSeconds(10)));
    options.AddPolicy("Long", builder =>
        builder.Expire(TimeSpan.FromMinutes(1)).Tag("products"));
});

app.UseOutputCache();
```

Usage:

```csharp
[HttpGet("products")]
[OutputCache(PolicyName = "Long")]
public async Task<ActionResult<List<ProductDto>>> ListProducts()
{
    // ...
}
```

Invalidation:

```csharp
[HttpPost("products")]
[OutputCache(PolicyName = "Long")]
public async Task<ActionResult<ProductDto>> CreateProduct(CreateProductRequest request)
{
    // ...
    await outputCacheStore.EvictByTagAsync("products", CancellationToken.None);
    // ...
}
```

Guidelines:

- Prefer `OutputCache` over `ResponseCache` for ASP.NET Core server-side caching.
- Use cache tags for logical grouping and bulk invalidation.
- Configure `OutputCache` after `UseAuthentication` so cached entries respect the user identity.
- For multi-node deployments, configure a distributed output cache provider (e.g., Redis).

---

## Rate Limiting

Use ASP.NET Core rate limiting to protect endpoints from abuse and ensure fair resource usage.

Registration:

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.PermitLimit = 100;
        opt.Window = TimeSpan.FromMinutes(1);
    });
});

app.UseRateLimiter();
```

Usage:

```csharp
[EnableRateLimiting("api")]
public sealed class OrdersController : ControllerBase
{
    // ...
}
```

Guidelines:

- Apply rate limiting at the edge or API gateway when possible.
- Use distinct policies for public APIs, authenticated APIs, and admin APIs.
- Return `429 Too Many Requests` with a `Retry-After` header.
- Log rate limit violations for security monitoring.

---

## OpenAPI

Generate OpenAPI documentation automatically from controllers and minimal APIs. Use attributes or extension methods to enrich schemas.

```csharp
app.MapPost("/orders", CreateOrderHandler.HandleAsync)
    .WithName("CreateOrder")
    .WithOpenApi(operation =>
    {
        operation.Summary = "Create a new order";
        operation.Description = "Creates an order for a customer.";
        return operation;
    });
```

Guidelines:

- Keep OpenAPI descriptions in sync with endpoint behaviour.
- Use `[ProducesResponseType]` on controllers for accurate status code documentation.
- Group endpoints by tag for logical organisation in Swagger UI.
- Exclude internal or health-check endpoints from public documentation.

---

## Feature Flags

Use feature flags to decouple deployment from release. Prefer a typed, strongly flagged approach rather than raw string checks.

```csharp
public sealed class FeatureFlags
{
    public const string NewCheckoutFlow = "NewCheckoutFlow";
    public const string BetaReporting = "BetaReporting";
}
```

Usage:

```csharp
public async Task<IActionResult> Checkout(CheckoutRequest request)
{
    if (await _featureManager.IsEnabledAsync(FeatureFlags.NewCheckoutFlow))
    {
        return await _newCheckoutService.ProcessAsync(request);
    }

    return await _legacyCheckoutService.ProcessAsync(request);
}
```

Guidelines:

- Use feature flags for gradual rollouts, A/B testing, and emergency toggles.
- Keep the flag surface small; remove flags once a feature is fully stable.
- Evaluate flags at the application layer, not inside domain logic.
- Use short-lived flags to avoid permanent technical debt.

---

## CQRS

Separate commands (writes) from queries (reads) using distinct models and handlers. This keeps read and write concerns independent and optimisable.

Command:

```csharp
public sealed record CreateOrderCommand(
    Guid CustomerId,
    List<OrderItem> Items);

public sealed class CreateOrderHandler(
    IOrderRepository repository,
    IEventPublisher publisher)
{
    public async Task<Result<Guid>> HandleAsync(
        CreateOrderCommand command,
        CancellationToken ct = default)
    {
        var order = Order.Create(command.CustomerId, command.Items);
        await repository.SaveAsync(order, ct);
        await publisher.PublishAsync(new OrderCreatedEvent(order.Id), ct);
        return Result<Guid>.Success(order.Id);
    }
}
```

Query:

```csharp
public sealed record GetOrderQuery(Guid OrderId);

public sealed class GetOrderHandler(IReadOnlyOrderRepository repository)
{
    public async Task<OrderDto?> HandleAsync(GetOrderQuery query, CancellationToken ct = default)
    {
        return await repository.GetByIdAsync(query.OrderId, ct);
    }
}
```

Guidelines:

- Commands must not return domain models; return IDs, results, or void.
- Queries should be simple projections tailored to the consumer.
- Avoid sharing models between commands and queries.
- Keep handlers focused on a single operation.
- Use separate repositories for read and write paths when read models diverge from domain models.

---

### System.Text.Json

Use `System.Text.Json` for all serialization. It is built-in, faster than Newtonsoft.Json, and integrates natively with ASP.NET Core.

## Custom Converters

Create converters for domain types that do not serialize naturally.

```csharp
public sealed class MoneyJsonConverter : JsonConverter<Money>
{
    public override Money Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var document = JsonDocument.ParseValue(ref reader);
        var root = document.RootElement;

        var amount = root.GetProperty("amount").GetDecimal();
        var currency = root.GetProperty("currency").GetString()!;

        return new Money { Amount = amount, Currency = currency };
    }

    public override void Write(Utf8JsonWriter writer, Money value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        writer.WriteNumber("amount", value.Amount);
        writer.WriteString("currency", value.Currency);
        writer.WriteEndObject();
    }
}
```

Registration:

```csharp
services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.Converters.Add(new MoneyJsonConverter());
});
```

## Polymorphic Deserialization

Use `JsonDerivedType` attributes to enable polymorphic deserialization with the derived type discriminator.

```csharp
[JsonDerivedType(typeof(OrderCreatedEvent), "orderCreated")]
[JsonDerivedType(typeof(OrderShippedEvent), "orderShipped")]
public abstract class DomainEvent
{
    public required Guid EventId { get; init; }
    public required DateTimeOffset OccurredAt { get; init; }
}
```

### Source Generators

For high-performance scenarios or ahead-of-time compilation, use source generators to avoid runtime reflection.

```csharp
[JsonSerializable(typeof(OrderDto))]
[JsonSerializable(typeof(List<OrderDto>))]
public partial class OrderJsonContext : JsonSerializerContext
{
}
```

Usage:

```csharp
var order = JsonSerializer.Deserialize(json, OrderJsonContext.Default.OrderDto);
```

Guidelines:

- Prefer `System.Text.Json` over Newtonsoft.Json for new projects.
- Use custom converters for value objects and domain types.
- Use source generators for Native AOT or high-throughput serialization.
- Configure `JsonSerializerOptions` once and reuse via `IOptions<JsonOptions>` or a static singleton.
- Avoid `JsonSerializerOptions.Default` in hot paths; cache and reuse options instances.

---

## gRPC

Use gRPC for high-performance, contract-first communication between internal services. gRPC is well-suited for service-to-service calls where both endpoints are under your control.

## When to Use gRPC

Prefer gRPC over REST when:

- Both client and server are internal services.
- High throughput and low latency are required.
- Strongly typed contracts are preferred over HTTP resources.
- Bidirectional streaming is needed.

Avoid gRPC for public-facing edge APIs (browsers and CDNs may have limited support).

## Protobuf Contracts

Define service contracts using Protocol Buffers (protobuf).

```protobuf
syntax = "proto3";
option csharp_namespace = "MyApp.Contracts";

service OrderService {
    rpc CreateOrder (CreateOrderRequest) returns (OrderDto);
    rpc StreamOrders (stream OrderFilter) returns (stream OrderDto);
}

message CreateOrderRequest {
    string customer_id = 1;
    repeated OrderItem items = 2;
}

message OrderDto {
    string id = 1;
    string status = 2;
}
```

Guidelines:

- Keep proto contracts in a shared project or NuGet package consumed by both client and server.
- Use `string` for GUIDs in protobuf; map to `Guid` in C# via converters.
- Avoid breaking changes; prefer additive evolution.

### Server Registration

```csharp
builder.Services.AddGrpc();

var app = builder.Build();
app.MapGrpcService<OrderServiceImpl>();
```

## Client Registration

```csharp
services.AddGrpcClient<IOrderServiceClient>("orders", options =>
{
    options.Address = new Uri("https://orders-service:443");
})
    .AddHttpMessageHandler<ServiceIdentityHandler>();
```

Guidelines:

- Use `AddGrpcClient` for typed gRPC clients with `IHttpClientFactory` integration.
- Add message handlers for service identity when calling between services.
- Configure deadline/timeout on individual calls, not globally.

---

### SignalR

Use SignalR for real-time, bidirectional communication between server and client. It is ideal for scenarios requiring server-initiated pushes, client-to-server messages, or connection state management.

## When to Use SignalR

Prefer SignalR when:

- Real-time updates must be pushed from server to connected clients (e.g., dashboards, notifications).
- Bidirectional messaging is required between client and server.
- Connection lifecycle management (reconnect, groups, users) is needed.

Avoid SignalR for:

- Unidirectional server-to-client streaming where SSE or `IAsyncEnumerable` HTTP responses suffice.
- Service-to-service communication; prefer gRPC or messaging.
- Extremely high-frequency broadcast scenarios where raw WebSocket or UDP may be more appropriate.

## Hub Design

Keep hubs thin and focused on connection concerns. Business logic belongs in application services.

```csharp
public sealed class OrderHub : Hub<IOrderClient>
{
    private readonly IOrderService _orderService;

    public OrderHub(IOrderService orderService)
    {
        _orderService = orderService;
    }

    public async Task JoinOrderGroup(Guid orderId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, orderId.ToString());
    }

    public async Task UpdateOrderStatus(Guid orderId, string status)
    {
        var result = await _orderService.UpdateStatusAsync(orderId, status, Context.ConnectionAborted);

        if (result.IsSuccess)
        {
            await Clients.Group(orderId.ToString()).OrderStatusChanged(orderId, status);
        }
    }
}
```

```csharp
public interface IOrderClient
{
    Task OrderStatusChanged(Guid orderId, string status);
}
```

Guidelines:

- Hubs should delegate to application-layer services.
- Do not perform business logic directly inside hub methods.
- Use strongly typed hub interfaces (`Hub<T>`) for compile-time safety.

### Scaling with Backplane

When running multiple server instances, use a backplane to synchronize messages across nodes.

```csharp
builder.Services.AddSignalR()
    .AddStackExchangeRedis("connectionString");
```

Guidelines:

- Use a Redis or Azure Service Bus backplane for multi-node deployments.
- Avoid in-memory scaleout in production.
- Ensure connection affinity (sticky sessions) is not required when using a backplane.

## Connection Management

Use groups for broadcast scoping and user identifiers for targeted delivery.

```csharp
await Groups.AddToGroupAsync(Context.ConnectionId, "admins");
await Clients.User(userId).SendAsync("Notification", message);
```

Guidelines:

- Use groups for logical broadcast channels, not for security boundaries.
- Validate permissions before adding a connection to a privileged group.
- Do not rely on `Context.UserIdentifier` without authentication configured.

### Security

Authenticate SignalR connections and validate all hub method inputs.

```csharp
builder.Services.AddAuthentication()
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });
```

```csharp
[Authorize]
public sealed class OrderHub : Hub<IOrderClient>
{
}
```

Guidelines:

- Apply `[Authorize]` to hubs or individual methods as needed.
- Pass JWT tokens via query string for WebSocket transports; validate them in `OnMessageReceived`.
- Validate and sanitize all inputs received from clients; never trust client-provided identifiers without server-side verification.

---

### Server-Sent Events

Server-Sent Events (SSE) provide a lightweight, text-based streaming mechanism from server to client over standard HTTP. They are ideal for pushing real-time updates to a web client.

### SSE with IAsyncEnumerable

In .NET 8+, ASP.NET Core can stream `IAsyncEnumerable<T>` responses directly as `text/event-stream`.

### Endpoint

```csharp
public sealed record OrderStatusUpdate(
    Guid OrderId,
    string Status,
    DateTimeOffset Timestamp);

public sealed class OrderStatusStreamEndpoint : EndpointBase
{
    private readonly IOrderStatusService _statusService;

    public OrderStatusStreamEndpoint(IOrderStatusService statusService)
    {
        _statusService = statusService;
    }

    [HttpGet("orders/stream")]
    public async IAsyncEnumerable<OrderStatusUpdate> StreamOrderUpdates(
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        await foreach (var update in _statusService.StreamUpdatesAsync(ct))
        {
            yield return update;
        }
    }
}
```

Registration:

```csharp
builder.Services.AddServerSentEvents();

var app = builder.Build();
app.MapControllers();
```

The `[EnumeratorCancellation]` attribute ensures the `CancellationToken` is passed to the underlying enumerator, allowing the stream to stop when the client disconnects.

#### Service Layer

```csharp
public sealed class OrderStatusService
{
    private readonly Channel<OrderStatusUpdate> _channel;

    public OrderStatusService()
    {
        _channel = Channel.CreateUnbounded<OrderStatusUpdate>();
    }

    public async IAsyncEnumerable<OrderStatusUpdate> StreamUpdatesAsync(
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        await foreach (var update in _channel.Reader.ReadAllAsync(ct))
        {
            yield return update;
        }
    }

    public async Task PublishAsync(OrderStatusUpdate update, CancellationToken ct = default)
    {
        await _channel.Writer.WriteAsync(update, ct);
    }
}
```

Guidelines:

- Use SSE for unidirectional server-to-client streaming where WebSockets or SignalR are overkill.
- Always apply `[EnumeratorCancellation]` to `IAsyncEnumerable` methods to propagate client disconnection.
- Keep event payloads small and focused; send deltas rather than full objects.
- Use `text/event-stream` content type with proper `id` and `retry` fields for reliable delivery.
- For complex bidirectional streaming, prefer WebSockets or SignalR over SSE.

---

## Authentication & Authorization

### JWT Authentication

Use JWT bearer tokens for stateless authentication in ASP.NET Core APIs. Prefer short-lived access tokens with longer-lived refresh tokens.

```csharp
public sealed class ConfigureJwtAuthentication : IConfigureOptions<AuthenticationOptions>
{
    private readonly IConfiguration _configuration;

    public ConfigureJwtAuthentication(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public void Configure(AuthenticationOptions options)
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    }
}
```

Token validation configuration:

```csharp
public sealed class ConfigureJwtBearerOptions : IConfigureOptions<JwtBearerOptions>
{
    private readonly IOptions<JwtOptions> _jwtOptions;

    public ConfigureJwtBearerOptions(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions;
    }

    public void Configure(JwtBearerOptions options)
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _jwtOptions.Value.Issuer,
            ValidAudience = _jwtOptions.Value.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_jwtOptions.Value.SecretKey))
        };
    }
}
```

Guidelines:

- Use strongly typed `JwtOptions` bound from configuration.
- Never store signing keys in source control; use secret management.
- Set short token expiry (15 minutes typical for access tokens).
- Use refresh tokens with secure storage (httpOnly cookies or secure token stores).
- Validate all token parameters (`Issuer`, `Audience`, `Lifetime`, `SigningKey`).

## Claims-Based Authorization

Prefer claims-based authorization over role-based authorization. Claims provide fine-grained, context-aware permissions.

```csharp
public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public required string Permission { get; init; }
}

public sealed class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userPermission = context.User.FindFirst("permission")?.Value;
        if (userPermission == requirement.Permission)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
```

Policy registration:

```csharp
services.AddAuthorization(options =>
{
    options.AddPolicy("CanCreateOrders", policy =>
        policy.Requirements.Add(new PermissionRequirement { Permission = "orders:create" }));

    options.AddPolicy("CanDeleteOrders", policy =>
        policy.RequireClaim("department", "sales", "admin"));
});

services.AddSingleton<IAuthorizationHandler, PermissionHandler>();
```

Usage on endpoints:

```csharp
[Authorize(Policy = "CanCreateOrders")]
[HttpPost]
public async Task<ActionResult<OrderDto>> CreateOrder(CreateOrderRequest request)
{
    // ...
}
```

Guidelines:

- Prefer policies over direct `[Authorize(Roles = "...")]` attributes.
- Derive permissions from claims in the token rather than hardcoding roles.
- Use `IAuthorizationService` for resource-based authorization when decisions depend on the data being accessed.

## Inter-Service Authentication

Service-to-service calls must be authenticated. Prefer mTLS or signed JWTs for service identities.

```csharp
public sealed class ServiceIdentityHandler : DelegatingHandler
{
    private readonly ITokenProvider _tokenProvider;

    public ServiceIdentityHandler(ITokenProvider tokenProvider)
    {
        _tokenProvider = tokenProvider;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var token = await _tokenProvider.GetServiceTokenAsync(cancellationToken);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await base.SendAsync(request, cancellationToken);
    }
}
```

Registration:

```csharp
services.AddHttpClient<IInventoryClient, InventoryClient>()
    .AddHttpMessageHandler<ServiceIdentityHandler>();
```

Guidelines:

- Never trust events from external services without validation.
- Use short-lived service tokens rotated automatically.
- Validate service identity in addition to user identity at API boundaries.
- Log authentication failures for security monitoring.

---

## HttpClient & IHttpClientFactory

Use `IHttpClientFactory` for all HTTP calls. It manages `HttpClient` lifetime, avoids socket exhaustion, and supports named/typed clients with middleware pipelines.

### Named Clients

Register named clients for specific downstream services.

```csharp
services.AddHttpClient("inventory", client =>
{
    client.BaseAddress = new Uri("https://inventory-service");
    client.Timeout = TimeSpan.FromSeconds(10);
});
```

Usage:

```csharp
public sealed class InventoryClient
{
    private readonly IHttpClientFactory _factory;

    public InventoryClient(IHttpClientFactory factory)
    {
        _factory = factory;
    }

    public async Task<StockLevel?> GetStockAsync(Guid productId, CancellationToken ct)
    {
        var client = _factory.CreateClient("inventory");
        return await client.GetFromJsonAsync<StockLevel>($"/stock/{productId}", ct);
    }
}
```

### Typed Clients

Prefer typed clients when a service always uses the same configuration.

```csharp
services.AddHttpClient<IInventoryClient, InventoryClient>(client =>
{
    client.BaseAddress = new Uri("https://inventory-service");
    client.Timeout = TimeSpan.FromSeconds(10);
});
```

## DelegatingHandlers

Use `DelegatingHandler` for cross-cutting concerns like logging, retry, or authentication.

```csharp
public sealed class CorrelationIdHandler : DelegatingHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        request.Headers.Add("X-Correlation-Id", Activity.Current?.Id ?? Guid.NewGuid().ToString());
        return await base.SendAsync(request, cancellationToken);
    }
}
```

Registration:

```csharp
services.AddHttpClient<IInventoryClient, InventoryClient>()
    .AddHttpMessageHandler<CorrelationIdHandler>();
```

Guidelines:

- Never create `HttpClient` with `new HttpClient()` directly; always use `IHttpClientFactory`.
- Use typed clients for service-specific wrappers; named clients for ad-hoc calls.
- Keep `DelegatingHandler` stateless and focused on a single concern.
- Configure timeouts per client, not globally.

---

### Distributed Tracing - Middleware

Propagate correlation IDs (`traceparent`, `correlation-id`) across all events and HTTP calls. Include correlation IDs in every log entry and event metadata.

```csharp
public sealed class CorrelationIdMiddleware : IMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var correlationId = context.Request.Headers["X-Correlation-Id"].FirstOrDefault()
            ?? Guid.NewGuid().ToString();

        context.Items["CorrelationId"] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await next(context);
        }
    }
}
```

Event propagation:

```csharp
public sealed record OrderCreatedEvent
{
    public required Guid OrderId { get; init; }
    public required string CorrelationId { get; init; }
}
```

Guidelines:

- Use `ActivitySource` and `Activity` for spans; avoid manual string concatenation.
- Propagate `traceparent` header in HTTP calls and event metadata.
- Include correlation IDs in all structured logs for end-to-end request tracking.
- Use OpenTelemetry exporters to collect traces from all services.

---

## Persistence Guidelines

## Entity Framework Core

Entity Framework Core is the default ORM.

Prefer Fluent API configuration to keep entities clean of persistence concerns.

Keep entity configuration separate from entities in dedicated configuration classes.

**Prefer:**

```csharp
public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Status)
            .HasConversion<string>()
            .HasMaxLength(50);
        builder.HasMany(o => o.Items)
            .WithOne()
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

**Avoid:**

```csharp
public class Order
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty;
}
```

Prefer using compiled queries for frequently executed queries with static shapes:

```csharp
private static readonly Func<AppDbContext, Guid, Order?> GetOrderById =
    EF.CompileQuery((AppDbContext context, Guid orderId) =>
        context.Orders
            .AsNoTracking()
            .FirstOrDefault(o => o.Id == orderId));
```

Preferred folder structure:

```text
Persistence/
├── Configurations/
├── Interceptors/
├── Migrations/
├── Contexts/
├── Factories/
└── Seed/
```

Avoid excessive data annotations. Use Fluent API for all non-trivial configuration.

### Interceptors

Use EF Core interceptors for cross-cutting concerns like auditing, soft deletes, and multi-tenancy.

```csharp
public sealed class AuditingInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var context = eventData.Context;
        if (context is null)
        {
            return base.SavingChangesAsync(eventData, result, cancellationToken);
        }

        foreach (var entry in context.ChangeTracker.Entries<IAuditable>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTimeOffset.UtcNow;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTimeOffset.UtcNow;
            }
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}
```

Registration:

```csharp
services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString)
           .AddInterceptors(new AuditingInterceptor()));
```

Guidelines:

- Keep interceptors focused on a single concern.
- Avoid heavy computation inside interceptors; they run on every `SaveChanges`.
- Use `SaveChangesInterceptor` for auditing and soft deletes.
- Use `CommandInterceptor` for query logging and retry logic.

### Raw SQL

Use raw SQL only when LINQ cannot express the query efficiently or when calling stored procedures.

```csharp
public async Task<List<OrderSummary>> GetOrderSummariesAsync(CancellationToken ct = default)
{
    var sql = """
        SELECT o."Id", o."Status", COUNT(i."Id") AS "ItemCount"
        FROM "Orders" o
        LEFT JOIN "OrderItems" i ON o."Id" = i."OrderId"
        WHERE o."Status" = @status
        GROUP BY o."Id", o."Status"
        """;

    return await _context.Database
        .SqlQuery<OrderSummary>($"{sql}", new NpgsqlParameter("@status", "Pending"))
        .ToListAsync(ct);
}
```

Guidelines:

- Always use parameterized queries; never concatenate user input into SQL strings.
- Prefer LINQ for simple queries; use raw SQL for complex aggregations or window functions.
- Map raw SQL results to DTOs, not entities, to avoid tracking issues.

### Global Query Filters

Apply global filters to automatically scope queries. Common uses include soft deletes and multi-tenancy.

```csharp
public sealed class AppDbContext : DbContext
{
    public int TenantId { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>()
            .HasQueryFilter(o => o.TenantId == TenantId);

        modelBuilder.Entity<Order>()
            .HasQueryFilter(o => !o.IsDeleted);
    }
}
```

Guidelines:

- Use global filters for soft deletes and tenant scoping.
- Override filters explicitly when needed using `IgnoreQueryFilters()`.
- Do not rely on global filters for security-critical access control; validate permissions explicitly.

#### Split Queries

Use `AsSplitQuery()` for queries that join many collections to avoid Cartesian explosion.

```csharp
public async Task<List<Order>> GetOrdersWithItemsAsync(CancellationToken ct = default)
{
    return await _context.Orders
        .AsSplitQuery()
        .Include(o => o.Items)
        .ToListAsync(ct);
}
```

Guidelines:

- Use split queries when including multiple one-to-many relationships.
- Avoid split queries for simple queries with a single join; prefer single-query execution.
- Profile query performance to determine the best strategy.

### Compiled Models

For startup performance improvements, use compiled models to pre-build the EF Core model.

```bash
dotnet ef dbcontext optimize -o Persistence/CompiledModels -n MyApp.Persistence.CompiledModels
```

Registration:

```csharp
services.AddDbContext<AppDbContext>(options =>
    options.UseModel(MyApp.Persistence.CompiledModels.AppDbContextModel.Instance));
```

Guidelines:

- Use compiled models for large models or cold-start-sensitive applications.
- Regenerate compiled models after any model or configuration change.
- Do not use compiled models during active development; enable for production builds.

### DTO Projections via `Select()`

Prefer projecting directly to DTOs using `Select()` over fetching full entities with `Include()` for read-only queries. This reduces data transfer, memory usage, and tracking overhead by querying only the columns the consumer needs.

**Noncompliant:**

```csharp
public async Task<List<OrderDto>> GetOrdersAsync(CancellationToken ct = default)
{
    var orders = await _context.Orders
        .AsNoTracking()
        .Include(o => o.Customer)
        .Include(o => o.Items)
        .ThenInclude(i => i.Product)
        .ToListAsync(ct);

    return orders.Select(o => new OrderDto(
        o.Id,
        o.Customer.Name,
        o.Items.Select(i => i.Product.Name).ToList())).ToList();
}
```

**Compliant:**

```csharp
public async Task<List<OrderDto>> GetOrdersAsync(CancellationToken ct = default)
{
    return await _context.Orders
        .AsNoTracking()
        .Select(o => new OrderDto(
            o.Id,
            o.Customer.Name,
            o.Items.Select(i => i.Product.Name).ToList()))
        .ToListAsync(ct);
}
```

Guidelines:

- Use `Select()` to shape data at the database level whenever possible.
- Avoid `Include()` chains in read queries when the final output is a DTO.
- Project only the fields required by the consumer.

### `AsNoTracking()` for Read-Only Queries

Use `AsNoTracking()` for all queries that do not modify entities. This avoids the overhead of change tracking and identity resolution, improving performance and reducing memory pressure.

**Noncompliant:**

```csharp
public async Task<List<Order>> GetOrdersAsync(CancellationToken ct = default)
{
    return await _context.Orders.ToListAsync(ct);
}
```

**Compliant:**

```csharp
public async Task<List<OrderDto>> GetOrdersAsync(CancellationToken ct = default)
{
    return await _context.Orders
        .AsNoTracking()
        .Select(o => new OrderDto(o.Id, o.Status))
        .ToListAsync(ct);
}
```

Guidelines:

- Use `AsNoTracking()` for all read-only queries.
- Combine with `Select()` projections for maximum efficiency.
- Do not use `AsNoTracking()` when you intend to update the fetched entities.

### Avoiding N+1 Queries

N+1 queries occur when an initial query loads parent entities, and subsequent lazy-loaded queries execute for each related entity inside a loop. Prevent this by using eager loading or, preferably, projecting with `Select()`.

**Noncompliant:**

```csharp
public async Task<List<OrderDto>> GetOrdersAsync(CancellationToken ct = default)
{
    var orders = await _context.Orders.ToListAsync(ct);

    foreach (var order in orders)
    {
        // Executes a separate query for each order
        Console.WriteLine(order.Customer.Name);
    }

    return orders.Select(o => new OrderDto(o.Id, o.Customer.Name)).ToList();
}
```

**Compliant:**

```csharp
public async Task<List<OrderDto>> GetOrdersAsync(CancellationToken ct = default)
{
    return await _context.Orders
        .AsNoTracking()
        .Select(o => new OrderDto(o.Id, o.Customer.Name))
        .ToListAsync(ct);
}
```

Guidelines:

- Do not rely on lazy loading in loops or service-layer logic.
- Prefer `Select()` projections that join and shape data in a single query.
- Use `Include()` only when you genuinely need full entity graphs, and always review generated SQL.

### Migrations Strategy

Use a code-first approach with EF Core migrations. Never manually edit the database schema outside of migrations, and never modify generated migration files to include raw SQL that alters schema unless strictly necessary for data seeding or complex index creation.

Guidelines:

- Generate migrations via `dotnet ef migrations add`.
- Review generated migrations before applying them.
- Use `dotnet ef database update` to apply migrations; never run manual `ALTER TABLE` scripts in production.
- Keep migrations small and focused; split large refactors into multiple migrations.
- Do not modify model snapshots or designer files manually.
- Use `EnsureCreated()` only in integration tests; never in production.

### IEntityTypeConfiguration over OnModelCreating

Register entity configurations via `IEntityTypeConfiguration<T>` classes and apply them in `OnModelCreating` using `ApplyConfigurationsFromAssembly`. This keeps configuration co-located with the entity and prevents `OnModelCreating` from becoming a monolithic method.

**Compliant:**

```csharp
public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Status)
            .HasConversion<string>()
            .HasMaxLength(50);
        builder.HasMany(o => o.Items)
            .WithOne()
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

Registration:

```csharp
public sealed class AppDbContext : DbContext
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
```

Guidelines:

- Create one configuration class per entity.
- Group configurations by entity in the `Persistence/Configurations` folder.
- Avoid putting configuration logic directly in `OnModelCreating`.

### Owned Entities, Complex Types, and Value Objects

EF Core provides owned entities and complex types to model value objects that do not have their own identity. Use these for concepts like addresses, money, or contact details that are intrinsically part of an aggregate root.

**Complex Types (EF Core 8+):**

```csharp
public sealed record Money
{
    public required decimal Amount { get; init; }
    public required string Currency { get; init; }
}

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ComplexProperty(o => o.Total, total =>
        {
            total.Property(t => t.Amount).HasColumnName("TotalAmount");
            total.Property(t => t.Currency).HasColumnName("TotalCurrency");
        });
    }
}
```

**Owned Entities:**

```csharp
public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.OwnsOne(o => o.ShippingAddress, address =>
        {
            address.Property(a => a.Street).HasColumnName("ShippingStreet");
            address.Property(a => a.City).HasColumnName("ShippingCity");
        });
    }
}
```

Guidelines:

- Use **complex types** when the value object is immutable and never shared between aggregates. Complex types do not require a separate key and map columns directly into the owning table.
- Use **owned entities** when the value object contains collections or requires relationship semantics, or when you may later need to transition it to a standalone entity.
- Prefer C# `record` types for value objects to enforce immutability and value-based equality.
- Never expose owned entity or complex type collections as mutable lists; use `IReadOnlyCollection<T>`.
- Do not query owned entities independently; they are always accessed through the aggregate root.

### Avoid Loading Large Graphs Unnecessarily

Fetching large entity graphs with multiple `Include()` and `ThenInclude()` calls is a common source of performance degradation. It increases memory usage, tracking overhead, and the risk of Cartesian explosion from SQL joins.

**Noncompliant:**

```csharp
public async Task<Order?> GetOrderAsync(Guid id, CancellationToken ct = default)
{
    return await _context.Orders
        .Include(o => o.Customer)
        .ThenInclude(c => c.Address)
        .Include(o => o.Items)
        .ThenInclude(i => i.Product)
        .ThenInclude(p => p.Supplier)
        .Include(o => o.Notes)
        .Include(o => o.AuditLog)
        .FirstOrDefaultAsync(o => o.Id == id, ct);
}
```

**Compliant:**

```csharp
public async Task<OrderDto?> GetOrderAsync(Guid id, CancellationToken ct = default)
{
    return await _context.Orders
        .AsNoTracking()
        .Where(o => o.Id == id)
        .Select(o => new OrderDto(
            o.Id,
            new CustomerSummary(o.Customer.Name, o.Customer.Email),
            o.Items.Select(i => new OrderItemDto(i.Product.Name, i.Quantity, i.UnitPrice)).ToList()))
        .FirstOrDefaultAsync(ct);
}
```

Guidelines:

- Avoid deep `Include()` chains; they load far more data than necessary.
- Use `Select()` to fetch only the fields required for the DTO.
- If multiple related collections are genuinely needed, consider `AsSplitQuery()` as a tactical fallback, but prefer projection.
- Keep query shapes simple; offload complex aggregation to raw SQL or dedicated read models when necessary.

---

## Testing Standards

## Frameworks

Preferred stack:

- NUnit
- FluentAssertions
- Moq
- Testcontainers

---

## Test Naming

Use:

```text
Method_Should_ExpectedOutcome_When_Condition
```

Example:

```text
CreateUser_Should_ReturnUser_When_RequestIsValid
```

---

## Test Philosophy

Test behaviour rather than implementation details.

**Noncompliant:**

```csharp
[Test]
public void ProcessOrder_CallsRepositorySave()
{
    var mockRepo = new Mock<IOrderRepository>();
    var service = new OrderService(mockRepo.Object);

    service.ProcessOrder(Guid.NewGuid());

    mockRepo.Verify(r => r.Save(It.IsAny<Order>()), Times.Once);
}
```

**Compliant:**

```csharp
[Test]
public void ProcessOrder_Should_MarkOrderAsProcessed_When_OrderIsPending()
{
    var order = new Order(Guid.NewGuid());
    var service = new OrderService(new InMemoryOrderRepository());

    var result = service.ProcessOrder(order.Id);

    result.Status.Should().Be(OrderStatus.Processed);
}
```

Prefer testing public behaviour over private implementation. Tests should remain stable when internal refactoring occurs.

## Test Structure

### Arrange, Act, Assert

Structure every test in three distinct phases separated by a blank line.

- **Arrange** — set up dependencies, test data, and the system under test.
- **Act** — invoke the single operation being tested.
- **Assert** — verify the expected outcome.

```csharp
[Test]
public void CreateUser_Should_ReturnUser_When_RequestIsValid()
{
    // Arrange
    var request = new CreateUserRequest("test@example.com", "SecureP@ss123");
    var sut = new UserService(new InMemoryUserRepository());

    // Act
    var result = sut.CreateUser(request);

    // Assert
    result.Should().NotBeNull();
    result.Email.Should().Be("test@example.com");
}
```

#### System Under Test

Name the variable holding the class being tested `sut`. This makes the target of the test immediately obvious.

```csharp
[Test]
public void CancelOrder_Should_SetStatusToCancelled_When_OrderIsPending()
{
    var order = new Order(Guid.NewGuid());
    var sut = new OrderService(new InMemoryOrderRepository());

    sut.Cancel(order.Id);

    order.Status.Should().Be(OrderStatus.Cancelled);
}
```

## Unit Testing

- Test one concern per test.
- Use factory methods or builders for test data setup.
- Avoid shared mutable state between tests.
- Mock external dependencies at service boundaries only.
- Prefer fakes and in-memory implementations over mocks for repositories and external clients.
- Do not test internal implementation details; test observable behaviour and outcomes.
- Keep unit tests fast and isolated; they should not require a database, file system, or network.

```csharp
public static class TestData
{
    public static User CreateUser(string email = "test@example.com")
    {
        return new User(Guid.NewGuid(), email);
    }
}
```

### Reusable Mock Objects

Prefer creating typed mock classes over inline `Mock<T>` setup. This centralises mock configuration and keeps tests readable.

```csharp
public interface IMockBase<T> where T : class
{
    T Mock();
}
```

```csharp
public class BusMock : Mock<IBus>, IMockBase<BusMock>
{
    public BusMock()
    {
        Setup(m => m.PublishAsync(It.IsAny<IEvent>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
    }

    public BusMock Mock()
    {
        return this;
    }
}
```

Usage in tests:

```csharp
[Test]
public async Task ProcessOrder_Should_PublishEvent_When_OrderIsCreated()
{
    var bus = new BusMock().Mock();
    var service = new OrderService(bus.Object);

    await service.CreateOrderAsync(new CreateOrderRequest());

    bus.Verify(m => m.PublishAsync(It.Is<OrderCreatedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
}
```

Guidelines:

- Derive from `Mock<T>` and implement `IMockBase<T>` for consistent setup patterns.
- Configure default behaviours in the mock constructor.
- Expose the mock object via `Object` for injection into the service under test.
- Keep mock classes focused on a single dependency.

## Integration Testing

### Custom WebApplicationFactory

Create a custom factory to override DI registrations (e.g., replace real message brokers with test doubles) and start Testcontainers.

```csharp
public sealed class CustomWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram>
    where TProgram : class
{
    private PostgreSqlContainer? _postgres;

    public string ConnectionString => _postgres?.GetConnectionString() ?? string.Empty;

    public void StartTestContainer()
    {
        _postgres = new PostgreSqlBuilder().Build();
        _postgres.StartAsync().GetAwaiter().GetResult();
    }

    public void StopTestContainer()
    {
        _postgres?.DisposeAsync().AsTask().GetAwaiter().GetResult();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(ConnectionString));
        });
    }
}
```

#### Shared Test Fixture

Use a generic test fixture for NUnit that creates the factory once per test run and provides a shared `HttpClient`.

```csharp
[TestFixture]
public class TestFixture<TProgram> where TProgram : class
{
    public CustomWebApplicationFactory<TProgram> WebApplicationFactory { get; private set; } = null!;
    public HttpClient Client { get; private set; } = null!;

    [OneTimeSetUp]
    public void OneTimeSetUp()
    {
        WebApplicationFactory = new CustomWebApplicationFactory<TProgram>();
        WebApplicationFactory.StartTestContainer();
        Client = WebApplicationFactory.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = true,
            HandleCookies = true
        });
    }

    [OneTimeTearDown]
    public void OneTimeTearDown()
    {
        Client?.Dispose();
        WebApplicationFactory.StopTestContainer();
        WebApplicationFactory.Dispose();
    }
}
```

### Usage in Test Classes

```csharp
[TestFixture]
public class OrdersApiTests : TestFixture<Program>
{
    [Test]
    public async Task CreateOrder_Should_Return201_When_RequestIsValid()
    {
        var response = await Client.PostAsJsonAsync("/orders", new { CustomerId = Guid.NewGuid() });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
```

Guidelines:

- Keep integration tests focused on infrastructure and boundary behaviour, not domain logic.
- Reset database state between tests to avoid leakage.
- Use `OneTimeSetUp` / `OneTimeTearDown` for expensive shared resources like Testcontainers.
- Contract tests should validate message shapes and expected responses, not internal implementations.

## Architecture Testing

Prevent architectural drift by encoding layer dependency rules as automated tests.

```csharp
[Test]
public void Domain_Should_Not_Depend_On_Infrastructure()
{
    ArchRuleAssert.FailureReportOf(
        Types().That().ResideInNamespace("MyApp.Domain")
            .Should().NotDependOnAny(
                Types().That().ResideInNamespace("MyApp.Infrastructure")))
        .Check(Architecture);
}
```

Guidelines:

- Use ArchUnitNET or TngTech.ArchUnit to enforce dependency direction.
- Run architecture tests in CI on every build.
- Enforce that `Domain` does not reference `Application`, `Infrastructure`, or `Api`.
- Verify that feature folders do not create circular dependencies.
- Treat architecture tests as first-class tests; they should fail the build on violation.

---

### Security Standards

- Validate all external input.
- Use parameterized database queries.
- Never log secrets.
- Never store secrets in source control.
- Prefer least-privilege access.
- Use framework-provided authentication and authorization features.

## Input Validation

Always validate and sanitize input at service boundaries.

```csharp
public sealed class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(ValidationLimits.MaxEmailLength);

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(12);
    }
}
```

### Secrets Management

Never hardcode secrets. Use the options pattern with environment-specific configuration.

```csharp
public sealed class DatabaseOptions
{
    public required string ConnectionString { get; init; }
}

public sealed class ConfigureDatabaseOptions : IConfigureOptions<DatabaseOptions>
{
    public void Configure(DatabaseOptions options)
    {
        // Bind from configuration; actual value comes from environment variables or secret stores
    }
}
```

## Inter-Service Security

- Authenticate and authorize service-to-service communication.
- Prefer mTLS or signed JWTs for service identities.
- Never trust events from external services without validation.
- Sanitize all data from integration events before processing.

```csharp
public sealed class IntegrationEventValidator<T> : IEventValidator<T> where T : IIntegrationEvent
{
    public ValidationResult Validate(T @event)
    {
        // Validate event schema, signature, and required fields
        // Reject events that do not conform to the expected contract
    }
}
```

---

## Metrics & OpenTelemetry

Use `IMeterFactory` and `System.Diagnostics.Metrics` for application metrics. Instrument code with counters, histograms, and gauges, then export via OpenTelemetry.

## Counters

Counters are for counting monotonically increasing values such as requests processed or orders created.

```csharp
public sealed class OrderMetrics
{
    private readonly Counter<int> _ordersCreated;

    public OrderMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("OrderMetrics");
        _ordersCreated = meter.CreateCounter<int>("orders.created", description: "Number of orders created");
    }

    public void OrderCreated()
    {
        _ordersCreated.Add(1);
    }
}
```

## Histograms

Histograms measure distributions such as request duration or order value.

```csharp
public sealed class OrderMetrics
{
    private readonly Histogram<double> _orderValue;

    public OrderMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("OrderMetrics");
        _orderValue = meter.CreateHistogram<double>("order.value", unit: "GBP", description: "Order value distribution");
    }

    public void RecordOrderValue(decimal value)
    {
        _orderValue.Record((double)value);
    }
}
```

## Observability Pipeline

Configure OpenTelemetry to export traces and metrics to your observability backend.

```csharp
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing.AddAspNetCoreInstrumentation()
               .AddHttpClientInstrumentation()
               .AddSource("OrderMetrics")
               .AddOtlpExporter();
    })
    .WithMetrics(metrics =>
    {
        metrics.AddAspNetCoreInstrumentation()
               .AddHttpClientInstrumentation()
               .AddMeter("OrderMetrics")
               .AddOtlpExporter();
    });
```

Guidelines:

- Use `IMeterFactory` rather than creating `Meter` instances directly; it respects DI scoping and disposal.
- Name meters with the service or feature they represent.
- Add units and descriptions to instruments for clarity in dashboards.
- Export via OTLP for vendor-agnostic observability.
- Do not log metrics; emit them through `Meter` instruments.

---

## SonarQube Overview

All code must pass SonarQube analysis. The following sections catalogue the SonarQube C# rules organized by type: **Bugs**, **Vulnerabilities**, **Code Smells**, and **Security Hotspots**. Each rule includes a severity, a description, a noncompliant example, and the preferred compliant solution. Agents must ensure generated code adheres to these rules.

---

## Bugs

Rules that detect coding mistakes resulting in unexpected behaviour or crashes.

### S2583: Conditionally executed code should be reachable

**Severity:** Blocker  
**Description:** Code inside a conditional block that will never be executed indicates a logical error. The condition is always `true` or `false` given the current state, making the branch unreachable.

**Noncompliant:**

```csharp
public int Compute(int value)
{
    var result = value * 2;

    if (result > 0)
    {
        return result;
    }

    // This will never execute when value is positive
    if (result == 0)
    {
        return -1;
    }

    return 0;
}
```

**Compliant:**

```csharp
public int Compute(int value)
{
    var result = value * 2;

    if (result > 0)
    {
        return result;
    }

    if (result == 0)
    {
        return -1;
    }

    return 0;
}
```

---

### S2589: Boolean expressions should not be gratuitous

**Severity:** Major  
**Description:** Boolean expressions that are always `true` or always `false` are dead code and usually indicate a logical error.

**Noncompliant:**

```csharp
public void Process(string value)
{
    if (value is not null && value is not null)
    {
        // Redundant null check
    }
}
```

**Compliant:**

```csharp
public void Process(string value)
{
    if (value is not null)
    {
        // Single null check is sufficient
    }
}
```

---

### S1764: Identical expressions should not be used on both sides of a binary operator

**Severity:** Critical  
**Description:** Using the same variable on both sides of an operator (`a == a`, `a - a`) is either a mistake or pointless and should be removed.

**Noncompliant:**

```csharp
public int Calculate(int a, int b)
{
    return a - a; // Always 0
}
```

**Compliant:**

```csharp
public int Calculate(int a, int b)
{
    return a - b;
}
```

---

### S1145: Useless `if(true)` and `if(false)` checks should be removed

**Severity:** Major  
**Description:** Conditions that are hard-coded to `true` or `false` are dead code and should be simplified.

**Noncompliant:**

```csharp
public void DoWork()
{
    if (true)
    {
        Console.WriteLine("Always prints");
    }
}
```

**Compliant:**

```csharp
public void DoWork()
{
    Console.WriteLine("Always prints");
}
```

---

### S2184: Casting should not be performed on operands of a division before the division is performed

**Severity:** Major  
**Description:** Casting an operand to a narrower type before division can cause truncation and incorrect results. Cast the result of the division instead.

**Noncompliant:**

```csharp
public double GetAverage(int total, int count)
{
    return (double)total / count; // Fine
    return (double)(total / count); // Bug: integer division happens first
}
```

**Compliant:**

```csharp
public double GetAverage(int total, int count)
{
    return (double)total / count;
}
```

---

### S2187: TestCases should be defined for generic test classes

**Severity:** Critical  
**Description:** Generic test classes without concrete `TestCase` type arguments cannot be instantiated by test runners.

**Noncompliant:**

```csharp
public class GenericTests<T> { }
```

**Compliant:**

```csharp
[TestFixture(typeof(string))]
public class StringTests<T> { }
```

---

### S2197: Modulus results should not be checked for direct equality

**Severity:** Major  
**Description:** Checking `x % y == z` when `z` is not `0` or `y-1` is suspicious because modulus results are bounded to `[0, y-1]`.

**Noncompliant:**

```csharp
public bool IsValid(int value)
{
    return value % 2 == 3; // Always false
}
```

**Compliant:**

```csharp
public bool IsValid(int value)
{
    return value % 2 == 1;
}
```

---

### S2201: Return values from `System.Linq.Enumerable` should not be ignored

**Severity:** Major  
**Description:** LINQ methods return a new sequence and do not modify the source. Ignoring the return value means the operation had no effect.

**Noncompliant:**

```csharp
public void Filter(List<int> items)
{
    items.Where(x => x > 0); // Result is discarded
}
```

**Compliant:**

```csharp
public List<int> Filter(List<int> items)
{
    return items.Where(x => x > 0).ToList();
}
```

---

### S2259: Null pointers should not be dereferenced

**Severity:** Blocker  
**Description:** Dereferencing a variable that is known to be `null` will cause a `NullReferenceException`.

**Noncompliant:**

```csharp
public int GetLength(string value)
{
    if (value is null)
    {
        return 0;
    }

    return value.Length; // If null check is removed elsewhere, this crashes
}
```

**Compliant:**

```csharp
public int GetLength(string value)
{
    return value?.Length ?? 0;
}
```

---

### S2757: `=+` should not be used instead of `+=`

**Severity:** Critical  
**Description:** Writing `a =+ b` assigns the unary-positive of `b` to `a` instead of adding `b` to `a`.

**Noncompliant:**

```csharp
public void Accumulate(int total, int value)
{
    total =+ value; // Bug: equivalent to total = +value
}
```

**Compliant:**

```csharp
public void Accumulate(int total, int value)
{
    total += value;
}
```

---

### S3168: `async` methods should not return `void`

**Severity:** Critical  
**Description:** `async void` methods cannot be awaited and exceptions thrown inside them crash the process.

**Noncompliant:**

```csharp
public async void ProcessAsync()
{
    await Task.Delay(100);
}
```

**Compliant:**

```csharp
public async Task ProcessAsync()
{
    await Task.Delay(100);
}
```

---

### S3172: `GetHashCode` should not reference mutable fields

**Severity:** Critical  
**Description:** If a field used in `GetHashCode` changes while the object is stored in a hash-based collection, the object becomes unreachable.

**Noncompliant:**

```csharp
public class User
{
    public string Name { get; set; }

    public override int GetHashCode()
    {
        return Name.GetHashCode();
    }
}
```

**Compliant:**

```csharp
public sealed class User
{
    public required string Name { get; init; }

    public override int GetHashCode()
    {
        return Name.GetHashCode();
    }
}
```

---

### S3215: `GetType()` should not be called on `System.Type` instances

**Severity:** Major  
**Description:** Calling `GetType()` on a `System.Type` instance returns `typeof(Type)` rather than the represented type.

**Noncompliant:**

```csharp
public bool IsString(Type type)
{
    return type.GetType() == typeof(string); // Always false
}
```

**Compliant:**

```csharp
public bool IsString(Type type)
{
    return type == typeof(string);
}
```

---

### S3244: Anonymous delegates should not be used to unsubscribe from events

**Severity:** Major  
**Description:** Unsubscribing an anonymous delegate that is not the exact same instance does nothing.

**Noncompliant:**

```csharp
eventHandler -= (s, e) => { };
```

**Compliant:**

```csharp
EventHandler handler = (s, e) => { };
eventHandler += handler;
eventHandler -= handler;
```

---

### S3443: `Format` strings should be used correctly

**Severity:** Major  
**Description:** Passing a composite format string as an argument to another `string.Format` can cause incorrect placeholder indexing.

**Noncompliant:**

```csharp
public string BuildMessage(string name)
{
    return string.Format("Name: {0}", string.Format("User: {0}", name));
}
```

**Compliant:**

```csharp
public string BuildMessage(string name)
{
    return $"Name: User: {name}";
}
```

---

### S3464: `Assembly.GetCallingAssembly()` should not be used in `async` methods

**Severity:** Major  
**Description:** In `async` methods, the calling assembly is the framework rather than the expected caller.

**Noncompliant:**

```csharp
public async Task DoWorkAsync()
{
    var caller = Assembly.GetCallingAssembly();
}
```

**Compliant:**

```csharp
public void DoWork()
{
    var caller = Assembly.GetCallingAssembly();
}
```

---

### S3655: `Nullable` value should be accessed only when it is known to be non-null

**Severity:** Blocker  
**Description:** Accessing `Value` on a nullable when it is known to be null throws `InvalidOperationException`.

**Noncompliant:**

```csharp
public int GetValue(int? value)
{
    if (value is null)
    {
        return value.Value; // Throws
    }

    return 0;
}
```

**Compliant:**

```csharp
public int GetValue(int? value)
{
    return value ?? 0;
}
```

---

### S3880: `NetDataContractSerializer` should not be used

**Severity:** Blocker  
**Description:** This serializer is insecure and can execute arbitrary code during deserialization.

**Noncompliant:**

```csharp
var serializer = new NetDataContractSerializer();
```

**Compliant:**

```csharp
var serializer = new DataContractSerializer(typeof(MyType));
```

---

### S3984: `Exception` should not be created without being thrown

**Severity:** Major  
**Description:** Creating an exception but not throwing it is almost always a mistake.

**Noncompliant:**

```csharp
public void Validate(string value)
{
    if (value is null)
    {
        new ArgumentNullException(nameof(value));
    }
}
```

**Compliant:**

```csharp
public void Validate(string value)
{
    ArgumentNullException.ThrowIfNull(value);
}
```

---

### S4143: Collection elements should not be replaced unconditionally

**Severity:** Major  
**Description:** Adding an item to a dictionary with the same key twice means the second write overwrites the first unconditionally.

**Noncompliant:**

```csharp
var map = new Dictionary<string, int>();
map["key"] = 1;
map["key"] = 2; // First assignment is lost
```

**Compliant:**

```csharp
var map = new Dictionary<string, int>();
map["key"] = 2;
```

---

### S4462: `Task.Wait` should not be called in an `async` method

**Severity:** Major  
**Description:** Calling `Task.Wait` or `Task.Result` in an async method causes a deadlock in many contexts and defeats the purpose of `async`/`await`.

**Noncompliant:**

```csharp
public async Task ProcessAsync()
{
    var task = DoWorkAsync();
    task.Wait(); // Deadlock risk
}
```

**Compliant:**

```csharp
public async Task ProcessAsync()
{
    await DoWorkAsync();
}
```

---

### S4581: `new Guid()` should not be used

**Severity:** Critical  
**Description:** `new Guid()` creates an all-zero GUID, which is almost never the intended behaviour.

**Noncompliant:**

```csharp
var id = new Guid();
```

**Compliant:**

```csharp
var id = Guid.NewGuid();
```

---

### S6612: The value of `bool` should not be negated more than once

**Severity:** Major  
**Description:** Multiple negations of a boolean are confusing and error-prone.

**Noncompliant:**

```csharp
public bool IsNotInactive(bool active)
{
    return !!!active;
}
```

**Compliant:**

```csharp
public bool IsNotInactive(bool active)
{
    return !active;
}
```

---

### S6613: Casting to `float` should not be done before calling `Math.Floor`

**Severity:** Major  
**Description:** Casting to `float` before `Math.Floor` loses precision. Use `Math.Floor(double)` or `MathF.Floor(float)`.

**Noncompliant:**

```csharp
public int Round(float value)
{
    return (int)Math.Floor((double)value);
}
```

**Compliant:**

```csharp
public int Round(float value)
{
    return (int)MathF.Floor(value);
}
```

---

## Vulnerabilities

Rules that detect security weaknesses that can be exploited by attackers.

### S3329: Cipher Block Chaining IVs should be unpredictable

**Severity:** Blocker  
**Description:** Using a predictable or hardcoded IV in CBC mode encryption makes the ciphertext vulnerable to attacks.

**Noncompliant:**

```csharp
public byte[] Encrypt(byte[] data, byte[] key)
{
    var iv = new byte[16]; // All zeros
    using var aes = Aes.Create();
    aes.IV = iv;
    aes.Key = key;
    // ...
}
```

**Compliant:**

```csharp
public byte[] Encrypt(byte[] data, byte[] key)
{
    using var aes = Aes.Create();
    aes.Key = key;
    aes.GenerateIV();
    // ...
}
```

---

### S3330: Server-side requests should not be vulnerable to SSRF attacks

**Severity:** Blocker  
**Description:** Server-Side Request Forgery occurs when user input is used to construct a request to an internal or external resource without validation.

**Noncompliant:**

```csharp
public async Task<string> FetchData(string url)
{
    using var client = new HttpClient();
    return await client.GetStringAsync(url);
}
```

**Compliant:**

```csharp
public async Task<string> FetchData(string url)
{
    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
        || uri.Host != "allowed.example.com")
    {
        throw new ArgumentException("Invalid URL");
    }

    using var client = new HttpClient();
    return await client.GetStringAsync(uri);
}
```

---

### S4423: Weak SSL/TLS protocols should not be used

**Severity:** Blocker  
**Description:** Using SSL 3.0, TLS 1.0, or TLS 1.1 exposes the application to known cryptographic attacks.

**Noncompliant:**

```csharp
var handler = new HttpClientHandler
{
    SslProtocols = SslProtocols.Tls
};
```

**Compliant:**

```csharp
var handler = new HttpClientHandler
{
    SslProtocols = SslProtocols.Tls13
};
```

---

### S4426: Cryptographic keys should not be too short

**Severity:** Blocker  
**Description:** Short keys are vulnerable to brute-force attacks. Use at least 2048-bit RSA or 256-bit elliptic curve keys.

**Noncompliant:**

```csharp
using var rsa = RSA.Create(1024);
```

**Compliant:**

```csharp
using var rsa = RSA.Create(2048);
```

---

### S4428: TempFileCollection should not be used

**Severity:** Major  
**Description:** `TempFileCollection` can create files with weak permissions. Use `Path.GetTempFileName` with explicit cleanup.

**Noncompliant:**

```csharp
var tempFiles = new TempFileCollection();
```

**Compliant:**

```csharp
var tempPath = Path.GetTempFileName();
try
{
    // Use file
}
finally
{
    File.Delete(tempPath);
}
```

---

### S4784: Using regular expressions is security-sensitive

**Severity:** Critical  
**Description:** Regular expressions can be vulnerable to ReDoS (Regular Expression Denial of Service) if user input is used without validation.

**Noncompliant:**

```csharp
public bool IsValidEmail(string email)
{
    return Regex.IsMatch(email, @"^.*@.*$");
}
```

**Compliant:**

```csharp
public bool IsValidEmail(string email)
{
    if (email.Length > 254)
    {
        return false;
    }

    return Regex.IsMatch(email, @"^[^@]+@[^@]+$", RegexOptions.None, TimeSpan.FromMilliseconds(100));
}
```

---

### S4787: Cryptographic keys should not be hardcoded

**Severity:** Blocker  
**Description:** Hardcoded keys are exposed in source control and binaries. Use key management services or configuration.

**Noncompliant:**

```csharp
private static readonly byte[] Key = Encoding.UTF8.GetBytes("hardcoded-key-1234");
```

**Compliant:**

```csharp
private readonly byte[] _key;

public CryptoService(IOptions<CryptoOptions> options)
{
    _key = Convert.FromBase64String(options.Value.Key);
}
```

---

### S4790: Hashing data is security-sensitive

**Severity:** Critical  
**Description:** Weak hash algorithms like MD5 or SHA-1 are vulnerable to collision attacks. Use SHA-256 or stronger.

**Noncompliant:**

```csharp
public byte[] Hash(string input)
{
    using var md5 = MD5.Create();
    return md5.ComputeHash(Encoding.UTF8.GetBytes(input));
}
```

**Compliant:**

```csharp
public byte[] Hash(string input)
{
    using var sha256 = SHA256.Create();
    return sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
}
```

---

### S4818: Sockets should not be used in production code without proper validation

**Severity:** Major  
**Description:** Raw socket access can bypass security controls. Validate all endpoints and use TLS.

**Noncompliant:**

```csharp
var client = new TcpClient();
await client.ConnectAsync("untrusted.com", 80);
```

**Compliant:**

```csharp
// Use HttpClient with validated URLs over TLS
```

---

### S5324: `Random` should not be used for security-sensitive purposes

**Severity:** Blocker  
**Description:** `System.Random` is predictable and should never be used for cryptography, tokens, or passwords.

**Noncompliant:**

```csharp
public string GenerateToken()
{
    var random = new Random();
    return random.Next().ToString();
}
```

**Compliant:**

```csharp
public string GenerateToken()
{
    var bytes = new byte[32];
    RandomNumberGenerator.Fill(bytes);
    return Convert.ToHexString(bytes);
}
```

---

### S5542: Encryption algorithms should be used with secure mode and padding scheme

**Severity:** Blocker  
**Description:** Using ECB mode or no padding exposes the ciphertext to attacks. Use CBC or GCM with proper IVs.

**Noncompliant:**

```csharp
using var aes = Aes.Create();
aes.Mode = CipherMode.ECB;
```

**Compliant:**

```csharp
using var aes = Aes.Create();
aes.Mode = CipherMode.CBC;
aes.GenerateIV();
```

---

### S5547: Cipher algorithms should be robust

**Severity:** Blocker  
**Description:** Weak or broken algorithms like DES, RC2, or TripleDES should not be used.

**Noncompliant:**

```csharp
using var des = DES.Create();
```

**Compliant:**

```csharp
using var aes = Aes.Create();
```

---

### S5659: SSL/TLS connection settings should not be bypassed

**Severity:** Blocker  
**Description:** Disabling certificate validation exposes the application to man-in-the-middle attacks.

**Noncompliant:**

```csharp
ServicePointManager.ServerCertificateValidationCallback = (sender, cert, chain, errors) => true;
```

**Compliant:**

```csharp
// Use default certificate validation
```

---

### S5773: Types allowed to be deserialized should be limited

**Severity:** Blocker  
**Description:** Deserializing arbitrary types can lead to remote code execution. Whitelist allowed types.

**Noncompliant:**

```csharp
var formatter = new BinaryFormatter();
var obj = formatter.Deserialize(stream);
```

**Compliant:**

```csharp
// Use JSON deserialization with type constraints
// or BinaryFormatter with a SerializationBinder whitelist
```

---

### S6419: Cryptographic keys should not be too short for the algorithm

**Severity:** Blocker  
**Description:** Using AES-128 is acceptable, but AES-256 is preferred. Using shorter keys than the algorithm supports causes vulnerabilities.

**Noncompliant:**

```csharp
using var aes = Aes.Create();
aes.KeySize = 64;
```

**Compliant:**

```csharp
using var aes = Aes.Create();
aes.KeySize = 256;
```

---

---

## Code Smells

Rules that detect maintainability issues, suspicious coding practices, and patterns that may lead to bugs or make code harder to understand and maintain.

### S1075: URIs should not be hardcoded

**Severity:** Minor  
**Description:** Hardcoded URIs make the application inflexible and can expose internal endpoints in source control.

**Noncompliant:**

```csharp
public string GetApiUrl()
{
    return "https://api.example.com/v1/users";
}
```

**Compliant:**

```csharp
public string GetApiUrl(IOptions<ApiOptions> options)
{
    return options.Value.BaseUrl;
}
```

---

#### S1116: Empty statements should be removed

**Severity:** Minor  
**Description:** A stray semicolon creates an empty statement that can hide bugs and confuse readers.

**Noncompliant:**

```csharp
public void DoWork();
{
    Console.WriteLine("work");
}
```

**Compliant:**

```csharp
public void DoWork()
{
    Console.WriteLine("work");
}
```

---

#### S1121: Assignments should not be made from within sub-expressions

**Severity:** Major  
**Description:** Embedding an assignment inside another expression makes the code harder to read and can hide bugs.

**Noncompliant:**

```csharp
public bool TryParse(string input)
{
    int value;
    return int.TryParse(input, out value);
}
```

**Compliant:**

```csharp
public bool TryParse(string input, out int value)
{
    return int.TryParse(input, out value);
}
```

---

#### S1125: Boolean literals should not be redundant

**Severity:** Minor  
**Description:** Expressions like `x == true` or `y == false` are redundant and should be simplified.

**Noncompliant:**

```csharp
public bool IsValid(bool flag)
{
    return flag == true;
}
```

**Compliant:**

```csharp
public bool IsValid(bool flag)
{
    return flag;
}
```

---

#### S1134: Track uses of `TODO` tags

**Severity:** Info  
**Description:** `TODO` comments indicate incomplete work. They should be tracked and resolved before merging.

**Noncompliant:**

```csharp
// TODO: implement validation
public void Process() { }
```

**Compliant:**

```csharp
public void Process()
{
    // Validation implemented
}
```

---

#### S1135: Track uses of `FIXME` tags

**Severity:** Info  
**Description:** `FIXME` comments indicate known defects. They should be tracked and resolved before merging.

**Noncompliant:**

```csharp
// FIXME: this breaks under load
public void Process() { }
```

**Compliant:**

```csharp
public void Process()
{
    // Fixed and load-tested
}
```

---

#### S1147: Exit methods should not be called

**Severity:** Major  
**Description:** Calling `Environment.Exit` or `Process.Kill` inside a library or web application abruptly terminates the process and loses data.

**Noncompliant:**

```csharp
public void Shutdown()
{
    Environment.Exit(1);
}
```

**Compliant:**

```csharp
public void Shutdown(ILifetime lifetime)
{
    lifetime.StopApplication();
}
```

---

#### S1155: `Any()` should be used to test for emptiness

**Severity:** Minor  
**Description:** `Count() > 0` or `Count() == 0` is less efficient and less readable than `Any()` or `!Any()`.

**Noncompliant:**

```csharp
public bool HasItems(IEnumerable<int> items)
{
    return items.Count() > 0;
}
```

**Compliant:**

```csharp
public bool HasItems(IEnumerable<int> items)
{
    return items.Any();
}
```

---

#### S1168: Empty arrays and collections should be returned instead of `null`

**Severity:** Major  
**Description:** Returning `null` for a collection forces every caller to add a null check. Return an empty collection instead.

**Noncompliant:**

```csharp
public List<int> GetItems()
{
    return null;
}
```

**Compliant:**

```csharp
public List<int> GetItems()
{
    return [];
}
```

---

#### S1172: Unused method parameters should be removed

**Severity:** Minor  
**Description:** Parameters that are never used add noise to the API and confuse callers.

**Noncompliant:**

```csharp
public int Add(int a, int b, int unused)
{
    return a + b;
}
```

**Compliant:**

```csharp
public int Add(int a, int b)
{
    return a + b;
}
```

---

#### S1186: Methods should not be empty

**Severity:** Major  
**Description:** Empty methods serve no purpose and should either be implemented or removed.

**Noncompliant:**

```csharp
public void Validate()
{
}
```

**Compliant:**

```csharp
public void Validate()
{
    ArgumentNullException.ThrowIfNull(_value);
}
```

---

#### S1199: Nested code blocks should not be used

**Severity:** Minor  
**Description:** Unnecessary nested blocks create unnecessary scope and confuse readers.

**Noncompliant:**

```csharp
public void Process()
{
    {
        var value = 1;
    }
}
```

**Compliant:**

```csharp
public void Process()
{
    var value = 1;
}
```

---

#### S1226: Method parameters should not be reassigned

**Severity:** Major  
**Description:** Reassigning a parameter inside a method makes the code harder to follow.

**Noncompliant:**

```csharp
public int Compute(int value)
{
    value = value * 2;
    return value;
}
```

**Compliant:**

```csharp
public int Compute(int value)
{
    var result = value * 2;
    return result;
}
```

---

#### S125: Sections of code should not be commented out

**Severity:** Major  
**Description:** Commented-out code clutters the file and is not maintained. Remove it or use version control.

**Noncompliant:**

```csharp
// public void OldMethod()
// {
//     Console.WriteLine("old");
// }
```

**Compliant:**

```csharp
// Code removed; see git history if needed.
```

---

#### S131: `switch` statements should have a `default` clause

**Severity:** Major  
**Description:** A `switch` without `default` may silently miss cases when new enum values are added.

**Noncompliant:**

```csharp
public string GetLabel(Status status)
{
    switch (status)
    {
        case Status.Active:
            return "Active";
        case Status.Inactive:
            return "Inactive";
    }

    return string.Empty;
}
```

**Compliant:**

```csharp
public string GetLabel(Status status)
{
    return status switch
    {
        Status.Active => "Active",
        Status.Inactive => "Inactive",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };
}
```

---

#### S1481: Unused local variables should be removed

**Severity:** Minor  
**Description:** Declared variables that are never used create noise and may indicate incomplete logic.

**Noncompliant:**

```csharp
public void Process()
{
    var value = 1;
    Console.WriteLine("done");
}
```

**Compliant:**

```csharp
public void Process()
{
    Console.WriteLine("done");
}
```

---

#### S1643: Strings should not be concatenated using `+` in a loop

**Severity:** Minor  
**Description:** Repeated string concatenation in a loop creates many intermediate string objects. Use `StringBuilder`.

**Noncompliant:**

```csharp
public string BuildString(List<string> parts)
{
    var result = "";
    foreach (var part in parts)
    {
        result += part;
    }

    return result;
}
```

**Compliant:**

```csharp
public string BuildString(List<string> parts)
{
    var builder = new StringBuilder();
    foreach (var part in parts)
    {
        builder.Append(part);
    }

    return builder.ToString();
}
```

---

#### S1854: Unused assignments should be removed

**Severity:** Major  
**Description:** Assigning a value to a variable and then overwriting it before reading is dead code.

**Noncompliant:**

```csharp
public int Compute()
{
    var value = 1;
    value = 2;
    return value;
}
```

**Compliant:**

```csharp
public int Compute()
{
    var value = 2;
    return value;
}
```

---

### S1905: Redundant casts should not be used

**Severity:** Minor  
**Description:** Casting a value to its own type or to a base type it already is does nothing.

**Noncompliant:**

```csharp
public string GetValue(object value)
{
    return (string)value.ToString();
}
```

**Compliant:**

```csharp
public string GetValue(object value)
{
    return value.ToString();
}
```

---

### S1939: Inheritance list should not be redundant

**Severity:** Minor  
**Description:** Explicitly listing an interface that is already inherited through a base class is redundant.

**Noncompliant:**

```csharp
public class MyDisposable : IDisposable, IAsyncDisposable
{
    // IAsyncDisposable already inherits IDisposable
}
```

**Compliant:**

```csharp
public class MyDisposable : IAsyncDisposable
{
}
```

---

### S1940: Aborting `finally` blocks should not be used

**Severity:** Blocker  
**Description:** Throwing an exception or calling `Environment.Exit` in a `finally` block suppresses the original exception and loses diagnostic information.

**Noncompliant:**

```csharp
public void Process()
{
    try
    {
        DoWork();
    }
    finally
    {
        throw new InvalidOperationException("Cleanup failed");
    }
}
```

**Compliant:**

```csharp
public void Process()
{
    try
    {
        DoWork();
    }
    finally
    {
        Cleanup();
    }
}
```

---

### S1994: `GC.SuppressFinalize` should not be called on `IDisposable` types that do not have a finalizer

**Severity:** Major  
**Description:** Calling `GC.SuppressFinalize(this)` in a `Dispose` method when the class has no finalizer is unnecessary.

**Noncompliant:**

```csharp
public class Resource : IDisposable
{
    public void Dispose()
    {
        GC.SuppressFinalize(this);
    }
}
```

**Compliant:**

```csharp
public class Resource : IDisposable
{
    public void Dispose()
    {
        // No finalizer, so no SuppressFinalize needed
    }
}
```

---

### S2114: `Equality` checks should not be made with `float.NaN`

**Severity:** Major  
**Description:** `float.NaN == float.NaN` is always `false`. Use `float.IsNaN` instead.

**Noncompliant:**

```csharp
public bool IsNotANumber(float value)
{
    return value == float.NaN;
}
```

**Compliant:**

```csharp
public bool IsNotANumber(float value)
{
    return float.IsNaN(value);
}
```

---

### S2208: `System.Console` should not be used in production code

**Severity:** Minor  
**Description:** Writing to the console from production code pollutes logs and is not suitable for structured logging.

**Noncompliant:**

```csharp
public void Process()
{
    Console.WriteLine("Processing started");
}
```

**Compliant:**

```csharp
public void Process(ILogger<Processor> logger)
{
    logger.LogInformation("Processing started");
}
```

---

### S2223: Non-constant static fields should not be visible

**Severity:** Major  
**Description:** Mutable static fields are shared across all threads and can cause race conditions.

**Noncompliant:**

```csharp
public class Config
{
    public static string ConnectionString;
}
```

**Compliant:**

```csharp
public static class Config
{
    public static string ConnectionString { get; set; }
}
```

---

### S2225: `ToString()` should not return `null`

**Severity:** Major  
**Description:** Returning `null` from `ToString()` violates the contract and causes `NullReferenceException` in callers.

**Noncompliant:**

```csharp
public override string ToString()
{
    return null;
}
```

**Compliant:**

```csharp
public override string ToString()
{
    return string.Empty;
}
```

---

### S2234: Parameters should be passed in the correct order

**Severity:** Major  
**Description:** Passing arguments in the wrong order can cause subtle bugs, especially when parameter types match.

**Noncompliant:**

```csharp
public void Move(int x, int y)
{
    // x and y swapped accidentally
    _cursor.Move(y, x);
}
```

**Compliant:**

```csharp
public void Move(int x, int y)
{
    _cursor.Move(x, y);
}
```

---

### S2325: Methods and properties that do not access instance data should be static

**Severity:** Minor  
**Description:** Methods that do not use instance members should be `static` to indicate they are stateless.

**Noncompliant:**

```csharp
public class Calculator
{
    public int Add(int a, int b)
    {
        return a + b;
    }
}
```

**Compliant:**

```csharp
public class Calculator
{
    public static int Add(int a, int b)
    {
        return a + b;
    }
}
```

---

### S2326: Unused type parameters should be removed

**Severity:** Major  
**Description:** Generic type parameters that are not used in the method signature serve no purpose.

**Noncompliant:**

```csharp
public TResult Process<TResult>(string input)
{
    return default;
}
```

**Compliant:**

```csharp
public string Process(string input)
{
    return input;
}
```

---

### S2357: Fields should not have public accessibility

**Severity:** Minor  
**Description:** Public fields break encapsulation and cannot have validation or change notification added later.

**Noncompliant:**

```csharp
public class User
{
    public string Name;
}
```

**Compliant:**

```csharp
public class User
{
    public required string Name { get; init; }
}
```

---

### S2436: Classes and methods should not have too many generic parameters

**Severity:** Major  
**Description:** More than three generic parameters make the API hard to use and indicate a design issue.

**Noncompliant:**

```csharp
public class Container<T1, T2, T3, T4>
{
}
```

**Compliant:**

```csharp
public class Container<TKey, TValue>
{
}
```

---

### S2486: Generic exceptions should not be thrown

**Severity:** Major  
**Description:** Throwing `Exception`, `SystemException`, or `ApplicationException` forces callers to catch all exceptions, hiding specific failure modes.

**Noncompliant:**

```csharp
public void Process()
{
    throw new Exception("Failed");
}
```

**Compliant:**

```csharp
public void Process()
{
    throw new InvalidOperationException("Failed");
}
```

### S2699: Tests should include assertions

**Severity:** Blocker  
**Description:** Tests without assertions pass even when the code under test is broken.

**Noncompliant:**

```csharp
[Test]
public void CreateUser_ReturnsUser()
{
    var user = _service.CreateUser("test");
    // No assertion
}
```

**Compliant:**

```csharp
[Test]
public void CreateUser_ReturnsUser()
{
    var user = _service.CreateUser("test");
    user.Should().NotBeNull();
    user.Name.Should().Be("test");
}
```

---

### S2971: `IEnumerable` LINQ methods should be simplified

**Severity:** Minor  
**Description:** Calling `Count()` then `Any()` on the same sequence is redundant. Use the result directly.

**Noncompliant:**

```csharp
public bool HasItems(List<int> items)
{
    return items.Count() > 0 && items.Any();
}
```

**Compliant:**

```csharp
public bool HasItems(List<int> items)
{
    return items.Any();
}
```

---

### S3052: Members should not be initialized to default values

**Severity:** Minor  
**Description:** Explicitly initializing a field or property to its default value is redundant.

**Noncompliant:**

```csharp
public class User
{
    public bool IsActive { get; set; } = false;
    public int Age { get; set; } = 0;
}
```

**Compliant:**

```csharp
public class User
{
    public bool IsActive { get; set; }
    public int Age { get; set; }
}
```

---

### S3060: `is` should be used instead of `==` for type comparison

**Severity:** Major  
**Description:** Using `== typeof(...)` is less readable than the `is` operator and does not handle inheritance correctly.

**Noncompliant:**

```csharp
public bool IsString(object value)
{
    return value.GetType() == typeof(string);
}
```

**Compliant:**

```csharp
public bool IsString(object value)
{
    return value is string;
}
```

---

### S3063: Strings should not be concatenated with `+` when the result is immediately discarded

**Severity:** Major  
**Description:** Concatenating strings and not using the result is dead code and indicates a mistake.

**Noncompliant:**

```csharp
public void Build()
{
    var a = "hello";
    a + " world"; // Result discarded
}
```

**Compliant:**

```csharp
public string Build()
{
    var a = "hello";
    return a + " world";
}
```

---

### S3235: Redundant `Parentheses` should not be used

**Severity:** Minor  
**Description:** Extra parentheses around a simple expression add noise without improving readability.

**Noncompliant:**

```csharp
public int Compute(int a)
{
    return (a + 1);
}
```

**Compliant:**

```csharp
public int Compute(int a)
{
    return a + 1;
}
```

---

### S3240: The simplest possible condition syntax should be used

**Severity:** Minor  
**Description:** Prefer ternary expressions or `??` over `if/else` when both branches are simple assignments or returns.

**Noncompliant:**

```csharp
public string GetLabel(bool active)
{
    if (active)
    {
        return "Active";
    }
    else
    {
        return "Inactive";
    }
}
```

**Compliant:**

```csharp
public string GetLabel(bool active)
{
    return active ? "Active" : "Inactive";
}
```

---

### S3241: Methods should not return values that are never used

**Severity:** Major  
**Description:** Returning a value that callers ignore is misleading and suggests the return type should be `void`.

**Noncompliant:**

```csharp
public int Process()
{
    DoWork();
    return 0; // Caller never uses this
}
```

**Compliant:**

```csharp
public void Process()
{
    DoWork();
}
```

---

### S3253: Constructor initializers should not be redundant

**Severity:** Minor  
**Description:** Calling `: base()` explicitly is redundant because it is done implicitly.

**Noncompliant:**

```csharp
public class User : Entity
{
    public User() : base()
    {
    }
}
```

**Compliant:**

```csharp
public class User : Entity
{
    public User()
    {
    }
}
```

---

### S3254: Default parameter values should not be passed as arguments

**Severity:** Minor  
**Description:** Passing the same value that is already the parameter default is redundant.

**Noncompliant:**

```csharp
public void Process(int value = 10)
{
    Process(value: 10);
}
```

**Compliant:**

```csharp
public void Process(int value = 10)
{
    Process();
}
```

---

### S3261: Namespaces should not be empty

**Severity:** Minor  
**Description:** Empty namespaces serve no purpose and should be removed.

**Noncompliant:**

```csharp
namespace MyApplication.Empty
{
}
```

**Compliant:**

```csharp
namespace MyApplication.Features
{
    public class Feature { }
}
```

---

### S3262: `params` should be used on overrides

**Severity:** Minor  
**Description:** When overriding a method with `params`, the override should also use `params` to preserve caller flexibility.

**Noncompliant:**

```csharp
public class Base
{
    public virtual void Log(params string[] messages) { }
}

public class Derived : Base
{
    public override void Log(string[] messages) { }
}
```

**Compliant:**

```csharp
public class Base
{
    public virtual void Log(params string[] messages) { }
}

public class Derived : Base
{
    public override void Log(params string[] messages) { }
}
```

---

### S3263: Static fields should appear in the order they must be initialized

**Severity:** Major  
**Description:** If a static field initializer depends on another static field, the dependent field must be declared after the one it depends on.

**Noncompliant:**

```csharp
public class Config
{
    public static readonly string FullUrl = BaseUrl + "/api";
    public static readonly string BaseUrl = "https://example.com";
}
```

**Compliant:**

```csharp
public class Config
{
    public static readonly string BaseUrl = "https://example.com";
    public static readonly string FullUrl = BaseUrl + "/api";
}
```

---

### S3264: Event handlers should have the correct signature

**Severity:** Major  
**Description:** Event handlers should follow the `(object sender, EventArgs e)` pattern for compatibility.

**Noncompliant:**

```csharp
public void OnClick()
{
}
```

**Compliant:**

```csharp
public void OnClick(object sender, EventArgs e)
{
}
```

---

### S3265: Non-flags enums should not be marked with `FlagsAttribute`

**Severity:** Major  
**Description:** Applying `[Flags]` to an enum whose values are not powers of two causes incorrect bitwise behaviour.

**Noncompliant:**

```csharp
[Flags]
public enum Status
{
    Active = 1,
    Inactive = 2,
    Pending = 3
}
```

**Compliant:**

```csharp
public enum Status
{
    Active = 1,
    Inactive = 2,
    Pending = 3
}
```

---

### S3353: Uninitialized fields should not be used

**Severity:** Major  
**Description:** Reading a field that has not been initialized yields the default value and usually indicates a missing constructor assignment.

**Noncompliant:**

```csharp
public class Counter
{
    private int _count;

    public int GetCount()
    {
        return _count; // Uninitialized, returns 0
    }
}
```

**Compliant:**

```csharp
public class Counter
{
    private int _count;

    public Counter()
    {
        _count = 0;
    }

    public int GetCount()
    {
        return _count;
    }
}
```

---

### S3366: `this` should not be passed out of a constructor

**Severity:** Major  
**Description:** Passing `this` from a constructor allows other code to observe the object before it is fully constructed.

**Noncompliant:**

```csharp
public class User
{
    public User(Registry registry)
    {
        registry.Register(this);
    }
}
```

**Compliant:**

```csharp
public class User
{
    public void RegisterWith(Registry registry)
    {
        registry.Register(this);
    }
}
```

---

### S3431: `Assert.AreEqual` should not be used with `float` or `double`

**Severity:** Major  
**Description:** Exact equality on floating-point numbers is unreliable due to precision issues.

**Noncompliant:**

```csharp
Assert.AreEqual(0.1 + 0.2, 0.3);
```

**Compliant:**

```csharp
Assert.AreEqual(0.3, 0.1 + 0.2, 0.0001);
```

---

### S3600: `Assembly.GetExecutingAssembly` should not be called in `async` methods

**Severity:** Major  
**Description:** In `async` methods, the executing assembly is the framework rather than the expected caller.

**Noncompliant:**

```csharp
public async Task DoWorkAsync()
{
    var asm = Assembly.GetExecutingAssembly();
}
```

**Compliant:**

```csharp
public void DoWork()
{
    var asm = Assembly.GetExecutingAssembly();
}
```

---

### S3626: Jump statements should not be redundant

**Severity:** Minor  
**Description:** `return`, `break`, or `continue` at the end of a block where control would flow there anyway is redundant.

**Noncompliant:**

```csharp
public void Process()
{
    if (true)
    {
        DoWork();
        return;
    }
}
```

**Compliant:**

```csharp
public void Process()
{
    DoWork();
}
```

---

### S3693: Constructor arguments should not be passed to `base` with the same name and type

**Severity:** Minor  
**Description:** Passing a constructor parameter to `base` with the same name is unnecessary when the base constructor is called implicitly.

**Noncompliant:**

```csharp
public class Derived : Base
{
    public Derived(string name) : base(name)
    {
    }
}
```

**Compliant:**

```csharp
public class Derived : Base
{
    public Derived(string name)
    {
    }
}
```

---

### S3776: Cognitive Complexity of methods should not be too high

**Severity:** Critical  
**Description:** Methods with high cognitive complexity (default threshold 15) are hard to understand and maintain. Refactor into smaller methods.

**Noncompliant:**

```csharp
public void Process(Order order)
{
    if (order is not null)
    {
        if (order.Items is not null)
        {
            foreach (var item in order.Items)
            {
                if (item.Quantity > 0)
                {
                    if (item.Price > 0)
                    {
                        // ... deeply nested logic
                    }
                }
            }
        }
    }
}
```

**Compliant:**

```csharp
public void Process(Order order)
{
    if (order is null || order.Items is null)
    {
        return;
    }

    foreach (var item in order.Items)
    {
        ProcessItem(item);
    }
}

private void ProcessItem(Item item)
{
    if (item.Quantity <= 0 || item.Price <= 0)
    {
        return;
    }

    // ...
}
```

---

### S3869: `SafeHandle` should be used instead of `IntPtr`

**Severity:** Major  
**Description:** Using `IntPtr` for handles does not provide automatic resource management. Use `SafeHandle` derivatives.

**Noncompliant:**

```csharp
[DllImport("kernel32.dll")]
private static extern IntPtr CreateFile(...);
```

**Compliant:**

```csharp
[DllImport("kernel32.dll")]
private static extern SafeFileHandle CreateFile(...);
```

---

### S3925: `ISerializable` should be implemented correctly

**Severity:** Critical  
**Description:** Implementing `ISerializable` requires a protected constructor and proper `GetObjectData` handling to avoid security issues.

**Noncompliant:**

```csharp
[Serializable]
public class CustomException : Exception
{
    public CustomException(string message) : base(message) { }
}
```

**Compliant:**

```csharp
[Serializable]
public class CustomException : Exception
{
    public CustomException(string message) : base(message) { }

    protected CustomException(SerializationInfo info, StreamingContext context)
        : base(info, context) { }
}
```

---

### S3994: `Uri.IsWellFormedUriString` should not be used

**Severity:** Major  
**Description:** `Uri.IsWellFormedUriString` returns `false` for valid URIs that contain internationalized domain names.

**Noncompliant:**

```csharp
public bool IsValid(string url)
{
    return Uri.IsWellFormedUriString(url, UriKind.Absolute);
}
```

**Compliant:**

```csharp
public bool IsValid(string url)
{
    return Uri.TryCreate(url, UriKind.Absolute, out _);
}
```

---

### S3996: `Task` should not be returned from `async` methods without awaiting

**Severity:** Major  
**Description:** Returning a `Task` from an `async` method without awaiting it causes the exception to be unobserved.

**Noncompliant:**

```csharp
public async Task DoWorkAsync()
{
    return Task.Run(() => { });
}
```

**Compliant:**

```csharp
public async Task DoWorkAsync()
{
    await Task.Run(() => { });
}
```

---

### S4000: Delegates should not be used as event handlers if they are not compatible

**Severity:** Major  
**Description:** Delegates with mismatched signatures used as event handlers cause runtime exceptions.

**Noncompliant:**

```csharp
public event Action<string> OnProcess;

public void Trigger()
{
    OnProcess += () => { }; // Signature mismatch
}
```

**Compliant:**

```csharp
public event Action<string> OnProcess;

public void Trigger()
{
    OnProcess += (message) => { };
}
```

---

### S4016: Generic type parameters should be named `T` or prefixed with `T`

**Severity:** Minor  
**Description:** Following the `T` prefix convention makes generic code easier to read.

**Noncompliant:**

```csharp
public class Container<Element>
{
}
```

**Compliant:**

```csharp
public class Container<TElement>
{
}
```

---

### S4027: Exceptions should not be thrown in finally blocks

**Severity:** Blocker  
**Description:** Throwing an exception in a `finally` block suppresses the original exception.

**Noncompliant:**

```csharp
public void Process()
{
    try
    {
        DoWork();
    }
    finally
    {
        throw new InvalidOperationException("Cleanup failed");
    }
}
```

**Compliant:**

```csharp
public void Process()
{
    try
    {
        DoWork();
    }
    finally
    {
        Cleanup();
    }
}
```

---

### S4039: `Delegate.Subtract` and `Delegate.Remove` should not be used in events

**Severity:** Major  
**Description:** Removing a multicast delegate removes all occurrences, not just the last added, which is usually not intended.

**Noncompliant:**

```csharp
eventHandler -= handler;
```

**Compliant:**

```csharp
// Use a collection or event accessor pattern for safe removal
```

---

### S4049: Method names should not be suffixed with `Async` if they are not async

**Severity:** Minor  
**Description:** The `Async` suffix implies the method returns a `Task` and is awaitable.

**Noncompliant:**

```csharp
public void LoadAsync()
{
    // Not async
}
```

**Compliant:**

```csharp
public async Task LoadAsync()
{
    await LoadDataAsync();
}
```

---

### S4056: Overloads with a `params` array should not be defined

**Severity:** Minor  
**Description:** Overloads that take an array and a `params` version can cause ambiguity and unexpected boxing.

**Noncompliant:**

```csharp
public void Log(string message) { }
public void Log(params string[] messages) { }
```

**Compliant:**

```csharp
public void Log(string message) { }
public void Log(IEnumerable<string> messages) { }
```

---

### S4058: Overloads should not differ only by `ref` or `out`

**Severity:** Major  
**Description:** Methods that differ only by `ref`/`out` parameters are confusing for callers and compilers.

**Noncompliant:**

```csharp
public void Process(int value) { }
public void Process(out int value) { value = 0; }
```

**Compliant:**

```csharp
public void Process(int value) { }
public bool TryProcess(out int value) { value = 0; return true; }
```

---

### S4060: `volatile` fields should not be used

**Severity:** Major  
**Description:** `volatile` does not provide atomicity for compound operations. Use `Interlocked` or `lock` instead.

**Noncompliant:**

```csharp
private volatile int _counter;

public void Increment()
{
    _counter++;
}
```

**Compliant:**

```csharp
private int _counter;

public void Increment()
{
    Interlocked.Increment(ref _counter);
}
```

---

### S4069: `Increment` and `Decrement` operators should not be used in a method call

**Severity:** Minor  
**Description:** Using `++` or `--` inside a method argument makes evaluation order unclear.

**Noncompliant:**

```csharp
public void Process(int[] values, int index)
{
    Console.WriteLine(values[index++]);
}
```

**Compliant:**

```csharp
public void Process(int[] values, int index)
{
    Console.WriteLine(values[index]);
    index++;
}
```

---

### S4142: Duplicate values should not be passed as arguments

**Severity:** Major  
**Description:** Passing the same value to two different parameters is usually a copy-paste mistake.

**Noncompliant:**

```csharp
public void Move(int x, int y)
{
    _cursor.Move(x, x);
}
```

**Compliant:**

```csharp
public void Move(int x, int y)
{
    _cursor.Move(x, y);
}
```

---

### S4158: Empty collections should not be passed as arguments

**Severity:** Major  
**Description:** Passing an empty collection literal or newly created empty collection is pointless.

**Noncompliant:**

```csharp
public void Process()
{
    SaveItems(new List<string>());
}
```

**Compliant:**

```csharp
public void Process(List<string> items)
{
    if (items.Count > 0)
    {
        SaveItems(items);
    }
}
```

---

### S4260: `nameof` should be used instead of string literals for parameter names

**Severity:** Major  
**Description:** String literals for parameter names are not refactor-safe and can become stale.

**Noncompliant:**

```csharp
public void Process(string value)
{
    ArgumentException.ThrowIfNullOrEmpty("value", value);
}
```

**Compliant:**

```csharp
public void Process(string value)
{
    ArgumentException.ThrowIfNullOrEmpty(nameof(value), value);
}
```

---

### S4277: `Shared` or `static` fields should be read-only when public

**Severity:** Major  
**Description:** Public mutable static fields can be changed by any code, leading to unexpected state changes.

**Noncompliant:**

```csharp
public static int MaxRetries = 3;
```

**Compliant:**

```csharp
public static readonly int MaxRetries = 3;
```

---

### S4487: Unread `private` fields should be removed

**Severity:** Major  
**Description:** Private fields that are never read indicate dead code or incomplete implementation.

**Noncompliant:**

```csharp
public class Processor
{
    private readonly ILogger<Processor> _logger;

    public Processor(ILogger<Processor> logger)
    {
        _logger = logger;
    }

    public void Process()
    {
        // Never uses _logger
    }
}
```

**Compliant:**

```csharp
public class Processor
{
    private readonly ILogger<Processor> _logger;

    public Processor(ILogger<Processor> logger)
    {
        _logger = logger;
    }

    public void Process()
    {
        _logger.LogInformation("Processing started");
    }
}
```

---

### S4507: Delivering code in debug mode should not be done

**Severity:** Major  
**Description:** Debug builds expose detailed error information and may disable security features.

**Noncompliant:**

```csharp
#if DEBUG
    Console.WriteLine("Debug info: " + password);
#endif
```

**Compliant:**

```csharp
// Remove all DEBUG-only code before release builds
```

---

### S4792: Configuring loggers is security-sensitive

**Severity:** Major  
**Description:** Misconfigured logging can expose sensitive data. Never log secrets, passwords, or PII.

**Noncompliant:**

```csharp
_logger.LogInformation("User logged in with password {Password}", password);
```

**Compliant:**

```csharp
_logger.LogInformation("User {UserId} logged in", userId);
```

---

### S5679: Regular expressions should not contain empty groups

**Severity:** Minor  
**Description:** Empty groups in regex serve no purpose and indicate a mistake.

**Noncompliant:**

```csharp
var pattern = @"hello()world";
```

**Compliant:**

```csharp
var pattern = @"helloworld";
```

---

### S6359: `ThreadStatic` fields should not be used with `async` methods

**Severity:** Major  
**Description:** `async` methods may resume on different threads, making `ThreadStatic` values unreliable.

**Noncompliant:**

```csharp
[ThreadStatic]
private static int _counter;

public async Task ProcessAsync()
{
    _counter++;
    await Task.Delay(100);
    Console.WriteLine(_counter); // May be wrong thread
}
```

**Compliant:**

```csharp
private static readonly AsyncLocal<int> _counter = new();

public async Task ProcessAsync()
{
    _counter.Value++;
    await Task.Delay(100);
    Console.WriteLine(_counter.Value);
}
```

---

## Security Hotspots

Rules that identify security-sensitive code that requires manual review.

### S2068: Credentials should not be hard-coded

**Severity:** Blocker  
**Description:** Hardcoded passwords, API keys, or connection strings are visible in source control and binaries.

**Noncompliant:**

```csharp
public const string ApiKey = "sk-1234567890abcdef";
```

**Compliant:**

```csharp
public class ApiOptions
{
    public required string ApiKey { get; init; }
}
```

---

### S2077: SQL injection risks should be mitigated

**Severity:** Blocker  
**Description:** Concatenating user input into SQL queries creates injection vulnerabilities. Use parameterized queries.

**Noncompliant:**

```csharp
public async Task<List<User>> Search(string name)
{
    var sql = $"SELECT * FROM Users WHERE Name = '{name}'";
    return await _context.Users.FromSqlRaw(sql).ToListAsync();
}
```

**Compliant:**

```csharp
public async Task<List<User>> Search(string name)
{
    return await _context.Users
        .Where(u => u.Name == name)
        .ToListAsync();
}
```

---

### S2091: XPath injection risks should be mitigated

**Severity:** Blocker  
**Description:** User input in XPath expressions can alter query logic. Validate and parameterize inputs.

**Noncompliant:**

```csharp
public string FindUser(string username)
{
    var xpath = $"//user[name='{username}']";
    return _document.SelectSingleNode(xpath)?.InnerText;
}
```

**Compliant:**

```csharp
public string FindUser(string username)
{
    var navigator = _document.CreateNavigator();
    var expr = navigator.Compile("//user[name=$name]");
    var resolver = new XPathExpressionResolver();
    resolver.AddParam("name", username);
    return navigator.SelectSingleNode(expr, resolver)?.InnerText;
}
```

---

### S2245: Random values should not be used for security purposes

**Severity:** Blocker  
**Description:** `System.Random` is deterministic and predictable. Use `RandomNumberGenerator` for security-sensitive operations.

**Noncompliant:**

```csharp
public string GeneratePassword()
{
    var random = new Random();
    return random.Next().ToString();
}
```

**Compliant:**

```csharp
public string GeneratePassword()
{
    var bytes = new byte[32];
    RandomNumberGenerator.Fill(bytes);
    return Convert.ToBase64String(bytes);
}
```

---

### S2257: Using weak hash algorithms is security-sensitive

**Severity:** Critical  
**Description:** MD5 and SHA-1 are vulnerable to collision attacks. Use SHA-256 or stronger for hashing.

**Noncompliant:**

```csharp
public byte[] HashPassword(string password)
{
    using var md5 = MD5.Create();
    return md5.ComputeHash(Encoding.UTF8.GetBytes(password));
}
```

**Compliant:**

```csharp
public byte[] HashPassword(string password)
{
    using var sha256 = SHA256.Create();
    return sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
}
```

---

### S2612: Prohibited classes should not be used

**Severity:** Major  
**Description:** Certain classes like `BinaryFormatter` are dangerous due to deserialization vulnerabilities and should not be used.

**Noncompliant:**

```csharp
var formatter = new BinaryFormatter();
formatter.Serialize(stream, obj);
```

**Compliant:**

```csharp
// Use System.Text.Json or MessagePack instead
var json = JsonSerializer.Serialize(obj);
```

---

### S3011: Bypassing accessibility is security-sensitive

**Severity:** Major  
**Description:** Using reflection to access non-public members breaks encapsulation and can expose internal state.

**Noncompliant:**

```csharp
var field = typeof(User).GetField("_password", BindingFlags.NonPublic | BindingFlags.Instance);
var password = field?.GetValue(user);
```

**Compliant:**

```csharp
// Use public properties and methods only
var password = user.GetPasswordHash();
```

### S5332: Using clear-text protocols is security-sensitive

**Severity:** Blocker  
**Description:** Sending data over HTTP or FTP exposes it to interception. Use HTTPS and SFTP.

**Noncompliant:**

```csharp
using var client = new HttpClient();
return await client.GetStringAsync("http://api.example.com/data");
```

**Compliant:**

```csharp
using var client = new HttpClient();
return await client.GetStringAsync("https://api.example.com/data");
```

---

### S5443: Using public writable directories is security-sensitive

**Severity:** Major  
**Description:** Writing files to world-writable directories can allow other users to modify or replace them.

**Noncompliant:**

```csharp
var path = "/tmp/data.json";
File.WriteAllText(path, json);
```

**Compliant:**

```csharp
var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + ".json");
File.WriteAllText(path, json);
```

---

### S5445: Using temporary files is security-sensitive

**Severity:** Major  
**Description:** Temporary files may have weak permissions or be predictable. Use secure APIs and explicit cleanup.

**Noncompliant:**

```csharp
var path = "/tmp/tempfile.txt";
File.WriteAllText(path, data);
```

**Compliant:**

```csharp
var path = Path.GetTempFileName();
try
{
    File.WriteAllText(path, data);
}
finally
{
    File.Delete(path);
}
```

### S5689: Deserializing objects from an untrusted source is security-sensitive

**Severity:** Blocker  
**Description:** Deserializing untrusted data can lead to remote code execution. Use safe serializers and whitelist types.

**Noncompliant:**

```csharp
var formatter = new BinaryFormatter();
var obj = formatter.Deserialize(stream);
```

**Compliant:**

```csharp
var obj = JsonSerializer.Deserialize<MyDto>(json);
```

---

### S5693: Allowing both HTTP and HTTPS is security-sensitive

**Severity:** Major  
**Description:** Allowing HTTP alongside HTTPS exposes traffic to interception. Redirect HTTP to HTTPS.

**Noncompliant:**

```csharp
app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
});
```

**Compliant:**

```csharp
app.UseHttpsRedirection();
app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
});
```

---

### S5766: Deserializing with `TypeNameHandling.All` is security-sensitive

**Severity:** Blocker  
**Description:** `TypeNameHandling.All` in Newtonsoft.Json allows arbitrary type instantiation during deserialization.

**Noncompliant:**

```csharp
var settings = new JsonSerializerSettings
{
    TypeNameHandling = TypeNameHandling.All
};
var obj = JsonConvert.DeserializeObject<MyType>(json, settings);
```

**Compliant:**

```csharp
var obj = JsonConvert.DeserializeObject<MyType>(json);
```

---

### S6244: Using weak SSL/TLS protocols is security-sensitive

**Severity:** Blocker  
**Description:** Enabling TLS 1.0 or 1.1 exposes the application to known attacks. Use TLS 1.2 or 1.3.

**Noncompliant:**

```csharp
var handler = new HttpClientHandler
{
    SslProtocols = SslProtocols.Tls | SslProtocols.Tls11
};
```

**Compliant:**

```csharp
var handler = new HttpClientHandler
{
    SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13
};
```

---

## AI Agent Instructions

When generating code:

1. Preserve existing architecture.
2. Prefer modifying existing code over introducing abstractions.
3. Do not create base classes without demonstrated need.
4. Do not introduce generic repositories by default.
5. Do not introduce MediatR unless explicitly requested.
6. Do not introduce new NuGet packages without justification.
7. Prefer explicit implementations over framework-heavy solutions.
8. Keep methods small and focused.
9. Keep classes cohesive.
10. Add tests for behavioural changes.
11. Prefer readability over terseness.
12. If multiple solutions are valid, choose the simplest.
13. Ensure generated code complies with all SonarQube rules defined in this document.
14. Do not generate code that triggers SonarQube bugs, vulnerabilities, or critical code smells.
15. Apply security hotspot guidance for any security-sensitive operations (cryptography, serialization, networking, logging).

## Rationale

These instructions exist to maintain consistency, reduce complexity, and prevent common pitfalls in C# and ASP.NET Core development. Agents should treat this document as a binding contract. When in doubt, prefer the simpler, more explicit option that aligns with the standards above.
