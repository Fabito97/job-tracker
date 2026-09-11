using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Tracker.Domain.Models;

namespace Tracker.Infrastructure.Data;

public class ResumeConfig : IEntityTypeConfiguration<Resume>
{
    public void Configure(EntityTypeBuilder<Resume> builder)
    {
        builder.ToTable("Resumes");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Role).HasMaxLength(64).IsRequired();
        builder.Property(r => r.FileName).HasMaxLength(256).IsRequired();
        builder.Property(r => r.DiskPath).HasMaxLength(512).IsRequired();
        builder.Property(r => r.ExtractedText).IsRequired();
        builder.Property(r => r.IsDefault).IsRequired();
        builder.Property(r => r.CreatedAt).IsRequired();

        builder.HasIndex(r => r.Role);
        builder.HasIndex(r => r.IsDefault);
    }
}
