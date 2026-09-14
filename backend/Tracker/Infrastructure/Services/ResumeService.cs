using Microsoft.EntityFrameworkCore;
using Tracker.Domain.Models;
using Tracker.Features.Resumes;
using Tracker.Infrastructure.Data;
using UglyToad.PdfPig;

namespace Tracker.Infrastructure.Services;

public interface IResumeService
{
    Task<IReadOnlyList<ResumeDto>> GetAllAsync(CancellationToken ct = default);
    Task<ResumeDto> UploadAsync(string role, IFormFile file, bool isDefault, CancellationToken ct = default);
    Task<bool> DeleteAsync(long id, CancellationToken ct = default);
    Task<bool> SetDefaultAsync(long id, CancellationToken ct = default);
    Task<IReadOnlyDictionary<string, string>> GetActiveResumesAsync(CancellationToken ct = default);
    Task<string> GetResumeTextAsync(string? role, CancellationToken ct = default);
    Task SeedDefaultResumesIfEmptyAsync(CancellationToken ct = default);
}

public sealed class ResumeService(
    TrackerDbContext db,
    IHostEnvironment env,
    PromptStore prompts,
    ILogger<ResumeService> logger) : IResumeService
{
    private readonly string _resumesDir = Path.Combine(env.ContentRootPath, "Infrastructure", "Data", "Resumes");

    private void EnsureDirectory() => Directory.CreateDirectory(_resumesDir);

    public async Task<IReadOnlyList<ResumeDto>> GetAllAsync(CancellationToken ct = default)
    {
        var list = await db.Resumes
            .OrderByDescending(r => r.IsDefault)
            .ThenBy(r => r.Role)
            .ToListAsync(ct);

        return list.Select(r => new ResumeDto(
            r.Id,
            r.Role,
            r.FileName,
            r.IsDefault,
            r.CreatedAt,
            Preview: r.ExtractedText.Length > 300 ? $"{r.ExtractedText[..300]}..." : r.ExtractedText
        )).ToList();
    }

    public async Task<ResumeDto> UploadAsync(string role, IFormFile file, bool isDefault, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(role))
            throw new ArgumentException("Role name is required (e.g. 'Backend', 'Full Stack').", nameof(role));

        if (file == null || file.Length == 0)
            throw new ArgumentException("A valid non-empty resume file is required.", nameof(file));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".pdf" or ".txt"))
            throw new ArgumentException("Only .pdf and .txt resume files are supported.", nameof(file));

        EnsureDirectory();

        var safeRole = System.Text.RegularExpressions.Regex.Replace(role.Trim().ToLowerInvariant(), @"[^a-z0-9]+", "_").Trim('_');
        var safeFileName = $"cv_{safeRole}_{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(_resumesDir, safeFileName);

        await using (var stream = File.Create(fullPath))
        {
            await file.CopyToAsync(stream, ct);
        }

        string extractedText;
        if (ext == ".pdf")
        {
            try
            {
                using var pdf = PdfDocument.Open(fullPath);
                extractedText = string.Join("\n", pdf.GetPages().Select(p => p.Text));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to parse PDF {FileName}", file.FileName);
                if (File.Exists(fullPath)) File.Delete(fullPath);
                throw new InvalidOperationException($"Could not extract text from PDF: {ex.Message}", ex);
            }
        }
        else
        {
            extractedText = await File.ReadAllTextAsync(fullPath, ct);
        }

        extractedText = extractedText.Trim();
        if (string.IsNullOrWhiteSpace(extractedText))
        {
            if (File.Exists(fullPath)) File.Delete(fullPath);
            throw new InvalidOperationException("The uploaded resume file did not contain readable text.");
        }

        var anyExisting = await db.Resumes.AnyAsync(ct);
        if (!anyExisting)
        {
            isDefault = true;
        }
        else if (isDefault)
        {
            await db.Resumes.ExecuteUpdateAsync(s => s.SetProperty(r => r.IsDefault, false), ct);
        }

        var entity = new Resume
        {
            Role = role.Trim(),
            FileName = file.FileName,
            DiskPath = fullPath,
            ExtractedText = extractedText,
            IsDefault = isDefault,
            CreatedAt = DateTime.UtcNow
        };

        db.Resumes.Add(entity);
        await db.SaveChangesAsync(ct);

        return new ResumeDto(
            entity.Id,
            entity.Role,
            entity.FileName,
            entity.IsDefault,
            entity.CreatedAt,
            Preview: entity.ExtractedText.Length > 300 ? $"{entity.ExtractedText[..300]}..." : entity.ExtractedText);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken ct = default)
    {
        var resume = await db.Resumes.FindAsync([id], ct);
        if (resume == null) return false;

        if (File.Exists(resume.DiskPath))
        {
            try { File.Delete(resume.DiskPath); } catch { /* best effort */ }
        }

        db.Resumes.Remove(resume);
        await db.SaveChangesAsync(ct);

        if (resume.IsDefault)
        {
            var next = await db.Resumes.FirstOrDefaultAsync(ct);
            if (next != null)
            {
                next.IsDefault = true;
                await db.SaveChangesAsync(ct);
            }
        }

        return true;
    }

    public async Task<bool> SetDefaultAsync(long id, CancellationToken ct = default)
    {
        var resume = await db.Resumes.FindAsync([id], ct);
        if (resume == null) return false;

        await db.Resumes.ExecuteUpdateAsync(s => s.SetProperty(r => r.IsDefault, false), ct);
        resume.IsDefault = true;
        await db.SaveChangesAsync(ct);

        return true;
    }

    public async Task<IReadOnlyDictionary<string, string>> GetActiveResumesAsync(CancellationToken ct = default)
    {
        var list = await db.Resumes.ToListAsync(ct);
        if (list.Count == 0)
        {
            // If database is still empty (e.g. before initial seed finishes or in test), discover seed files
            return prompts.DiscoverSeedResumes();
        }

        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in list)
        {
            dict[r.Role] = r.ExtractedText;
        }
        return dict;
    }

    public async Task<string> GetResumeTextAsync(string? role, CancellationToken ct = default)
    {
        var list = await db.Resumes.ToListAsync(ct);
        if (list.Count == 0)
        {
            var seeds = prompts.DiscoverSeedResumes();
            if (seeds.Count == 0)
            {
                throw new InvalidOperationException("No candidate resumes found in the database or seed directory.");
            }

            if (!string.IsNullOrWhiteSpace(role) && seeds.TryGetValue(role, out var matchedSeed))
                return matchedSeed;

            return seeds.TryGetValue("Backend", out var defaultSeed) ? defaultSeed : seeds.Values.First();
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var matched = list.FirstOrDefault(r => string.Equals(r.Role, role, StringComparison.OrdinalIgnoreCase));
            if (matched != null) return matched.ExtractedText;
        }

        var defaultResume = list.FirstOrDefault(r => r.IsDefault) ?? list[0];
        return defaultResume.ExtractedText;
    }

    public async Task SeedDefaultResumesIfEmptyAsync(CancellationToken ct = default)
    {
        if (await db.Resumes.AnyAsync(ct)) return;

        EnsureDirectory();

        try
        {
            var seedResumes = prompts.DiscoverSeedResumes();
            if (seedResumes.Count == 0)
            {
                logger.LogInformation("No seed resumes found to import into database.");
                return;
            }

            var isFirst = true;
            foreach (var (role, text) in seedResumes)
            {
                var safeRole = System.Text.RegularExpressions.Regex.Replace(role.Trim().ToLowerInvariant(), @"[^a-z0-9]+", "_").Trim('_');
                var fileName = $"cv_{safeRole}.txt";
                var diskPath = Path.Combine(_resumesDir, fileName);

                if (!File.Exists(diskPath))
                {
                    await File.WriteAllTextAsync(diskPath, text, ct);
                }

                db.Resumes.Add(new Resume
                {
                    Role = role,
                    FileName = fileName,
                    DiskPath = diskPath,
                    ExtractedText = text,
                    IsDefault = isFirst,
                    CreatedAt = DateTime.UtcNow
                });

                isFirst = false;
            }

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded {Count} initial resume records into database using predictable 'cv_<role>.txt' template pattern.", seedResumes.Count);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to seed default resumes.");
        }
    }
}
