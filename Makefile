.PHONY: up down build logs test

# Levanta toda la infraestructura + backend + frontend
up:
	docker-compose up -d

# Levanta con rebuild de imágenes
build:
	docker-compose up -d --build

# Detiene todos los servicios
down:
	docker-compose down

# Ver logs (todos los servicios, o pasar el nombre: make logs s=backend)
logs:
	docker-compose logs -f $(s)

# Corre los tests del backend (requiere docker-compose.test.yml)
test:
	docker-compose -f docker-compose.test.yml up -d
	cd src/backend && dotnet test
	docker-compose -f docker-compose.test.yml down
