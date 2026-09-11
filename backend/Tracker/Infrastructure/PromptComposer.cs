using System.Text;

namespace Tracker.Infrastructure;

public sealed class PromptComposer(PromptStore prompts)
{
    public string ComposeAnalysisPrompt(
        string title,
        string company,
        string? location,
        string description,
        CandidateCriteria criteria,
        IReadOnlyDictionary<string, string>? customResumes = null)
    {
        var resumes = customResumes is { Count: > 0 } ? customResumes : prompts.GetResumes();
        var hasMultipleResumes = resumes.Count > 1;

        var sb = new StringBuilder();

        // 1. Context
        sb.AppendLine("You are an ATS resume-to-job matching engine working for a candidate.");
        sb.AppendLine();

        // 2. Candidate Resumes
        if (!hasMultipleResumes)
        {
            var singleResume = resumes.Values.FirstOrDefault() ?? prompts.Get("cv");
            sb.AppendLine("CANDIDATE RESUME:");
            sb.AppendLine(singleResume);
            sb.AppendLine();
        }
        else
        {
            foreach (var (versionName, resumeText) in resumes)
            {
                sb.AppendLine($"CANDIDATE RESUME, {versionName.ToUpperInvariant()} VERSION:");
                sb.AppendLine(resumeText);
                sb.AppendLine();
            }
        }

        // 3. Job Posting
        sb.AppendLine("JOB POSTING:");
        sb.AppendLine($"Job title: {title}");
        sb.AppendLine($"Company: {company}");
        sb.AppendLine($"Location: {location}");
        sb.AppendLine();
        sb.AppendLine(description);
        sb.AppendLine();

        // 4. Tasks
        sb.AppendLine("TASKS");
        var taskNum = 1;
        if (hasMultipleResumes)
        {
            var versions = string.Join(" or ", resumes.Keys.Select(k => $"\"{k}\""));
            sb.AppendLine($"{taskNum++}. Decide which resume version fits the posting better and return it as {versions}.");
        }
        sb.AppendLine($"{taskNum++}. Score the match from 0 to 100 on skill match, experience match, technology match, and role relevance.");
        sb.AppendLine($"{taskNum++}. Decide whether the candidate should apply.");
        sb.AppendLine($"{taskNum++}. Write a compelling 3 to 4 sentence professional summary tailored to this role, using only facts already in the chosen resume.");
        sb.AppendLine($"{taskNum++}. List the strengths the candidate already has that this job asks for.");
        sb.AppendLine($"{taskNum++}. List up to 10 keywords or competencies the job asks for that the resume is missing.");
        sb.AppendLine();

        // 5. Apply Rules
        sb.AppendLine("APPLY RULES");
        sb.AppendLine("Set \"shouldApply\" to false when any of the following is true:");
        sb.AppendLine($"- The score is below {criteria.MinScore}.");

        if (!string.IsNullOrWhiteSpace(criteria.TargetLocation))
        {
            sb.AppendLine($"- The job is not located in {criteria.TargetLocation} (or remote within {criteria.TargetLocation}).");
        }

        if (criteria.RequireClearanceCheck)
        {
            sb.AppendLine("- The job requires an active security clearance.");
            sb.AppendLine("- The job is open only to citizens, nationals, or security clearance holders.");
        }

        if (criteria.RequiresSponsorship)
        {
            sb.AppendLine("- The candidate needs visa sponsorship (F-1 CPT/OPT/STEM OPT or H-1B), and the job states that the employer does not sponsor employment visas now or in the future.");
        }

        sb.AppendLine("Otherwise set \"shouldApply\" to true.");
        sb.AppendLine();

        // 6. Output Schema
        sb.AppendLine("OUTPUT");
        sb.AppendLine("Return ONLY a JSON object in this exact shape. No markdown, no text outside the JSON. Do not fabricate accomplishments. Avoid the em dash.");
        sb.AppendLine();

        var defaultVersion = hasMultipleResumes ? resumes.Keys.First() : "Default";
        var sponsorshipField = criteria.RequiresSponsorship
            ? "\n  \"sponsorshipNote\": \"What you know about this employer hiring international candidates and sponsoring visas. Answer from your own knowledge and write Unknown when you are not sure.\","
            : string.Empty;

        sb.AppendLine($$"""
        {
          "shouldApply": true,
          "score": 0,
          "resumeVersion": "{{defaultVersion}}",
          "reason": "One or two sentences explaining the verdict.",
          "tailoredSummary": "The rewritten professional summary.",{{sponsorshipField}}
          "matchingStrengths": ["..."],
          "missingKeywords": ["..."]
        }
        """);

        return sb.ToString();
    }
}

