using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tracker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Jobs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    JobTitle = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Company = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Location = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    JobUrl = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: false),
                    JobBoard = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    PostedDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    MatchScore = table.Column<int>(type: "INTEGER", nullable: false),
                    ResumeVersion = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    CoverLetter = table.Column<string>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    AppliedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    InterviewAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    Analysis = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Jobs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_Company",
                table: "Jobs",
                column: "Company");

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_JobUrl",
                table: "Jobs",
                column: "JobUrl",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_PostedDate",
                table: "Jobs",
                column: "PostedDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Jobs");
        }
    }
}
