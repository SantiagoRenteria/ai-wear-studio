using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiWearStudio.Users.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "email_verified",
                schema: "users",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "email_verified_at",
                schema: "users",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "email_verified",
                schema: "users",
                table: "users");

            migrationBuilder.DropColumn(
                name: "email_verified_at",
                schema: "users",
                table: "users");
        }
    }
}
