using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Tracker.Infrastructure.Data;

public class JobConfig : IEntityTypeConfiguration<Job>
{
    public void Configure(EntityTypeBuilder<Job> builder)
    {
        builder.ToTable("Jobs");
        builder.HasKey(j => j.Id);

        // The posting URL is the natural key of a job, so re-importing the same file is a no-op.
        builder.HasIndex(j => j.JobUrl).IsUnique();
        builder.HasIndex(j => j.Company);
        builder.HasIndex(j => j.PostedDate);

        builder.Property(j => j.JobTitle).HasMaxLength(256);
        builder.Property(j => j.Company).HasMaxLength(256);
        builder.Property(j => j.Location).HasMaxLength(256);
        builder.Property(j => j.JobUrl).HasMaxLength(1024);
        builder.Property(j => j.JobBoard).HasMaxLength(64);
        builder.Property(j => j.ResumeVersion).HasMaxLength(32);
        builder.Property(j => j.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(j => j.TailoringNotes).HasMaxLength(4000);

        // Nothing filters or sorts on the analysis, so it lives in one JSON column
        // instead of extra tables for the two keyword lists.
        builder.OwnsOne(j => j.Analysis, analysis => analysis.ToJson());
        builder.Navigation(j => j.Analysis).IsRequired();

        // Same reasoning for the generated resume. The nested OwnsMany is needed to make the
        // role list part of the same JSON document rather than a table of its own.
        builder.OwnsOne(j => j.Tailored, tailored =>
        {
            tailored.ToJson();
            tailored.OwnsMany(t => t.Experience);
        });
    }
}
