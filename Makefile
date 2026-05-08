.PHONY: dev dev-down test migrate migrate-users migrate-all

dev:
	docker-compose up -d
	cd src/backend && dotnet run --project AiWearStudio.Api

dev-down:
	docker-compose down

test:
	docker-compose -f docker-compose.test.yml up -d
	cd src/backend && dotnet test
	docker-compose -f docker-compose.test.yml down

migrate-users:
	cd src/backend && dotnet ef database update --project modules/Users/AiWearStudio.Users.Infrastructure --startup-project AiWearStudio.Api --connection "Host=localhost;Port=5434;Database=aiwearstudio;Username=aiwear;Password=changeme_dev"

migrate-all: migrate-users

migrate: migrate-all
