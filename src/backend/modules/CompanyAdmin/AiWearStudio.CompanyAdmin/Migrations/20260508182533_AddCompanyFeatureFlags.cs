using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiWearStudio.CompanyAdmin.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyFeatureFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "company_feature_flags",
                schema: "company_admin",
                columns: table => new
                {
                    company_id = table.Column<Guid>(type: "uuid", nullable: false),
                    feature_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    enabled = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_by = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_company_feature_flags", x => new { x.company_id, x.feature_key });
                    table.ForeignKey(
                        name: "fk_company_feature_flags_company",
                        column: x => x.company_id,
                        principalSchema: "company_admin",
                        principalTable: "companies",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_company_feature_flags_company_id",
                schema: "company_admin",
                table: "company_feature_flags",
                column: "company_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "company_feature_flags",
                schema: "company_admin");
        }
    }
}
