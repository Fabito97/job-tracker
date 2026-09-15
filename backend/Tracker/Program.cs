using System.Text.Json.Serialization;
using Microsoft.Extensions.AI;
using Tracker.Features.Jobs;
using Tracker.Features.Jobs.Services;
using Tracker.Features.Resumes;
using Tracker.Features.Settings;
using Tracker.Infrastructure;
using Tracker.Infrastructure.Data;
using Tracker.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

builder.Services.AddDbContext<TrackerDbContext>(o => o.UseSqlite(config.GetConnectionString("Default")));
builder.Services.AddSingleton<PromptStore>();
builder.Services.AddSingleton<PromptComposer>();
builder.Services.AddSingleton<CompanyBlacklist>();
builder.Services.AddSingleton<ISettingsService, SettingsService>();
builder.Services.AddScoped<IResumeService, ResumeService>();

// 1. Register the universal AI client factory & IChatClient
builder.Services.AddSingleton<IAiClientFactory, AiClientFactory>();
builder.Services.AddTransient<IChatClient>(sp => sp.GetRequiredService<IAiClientFactory>().GetClient());

// 2. Wire up provider-agnostic implementation to IJobAiService interface
builder.Services.AddScoped<IJobAiService, ProviderAgnosticJobService>();

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
{
    var db = scope.ServiceProvider.GetRequiredService<TrackerDbContext>();
    if (db.Database.GetPendingMigrations().Any())
    {
        db.Database.Migrate();
    }
    var resumeService = scope.ServiceProvider.GetRequiredService<IResumeService>();
    await resumeService.SeedDefaultResumesIfEmptyAsync();
}

app.UseExceptionHandler();
app.UseCors();
app.MapJobEndpoints();
app.MapScrapeEndpoints();
app.MapSettingsEndpoints();
app.MapResumeEndpoints();

app.Run();
