using System.Text;

namespace Tracker.Infrastructure;

public sealed class PromptComposer
{
    public string ComposeAnalysisPrompt(
        string title,
        string company,
        string? location,
        string description,
        CandidateCriteria criteria,
        IReadOnlyDictionary<string, string> resumes)
    {
        if (resumes == null || resumes.Count == 0)
        {
            throw new InvalidOperationException("At least one candidate resume is required to analyze a job posting.");
        }

        var hasMultipleResumes = resumes.Count > 1;

        var sb = new StringBuilder();

        // 1. Context & Profile
        sb.AppendLine($"You are an ATS resume-to-job matching engine evaluating roles for a {criteria.TargetSeniority} {criteria.ProfessionalHeadline}.");
        sb.AppendLine();
        sb.AppendLine("CANDIDATE PROFILE & CONSTRAINTS:");
        sb.AppendLine($"- Current Physical Residence: {criteria.CurrentLocation}");
        var targetLocs = criteria.TargetLocations is { Count: > 0 } ? string.Join(", ", criteria.TargetLocations) : "Any / Remote";
        sb.AppendLine($"- Desired / Target Locations: {targetLocs} (Open to Relocation: {(criteria.OpenToRelocation ? "Yes" : "No")})");
        sb.AppendLine($"- Work Authorization Status: {criteria.WorkAuthorization}");
        if (criteria.RequireClearanceCheck || criteria.HasSecurityClearance)
        {
            sb.AppendLine($"- Security Clearance: {(criteria.HasSecurityClearance ? "Holds active clearance" : "No clearance held")}");
        }
        sb.AppendLine();

        // 2. Candidate Resumes
        if (!hasMultipleResumes)
        {
            var singleResume = resumes.Values.First();
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
        sb.AppendLine($"{taskNum++}. Evaluate Location Eligibility: Determine if this employer accepts candidates physically residing in \"{criteria.CurrentLocation}\" (or offers international remote / contractor / relocation). Set locationEligibility to \"Eligible\", \"Ineligible\", or \"Conditional\", with a concise explanation in locationNote.");
        sb.AppendLine($"{taskNum++}. Decide whether the candidate should apply.");
        sb.AppendLine($"{taskNum++}. Write a compelling 3 to 4 sentence professional summary tailored to this role, using only facts already in the chosen resume.");
        sb.AppendLine($"{taskNum++}. List the strengths the candidate already has that this job asks for.");
        sb.AppendLine($"{taskNum++}. List up to 10 keywords or competencies the job asks for that the resume is missing.");
        sb.AppendLine();

        // 5. Apply Rules
        sb.AppendLine("APPLY RULES");
        sb.AppendLine("Set \"shouldApply\" to false when any of the following is true:");
        sb.AppendLine($"- The score is below {criteria.MinScore}.");
        sb.AppendLine($"- The posting explicitly restricts hiring to regions that exclude the candidate's current residence (\"{criteria.CurrentLocation}\"), with no international remote, contractor, or relocation options.");

        if (criteria.RequireClearanceCheck && !criteria.HasSecurityClearance)
        {
            sb.AppendLine("- The job requires an active national security clearance or strict citizenship restrictions that the candidate does not have.");
        }

        if (criteria.RequiresSponsorship || criteria.WorkAuthorization.Contains("Sponsorship", StringComparison.OrdinalIgnoreCase))
        {
            sb.AppendLine("- The candidate requires visa sponsorship or work permit assistance, and the posting explicitly states that the employer cannot sponsor visas now or in the future.");
        }

        if (criteria.CustomDealbreakers is { Count: > 0 })
        {
            foreach (var dealbreaker in criteria.CustomDealbreakers)
            {
                if (!string.IsNullOrWhiteSpace(dealbreaker))
                {
                    sb.AppendLine($"- Candidate Dealbreaker: {dealbreaker.Trim()}");
                }
            }
        }

        sb.AppendLine("Otherwise set \"shouldApply\" to true.");
        sb.AppendLine();

        // 6. Output Schema
        sb.AppendLine("OUTPUT");
        sb.AppendLine("Return ONLY a JSON object in this exact shape. No markdown, no text outside the JSON. Do not fabricate accomplishments. Avoid the em dash.");
        sb.AppendLine();

        var defaultVersion = hasMultipleResumes ? resumes.Keys.First() : "Default";

        sb.AppendLine($$"""
        {
          "shouldApply": true,
          "score": 0,
          "resumeVersion": "{{defaultVersion}}",
          "locationEligibility": "Eligible",
          "locationNote": "Clear explanation of whether this job accepts candidates based in {{criteria.CurrentLocation}}.",
          "sponsorshipNote": "What you know about this employer hiring international candidates and sponsoring visas. Answer from your own knowledge and write Unknown when you are not sure.",
          "reason": "One or two sentences explaining the verdict.",
          "tailoredSummary": "The rewritten professional summary.",
          "matchingStrengths": ["..."],
          "missingKeywords": ["..."]
        }
        """);

        return sb.ToString();
    }
}

