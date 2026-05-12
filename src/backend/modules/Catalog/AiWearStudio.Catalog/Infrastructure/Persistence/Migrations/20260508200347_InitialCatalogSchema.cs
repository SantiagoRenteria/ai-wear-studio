using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace AiWearStudio.Catalog.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCatalogSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "catalog");

            migrationBuilder.CreateTable(
                name: "garments",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_garments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "print_techniques",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_print_techniques", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "tenant_garment_status",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    GarmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tenant_garment_status", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "garment_color_variants",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GarmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ColorName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    HexCode = table.Column<string>(type: "character varying(7)", maxLength: 7, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_garment_color_variants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_garment_color_variants_garments_GarmentId",
                        column: x => x.GarmentId,
                        principalSchema: "catalog",
                        principalTable: "garments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "garment_views",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GarmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ViewName = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DisplayOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_garment_views", x => x.Id);
                    table.ForeignKey(
                        name: "FK_garment_views_garments_GarmentId",
                        column: x => x.GarmentId,
                        principalSchema: "catalog",
                        principalTable: "garments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "print_zones",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GarmentViewId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    XCm = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    YCm = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    WidthCm = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    HeightCm = table.Column<decimal>(type: "numeric(8,2)", precision: 8, scale: 2, nullable: false),
                    RecommendedTechniqueId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_print_zones", x => x.Id);
                    table.ForeignKey(
                        name: "FK_print_zones_garment_views_GarmentViewId",
                        column: x => x.GarmentViewId,
                        principalSchema: "catalog",
                        principalTable: "garment_views",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_print_zones_print_techniques_RecommendedTechniqueId",
                        column: x => x.RecommendedTechniqueId,
                        principalSchema: "catalog",
                        principalTable: "print_techniques",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                schema: "catalog",
                table: "garments",
                columns: new[] { "Id", "Category", "DisplayOrder", "Name" },
                values: new object[,]
                {
                    { new Guid("b0000001-0000-0000-0000-000000000001"), "camiseta", 1, "Camiseta Manga Corta" },
                    { new Guid("b0000001-0000-0000-0000-000000000002"), "camiseta", 2, "Camiseta Manga Larga" },
                    { new Guid("b0000001-0000-0000-0000-000000000003"), "polo", 3, "Polo / Piqué" },
                    { new Guid("b0000001-0000-0000-0000-000000000004"), "buzo", 4, "Buzo Crew Neck" },
                    { new Guid("b0000001-0000-0000-0000-000000000005"), "buzo", 5, "Buzo con Capucha" },
                    { new Guid("b0000001-0000-0000-0000-000000000006"), "chaqueta", 6, "Chaqueta Deportiva" },
                    { new Guid("b0000001-0000-0000-0000-000000000007"), "pantalon", 7, "Pantalón de Buzo" },
                    { new Guid("b0000001-0000-0000-0000-000000000008"), "short", 8, "Short Deportivo" },
                    { new Guid("b0000001-0000-0000-0000-000000000009"), "accesorio", 9, "Gorra 5 Paneles" },
                    { new Guid("b0000001-0000-0000-0000-000000000010"), "accesorio", 10, "Tote Bag" }
                });

            migrationBuilder.InsertData(
                schema: "catalog",
                table: "print_techniques",
                columns: new[] { "Id", "Description", "Name" },
                values: new object[,]
                {
                    { new Guid("a0000001-0000-0000-0000-000000000001"), "Impresión por calor con tinta de sublimación. Ideal para prendas de poliéster con cobertura total.", "Sublimación Total" },
                    { new Guid("a0000001-0000-0000-0000-000000000002"), "Impresión con malla y tinta plastisol. Máxima durabilidad para pedidos de volumen.", "Serigrafía" },
                    { new Guid("a0000001-0000-0000-0000-000000000003"), "Film transferible por calor. Permite colores ilimitados y detalles finos.", "Transfer Digital (DTF)" },
                    { new Guid("a0000001-0000-0000-0000-000000000004"), "Hilo bordado sobre la prenda. Acabado premium de alta durabilidad.", "Bordado" },
                    { new Guid("a0000001-0000-0000-0000-000000000005"), "Vinilo cortado y aplicado con calor. Ideal para textos y formas simples.", "Vinilo Termoadhesivo" }
                });

            migrationBuilder.InsertData(
                schema: "catalog",
                table: "garment_color_variants",
                columns: new[] { "Id", "ColorName", "DisplayOrder", "GarmentId", "HexCode" },
                values: new object[,]
                {
                    { new Guid("e0000001-0001-0001-0001-000000000001"), "Blanco", 1, new Guid("b0000001-0000-0000-0000-000000000001"), "#FFFFFF" },
                    { new Guid("e0000001-0001-0001-0001-000000000002"), "Negro", 2, new Guid("b0000001-0000-0000-0000-000000000001"), "#000000" },
                    { new Guid("e0000001-0001-0001-0001-000000000003"), "Gris", 3, new Guid("b0000001-0000-0000-0000-000000000001"), "#808080" },
                    { new Guid("e0000001-0001-0001-0001-000000000004"), "Azul Navy", 4, new Guid("b0000001-0000-0000-0000-000000000001"), "#001F5B" },
                    { new Guid("e0000001-0001-0001-0001-000000000005"), "Rojo", 5, new Guid("b0000001-0000-0000-0000-000000000001"), "#CC0000" },
                    { new Guid("e0000001-0002-0002-0002-000000000001"), "Blanco", 1, new Guid("b0000001-0000-0000-0000-000000000002"), "#FFFFFF" },
                    { new Guid("e0000001-0002-0002-0002-000000000002"), "Negro", 2, new Guid("b0000001-0000-0000-0000-000000000002"), "#000000" },
                    { new Guid("e0000001-0002-0002-0002-000000000003"), "Gris", 3, new Guid("b0000001-0000-0000-0000-000000000002"), "#808080" },
                    { new Guid("e0000001-0002-0002-0002-000000000004"), "Azul Navy", 4, new Guid("b0000001-0000-0000-0000-000000000002"), "#001F5B" },
                    { new Guid("e0000001-0003-0003-0003-000000000001"), "Blanco", 1, new Guid("b0000001-0000-0000-0000-000000000003"), "#FFFFFF" },
                    { new Guid("e0000001-0003-0003-0003-000000000002"), "Negro", 2, new Guid("b0000001-0000-0000-0000-000000000003"), "#000000" },
                    { new Guid("e0000001-0003-0003-0003-000000000003"), "Azul Navy", 3, new Guid("b0000001-0000-0000-0000-000000000003"), "#001F5B" },
                    { new Guid("e0000001-0003-0003-0003-000000000004"), "Verde Bosque", 4, new Guid("b0000001-0000-0000-0000-000000000003"), "#228B22" },
                    { new Guid("e0000001-0004-0004-0004-000000000001"), "Gris Claro", 1, new Guid("b0000001-0000-0000-0000-000000000004"), "#D3D3D3" },
                    { new Guid("e0000001-0004-0004-0004-000000000002"), "Negro", 2, new Guid("b0000001-0000-0000-0000-000000000004"), "#000000" },
                    { new Guid("e0000001-0004-0004-0004-000000000003"), "Azul Navy", 3, new Guid("b0000001-0000-0000-0000-000000000004"), "#001F5B" },
                    { new Guid("e0000001-0004-0004-0004-000000000004"), "Beige", 4, new Guid("b0000001-0000-0000-0000-000000000004"), "#F5F5DC" },
                    { new Guid("e0000001-0005-0005-0005-000000000001"), "Gris Claro", 1, new Guid("b0000001-0000-0000-0000-000000000005"), "#D3D3D3" },
                    { new Guid("e0000001-0005-0005-0005-000000000002"), "Negro", 2, new Guid("b0000001-0000-0000-0000-000000000005"), "#000000" },
                    { new Guid("e0000001-0005-0005-0005-000000000003"), "Azul Navy", 3, new Guid("b0000001-0000-0000-0000-000000000005"), "#001F5B" },
                    { new Guid("e0000001-0005-0005-0005-000000000004"), "Verde Militar", 4, new Guid("b0000001-0000-0000-0000-000000000005"), "#4B5320" },
                    { new Guid("e0000001-0006-0006-0006-000000000001"), "Negro", 1, new Guid("b0000001-0000-0000-0000-000000000006"), "#000000" },
                    { new Guid("e0000001-0006-0006-0006-000000000002"), "Azul Navy", 2, new Guid("b0000001-0000-0000-0000-000000000006"), "#001F5B" },
                    { new Guid("e0000001-0006-0006-0006-000000000003"), "Verde Militar", 3, new Guid("b0000001-0000-0000-0000-000000000006"), "#4B5320" },
                    { new Guid("e0000001-0007-0007-0007-000000000001"), "Gris", 1, new Guid("b0000001-0000-0000-0000-000000000007"), "#808080" },
                    { new Guid("e0000001-0007-0007-0007-000000000002"), "Negro", 2, new Guid("b0000001-0000-0000-0000-000000000007"), "#000000" },
                    { new Guid("e0000001-0007-0007-0007-000000000003"), "Azul Navy", 3, new Guid("b0000001-0000-0000-0000-000000000007"), "#001F5B" },
                    { new Guid("e0000001-0008-0008-0008-000000000001"), "Negro", 1, new Guid("b0000001-0000-0000-0000-000000000008"), "#000000" },
                    { new Guid("e0000001-0008-0008-0008-000000000002"), "Azul Navy", 2, new Guid("b0000001-0000-0000-0000-000000000008"), "#001F5B" },
                    { new Guid("e0000001-0008-0008-0008-000000000003"), "Rojo", 3, new Guid("b0000001-0000-0000-0000-000000000008"), "#CC0000" },
                    { new Guid("e0000001-0009-0009-0009-000000000001"), "Negro", 1, new Guid("b0000001-0000-0000-0000-000000000009"), "#000000" },
                    { new Guid("e0000001-0009-0009-0009-000000000002"), "Azul Navy", 2, new Guid("b0000001-0000-0000-0000-000000000009"), "#001F5B" },
                    { new Guid("e0000001-0009-0009-0009-000000000003"), "Blanco", 3, new Guid("b0000001-0000-0000-0000-000000000009"), "#FFFFFF" },
                    { new Guid("e0000001-0010-0010-0010-000000000001"), "Beige", 1, new Guid("b0000001-0000-0000-0000-000000000010"), "#F5F5DC" },
                    { new Guid("e0000001-0010-0010-0010-000000000002"), "Negro", 2, new Guid("b0000001-0000-0000-0000-000000000010"), "#000000" },
                    { new Guid("e0000001-0010-0010-0010-000000000003"), "Blanco", 3, new Guid("b0000001-0000-0000-0000-000000000010"), "#FFFFFF" }
                });

            migrationBuilder.InsertData(
                schema: "catalog",
                table: "garment_views",
                columns: new[] { "Id", "DisplayOrder", "GarmentId", "ViewName" },
                values: new object[,]
                {
                    { new Guid("c0000001-0000-0000-0000-000000000001"), 1, new Guid("b0000001-0000-0000-0000-000000000001"), "front" },
                    { new Guid("c0000001-0000-0000-0000-000000000002"), 2, new Guid("b0000001-0000-0000-0000-000000000001"), "back" },
                    { new Guid("c0000001-0000-0000-0000-000000000003"), 1, new Guid("b0000001-0000-0000-0000-000000000002"), "front" },
                    { new Guid("c0000001-0000-0000-0000-000000000004"), 2, new Guid("b0000001-0000-0000-0000-000000000002"), "back" },
                    { new Guid("c0000001-0000-0000-0000-000000000005"), 3, new Guid("b0000001-0000-0000-0000-000000000002"), "sleeve_left" },
                    { new Guid("c0000001-0000-0000-0000-000000000006"), 1, new Guid("b0000001-0000-0000-0000-000000000003"), "front" },
                    { new Guid("c0000001-0000-0000-0000-000000000007"), 2, new Guid("b0000001-0000-0000-0000-000000000003"), "back" },
                    { new Guid("c0000001-0000-0000-0000-000000000008"), 1, new Guid("b0000001-0000-0000-0000-000000000004"), "front" },
                    { new Guid("c0000001-0000-0000-0000-000000000009"), 2, new Guid("b0000001-0000-0000-0000-000000000004"), "back" },
                    { new Guid("c0000001-0000-0000-0000-000000000010"), 1, new Guid("b0000001-0000-0000-0000-000000000005"), "front" },
                    { new Guid("c0000001-0000-0000-0000-000000000011"), 2, new Guid("b0000001-0000-0000-0000-000000000005"), "back" },
                    { new Guid("c0000001-0000-0000-0000-000000000012"), 3, new Guid("b0000001-0000-0000-0000-000000000005"), "hood" },
                    { new Guid("c0000001-0000-0000-0000-000000000013"), 1, new Guid("b0000001-0000-0000-0000-000000000006"), "front" },
                    { new Guid("c0000001-0000-0000-0000-000000000014"), 2, new Guid("b0000001-0000-0000-0000-000000000006"), "back" },
                    { new Guid("c0000001-0000-0000-0000-000000000015"), 3, new Guid("b0000001-0000-0000-0000-000000000006"), "sleeve_left" },
                    { new Guid("c0000001-0000-0000-0000-000000000016"), 1, new Guid("b0000001-0000-0000-0000-000000000007"), "front" },
                    { new Guid("c0000001-0000-0000-0000-000000000017"), 2, new Guid("b0000001-0000-0000-0000-000000000007"), "back" },
                    { new Guid("c0000001-0000-0000-0000-000000000018"), 1, new Guid("b0000001-0000-0000-0000-000000000008"), "front" },
                    { new Guid("c0000001-0000-0000-0000-000000000019"), 2, new Guid("b0000001-0000-0000-0000-000000000008"), "back" },
                    { new Guid("c0000001-0000-0000-0000-000000000020"), 1, new Guid("b0000001-0000-0000-0000-000000000009"), "front" },
                    { new Guid("c0000001-0000-0000-0000-000000000021"), 2, new Guid("b0000001-0000-0000-0000-000000000009"), "side_left" },
                    { new Guid("c0000001-0000-0000-0000-000000000022"), 1, new Guid("b0000001-0000-0000-0000-000000000010"), "front" }
                });

            migrationBuilder.InsertData(
                schema: "catalog",
                table: "print_zones",
                columns: new[] { "Id", "GarmentViewId", "HeightCm", "Name", "RecommendedTechniqueId", "WidthCm", "XCm", "YCm" },
                values: new object[,]
                {
                    { new Guid("d0000001-0000-0000-0000-000000000001"), new Guid("c0000001-0000-0000-0000-000000000001"), 18m, "Pecho Central", new Guid("a0000001-0000-0000-0000-000000000002"), 15m, 8m, 7m },
                    { new Guid("d0000001-0000-0000-0000-000000000002"), new Guid("c0000001-0000-0000-0000-000000000002"), 26m, "Espalda Completa", new Guid("a0000001-0000-0000-0000-000000000002"), 26m, 5m, 6m },
                    { new Guid("d0000001-0000-0000-0000-000000000003"), new Guid("c0000001-0000-0000-0000-000000000003"), 18m, "Pecho Central", new Guid("a0000001-0000-0000-0000-000000000002"), 15m, 8m, 7m },
                    { new Guid("d0000001-0000-0000-0000-000000000004"), new Guid("c0000001-0000-0000-0000-000000000004"), 26m, "Espalda Completa", new Guid("a0000001-0000-0000-0000-000000000002"), 26m, 5m, 6m },
                    { new Guid("d0000001-0000-0000-0000-000000000005"), new Guid("c0000001-0000-0000-0000-000000000005"), 8m, "Logo Manga", new Guid("a0000001-0000-0000-0000-000000000003"), 8m, 2m, 5m },
                    { new Guid("d0000001-0000-0000-0000-000000000006"), new Guid("c0000001-0000-0000-0000-000000000006"), 10m, "Pecho Izquierdo", new Guid("a0000001-0000-0000-0000-000000000004"), 10m, 6m, 7m },
                    { new Guid("d0000001-0000-0000-0000-000000000007"), new Guid("c0000001-0000-0000-0000-000000000006"), 10m, "Pecho Derecho", new Guid("a0000001-0000-0000-0000-000000000004"), 10m, 14m, 7m },
                    { new Guid("d0000001-0000-0000-0000-000000000008"), new Guid("c0000001-0000-0000-0000-000000000007"), 20m, "Espalda Alta", new Guid("a0000001-0000-0000-0000-000000000002"), 22m, 5m, 5m },
                    { new Guid("d0000001-0000-0000-0000-000000000009"), new Guid("c0000001-0000-0000-0000-000000000008"), 20m, "Pecho Central", new Guid("a0000001-0000-0000-0000-000000000002"), 18m, 7m, 8m },
                    { new Guid("d0000001-0000-0000-0000-000000000010"), new Guid("c0000001-0000-0000-0000-000000000009"), 28m, "Espalda Completa", new Guid("a0000001-0000-0000-0000-000000000001"), 28m, 4m, 6m },
                    { new Guid("d0000001-0000-0000-0000-000000000011"), new Guid("c0000001-0000-0000-0000-000000000010"), 18m, "Pecho Central", new Guid("a0000001-0000-0000-0000-000000000002"), 16m, 8m, 8m },
                    { new Guid("d0000001-0000-0000-0000-000000000012"), new Guid("c0000001-0000-0000-0000-000000000011"), 28m, "Espalda Completa", new Guid("a0000001-0000-0000-0000-000000000002"), 28m, 4m, 6m },
                    { new Guid("d0000001-0000-0000-0000-000000000013"), new Guid("c0000001-0000-0000-0000-000000000012"), 14m, "Capota", new Guid("a0000001-0000-0000-0000-000000000003"), 18m, 3m, 3m },
                    { new Guid("d0000001-0000-0000-0000-000000000014"), new Guid("c0000001-0000-0000-0000-000000000013"), 10m, "Pecho Izquierdo", new Guid("a0000001-0000-0000-0000-000000000004"), 10m, 5m, 6m },
                    { new Guid("d0000001-0000-0000-0000-000000000015"), new Guid("c0000001-0000-0000-0000-000000000014"), 26m, "Espalda Grande", new Guid("a0000001-0000-0000-0000-000000000002"), 28m, 4m, 6m },
                    { new Guid("d0000001-0000-0000-0000-000000000016"), new Guid("c0000001-0000-0000-0000-000000000015"), 8m, "Logo Manga", new Guid("a0000001-0000-0000-0000-000000000004"), 8m, 2m, 4m },
                    { new Guid("d0000001-0000-0000-0000-000000000017"), new Guid("c0000001-0000-0000-0000-000000000016"), 12m, "Muslo Derecho", new Guid("a0000001-0000-0000-0000-000000000001"), 12m, 6m, 18m },
                    { new Guid("d0000001-0000-0000-0000-000000000018"), new Guid("c0000001-0000-0000-0000-000000000017"), 15m, "Parte Trasera", new Guid("a0000001-0000-0000-0000-000000000003"), 20m, 5m, 8m },
                    { new Guid("d0000001-0000-0000-0000-000000000019"), new Guid("c0000001-0000-0000-0000-000000000018"), 12m, "Muslo Derecho", new Guid("a0000001-0000-0000-0000-000000000001"), 12m, 6m, 10m },
                    { new Guid("d0000001-0000-0000-0000-000000000020"), new Guid("c0000001-0000-0000-0000-000000000019"), 15m, "Parte Trasera", new Guid("a0000001-0000-0000-0000-000000000003"), 20m, 5m, 8m },
                    { new Guid("d0000001-0000-0000-0000-000000000021"), new Guid("c0000001-0000-0000-0000-000000000020"), 7m, "Frente Gorra", new Guid("a0000001-0000-0000-0000-000000000003"), 10m, 3m, 4m },
                    { new Guid("d0000001-0000-0000-0000-000000000022"), new Guid("c0000001-0000-0000-0000-000000000021"), 5m, "Lateral Gorra", new Guid("a0000001-0000-0000-0000-000000000004"), 7m, 2m, 4m },
                    { new Guid("d0000001-0000-0000-0000-000000000023"), new Guid("c0000001-0000-0000-0000-000000000022"), 22m, "Cara Frontal", new Guid("a0000001-0000-0000-0000-000000000001"), 22m, 5m, 8m }
                });

            migrationBuilder.CreateIndex(
                name: "IX_garment_color_variants_GarmentId",
                schema: "catalog",
                table: "garment_color_variants",
                column: "GarmentId");

            migrationBuilder.CreateIndex(
                name: "IX_garment_views_GarmentId",
                schema: "catalog",
                table: "garment_views",
                column: "GarmentId");

            migrationBuilder.CreateIndex(
                name: "IX_print_zones_GarmentViewId",
                schema: "catalog",
                table: "print_zones",
                column: "GarmentViewId");

            migrationBuilder.CreateIndex(
                name: "IX_print_zones_RecommendedTechniqueId",
                schema: "catalog",
                table: "print_zones",
                column: "RecommendedTechniqueId");

            migrationBuilder.CreateIndex(
                name: "uix_tenant_garment_status",
                schema: "catalog",
                table: "tenant_garment_status",
                columns: new[] { "TenantId", "GarmentId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "garment_color_variants",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "print_zones",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "tenant_garment_status",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "garment_views",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "print_techniques",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "garments",
                schema: "catalog");
        }
    }
}
