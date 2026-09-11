using System.Text.Json.Serialization;
using Google.GenAI; 
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Extensions.AI;
using OpenAI;
using Tracker.Features.Jobs;
using Tracker.Features.Jobs.Services;
using Tracker.Infrastructure;
using Tracker.Infrastructure.Data;
using Tracker.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.Services.AddDbContext<TrackerDbContext>(o => o.UseSqlite(config.GetConnectionString("Default")));
builder.Services.AddSingleton<PromptStore>();
builder.Services.AddSingleton<CompanyBlacklist>();

// 1. Register the abstract universal client interface wrapper
// How they connect: The DI container resolves the "Provider" string 
// and outputs a unified IChatClient that your JobService can consume.
builder.Services.AddSingleton<IChatClient>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var provider = config["AI:Provider"]; // e.g., "gemini" or "groq"
    var model = config["AI:Model"] ?? "gemini-2.5-flash";;  

    return provider switch
    {
        "gemini" => new Client(apiKey: config["Gemini:ApiKey"]).AsIChatClient(model),
        _ => throw new InvalidOperationException("Unknown provider")
    };
});

// 2. Wire up your provider-agnostic implementation to the IJobAiService interface
builder.Services.AddScoped<IJobAiService, ProviderAgnosticJobService>(); 



// Swapped to your updated Gemini implementation
// builder.Services.AddScoped<IJobAiService, GeminiJobService>();

builder.Services.AddScoped<IJobImportService, JobImportService>();
builder.Services.Configure<ScraperOptions>(config.GetSection("Scraper"));
builder.Services.AddSingleton<ScrapedJobStore>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IJobBoardScraper, LinkedInScraper>();
builder.Services.AddScoped<IJobBoardScraper, IndeedScraper>();
builder.Services.AddScoped<IJobBoardScraper, GreenhouseScraper>();
builder.Services.AddScoped<IJobBoardScraper, LeverScraper>();

builder.Services.AddProblemDetails();

// Without this the exception handler reports a malformed request body as 500 instead of 400.
builder.Services.Configure<ExceptionHandlerOptions>(o => o.StatusCodeSelector =
    ex => ex is BadHttpRequestException bad ? bad.StatusCode : StatusCodes.Status500InternalServerError);
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddCors(o => o.AddDefaultPolicy(policy => policy
    .WithOrigins(config.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<TrackerDbContext>().Database.Migrate();

app.UseExceptionHandler();
app.UseCors();
app.MapJobEndpoints();
app.MapScrapeEndpoints();

app.Run();
