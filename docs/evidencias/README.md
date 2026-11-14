# Evidencias de la práctica

Estos archivos se generaron ejecutando el proyecto en este equipo con Docker Desktop, `floci-az` y SQL Server 2025.

| Archivo | Qué demuestra |
|---|---|
| `01-floci-status.txt` | floci-az está corriendo, es reachable y el SQL Server real tiene un puerto publicado en el host. |
| `02-sql-verificacion.txt` | La base `NovaHotelDB` existe y Hibernate creó las tablas `Habitaciones`, `Reservas`, `Roles` y `Usuarios`; además hay 1 habitación insertada. |
| `03-springboot-startup.log` | Spring Boot arrancó, HikariCP completó el pool y Tomcat quedó escuchando en el puerto 8080. |
| `04-api-crud.txt` | `POST /api/habitaciones` respondió `201` y `GET /api/habitaciones` devolvió la habitación persistida. |

## Reproducir

```powershell
# 1. Levantar Floci AZ + SQL Server + base NovaHotelDB
.\scripts\floci-local.ps1 all

# 2. Compilar y ejecutar Spring Boot con las variables de .env.floci
.\scripts\run-local.ps1

# 3. En otra terminal
Invoke-RestMethod http://localhost:8080/api/habitaciones
```

La evidencia se puede regenerar borrando los archivos de esta carpeta y repitiendo los pasos. No se versionan credenciales reales: `.env.floci` está en `.gitignore`.
