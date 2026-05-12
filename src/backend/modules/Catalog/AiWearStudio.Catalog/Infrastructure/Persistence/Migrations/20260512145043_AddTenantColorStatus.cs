using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiWearStudio.Catalog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantColorStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tenant_color_status",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ColorVariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_color_status", x => x.Id);
                });

            migrationBuilder.UpdateData(
                schema: "catalog",
                table: "garments",
                keyColumn: "Id",
                keyValue: new Guid("b0000001-0000-0000-0000-000000000003"),
                column: "Name",
                value: "Polo / PiquÃ©");

            migrationBuilder.UpdateData(
                schema: "catalog",
                table: "garments",
                keyColumn: "Id",
                keyValue: new Guid("b0000001-0000-0000-0000-000000000007"),
                column: "Name",
                value: "PantalÃ³n de Buzo");

            migrationBuilder.UpdateData(
                schema: "catalog",
                table: "print_techniques",
                keyColumn: "Id",
                keyValue: new Guid("a0000001-0000-0000-0000-000000000001"),
                columns: new[] { "Description", "Name" },
                values: new object[] { "ImpresiÃ³n por calor con tinta de sublimaciÃ³n. Ideal para prendas de poliÃ©ster con cobertura total.", "SublimaciÃ³n Total" });

            migrationBuilder.UpdateData(
                schema: "catalog",
                table: "print_techniques",
                keyColumn: "Id",
                keyValue: new Guid("a0000001-0000-0000-0000-000000000002"),
                columns: new[] { "Description", "Name" },
                values: new object[] { "ImpresiÃ³n con malla y tinta plastisol. MÃ¡xima durabilidad para pedidos de volumen.", "SerigrafÃ­a" });

            migrationBuilder.CreateIndex(
                name: "uix_tenant_color_status",
                schema: "catalog",
                table: "tenant_color_status",
                columns: new[] { "TenantId", "ColorVariantId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tenant_color_status",
                schema: "catalog");

            migrationBuilder.UpdateData(
                schema: "catalog",
                table: "garments",
                keyColumn: "Id",
                keyValue: new Guid("b0000001-0000-0000-0000-000000000003"),
                column: "Name",
                value: "Polo / Piqué");

            migrationBuilder.UpdateData(
                schema: "catalog",
                table: "garments",
                keyColumn: "Id",
                keyValue: new Guid("b0000001-0000-0000-0000-000000000007"),
                column: "Name",
                value: "Pantalón de Buzo");

            migrationBuilder.UpdateData(
                schema: "catalog",
                table: "print_techniques",
                keyColumn: "Id",
                keyValue: new Guid("a0000001-0000-0000-0000-000000000001"),
                columns: new[] { "Description", "Name" },
                values: new object[] { "Impresión por calor con tinta de sublimación. Ideal para prendas de poliéster con cobertura total.", "Sublimación Total" });

            migrationBuilder.UpdateData(
                schema: "catalog",
                table: "print_techniques",
                keyColumn: "Id",
                keyValue: new Guid("a0000001-0000-0000-0000-000000000002"),
                columns: new[] { "Description", "Name" },
                values: new object[] { "Impresión con malla y tinta plastisol. Máxima durabilidad para pedidos de volumen.", "Serigrafía" });
        }
    }
}
