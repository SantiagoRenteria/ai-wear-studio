using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiWearStudio.DesignEngine.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CreateDesignDrafts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "design_drafts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    snapshot_json = table.Column<string>(type: "text", nullable: false),
                    etag = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_design_drafts", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_design_drafts_tenant_id",
                table: "design_drafts",
                columns: new[] { "tenant_id", "id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "design_drafts");
        }
    }
}
