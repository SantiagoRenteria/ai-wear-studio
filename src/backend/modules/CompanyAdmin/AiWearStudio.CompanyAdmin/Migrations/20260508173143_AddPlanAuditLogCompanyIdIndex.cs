using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiWearStudio.CompanyAdmin.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanAuditLogCompanyIdIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "IX_plan_audit_log_company_id",
                schema: "company_admin",
                table: "plan_audit_log",
                newName: "ix_plan_audit_log_company_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameIndex(
                name: "ix_plan_audit_log_company_id",
                schema: "company_admin",
                table: "plan_audit_log",
                newName: "IX_plan_audit_log_company_id");
        }
    }
}
