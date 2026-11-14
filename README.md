# NOVA Hotels

Backend de gestión hotelera construido con **Spring Boot 3.5.7**, **Spring Data JPA**, **Spring Security** y **SQL Server / Azure SQL**. Incluye registro de huéspedes con confirmación por correo, login, gestión de habitaciones y reservas, y un panel administrativo servido como contenido estático.

Este repositorio incorpora **Floci AZ** (`floci-az`) como nube Azure local para desarrollar y probar sin una suscripción de Azure, sin credenciales reales y sin costo.

- Documentación de Floci: <https://floci.io/>
- Emulador Azure: <https://floci.io/az/>
- Análisis de servicios aplicado al proyecto: [`docs/ANALISIS-FLOCI.md`](docs/ANALISIS-FLOCI.md)
- Evidencias de ejecución: [`docs/evidencias/`](docs/evidencias/)

---

## 1. Qué se agregó

| Archivo | Propósito |
|---|---|
| `docker-compose.floci.yml` | Levanta `floci-az` con Azure SQL en modo `managed` y EULA aceptada. |
| `scripts/floci-local.ps1` | Inicia Floci, crea el SQL Server lógico, crea `NovaHotelDB`, obtiene el puerto real y genera `.env.floci`. |
| `scripts/run-local.ps1` | Carga `.env.floci`, compila y ejecuta Spring Boot contra la base local. |
| `.env.example` | Plantilla de variables de entorno (base de datos, correo, puerto, URL pública). |
| `docs/ANALISIS-FLOCI.md` | Servicios de Floci que se acoplan a NOVA Hotels y decisión técnica. |
| `docs/evidencias/` | Logs y respuestas HTTP que demuestran la conexión exitosa. |
| `src/main/resources/application.properties` | Parametrizado con `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SERVER_PORT` y variables de correo. |

---

## 2. Servicios de Floci que se acoplan al proyecto

| Servicio | Uso en NOVA Hotels | Estado |
|---|---|---|
| **Azure SQL Database** | Base `NovaHotelDB` para usuarios, roles, habitaciones y reservas. | Implementado |
| **Blob Storage** | Fotos de habitaciones, comprobantes y PDFs de reserva. | Recomendado |
| **Queue Storage** | Envío asíncrono de correos de confirmación y recordatorios. | Recomendado |
| **Service Bus** | Eventos de reserva creada, cancelada o check-in. | Recomendado |
| **Communication Services Email** | Buzón local para probar correos sin Gmail SMTP. | Recomendado |
| **Key Vault** | Secretos de base de datos y correo. | Recomendado |
| **App Configuration** | Tarifas, banderas y código de administrador externalizados. | Recomendado |
| **Microsoft Entra ID** | Evolución del login actual a JWT/OIDC. | Futuro |
| **Azure Cache for Redis** | Caché de disponibilidad y sesiones. | Futuro |
| **Azure Functions** | Recordatorios de check-in y tareas programadas. | Futuro |
| **Azure Monitor / Log Analytics** | Trazas y auditoría local. | Opcional |

El detalle y la justificación están en [`docs/ANALISIS-FLOCI.md`](docs/ANALISIS-FLOCI.md).

---

## 3. Arquitectura local

```text
+---------------------------+        JDBC (TDS)        +------------------------------+
|  Spring Boot :8080        | ------------------------> |  SQL Server 2025 (Docker)    |
|  NOVA Hotels              |                           |  floci-az-sql-novahotel-sql  |
|  application.properties   |                           |  puerto dinamico -> 1433     |
+-------------+-------------+                           +--------------+---------------+
              |                                                        ^
              | variables de entorno (.env.floci)                      | ARM / control
              v                                                        |
+---------------------------+        HTTP :4577          +--------------+---------------+
|  scripts/run-local.ps1    | ------------------------>  |  floci-az :4577              |
|  scripts/floci-local.ps1  |                            |  Azure emulado (MIT)         |
+---------------------------+                            +------------------------------+
```

Floci separa el plano de control (ARM, puerto 4577) del plano de datos (contenedor SQL Server con puerto dinámico). El script traduce ese puerto al host para que Spring Boot use `localhost`.

---

## 4. Requisitos

- **Java 17 o superior** (probado con Java 21/25).
- **Docker Desktop** en ejecución (contenedores Linux).
- **PowerShell 5.1 o superior** (Windows).
- No se necesita cuenta de Azure ni suscripción.
- El wrapper de Maven ya está incluido (`mvnw.cmd`).

Opcional, para administrar Floci desde la CLI:

```powershell
irm https://floci.io/install.ps1 | iex
```

---

## 5. Variables de entorno

La aplicación lee estas variables. Si no existen, se usan los valores por defecto de `application.properties`.

| Variable | Descripción | Ejemplo local |
|---|---|---|
| `DB_URL` | URL JDBC de SQL Server | `jdbc:sqlserver://localhost:64276;databaseName=NovaHotelDB;encrypt=true;trustServerCertificate=true;loginTimeout=30;` |
| `DB_USERNAME` | Usuario de base de datos | `sa` |
| `DB_PASSWORD` | Contraseña de base de datos | `NovaHotel!2026` |
| `SERVER_PORT` | Puerto HTTP de la aplicación | `8080` |
| `APP_BASE_URL` | URL pública usada en enlaces de correo | `http://localhost:8080` |
| `MAIL_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP | `587` |
| `MAIL_USERNAME` | Cuenta SMTP | vacío |
| `MAIL_PASSWORD` | Contraseña de aplicación SMTP | vacío |
| `MAIL_ENABLED` | Activa o desactiva correos | `true` |
| `MAIL_FROM` | Remitente | vacío |

`application.properties` resuelve la base así:

```properties
spring.datasource.url=${DB_URL:jdbc:sqlserver://novah.database.windows.net:1433;databaseName=NovaHotelDB;encrypt=true;trustServerCertificate=false;loginTimeout=30;}
spring.datasource.username=${DB_USERNAME:}
spring.datasource.password=${DB_PASSWORD:}
server.port=${SERVER_PORT:8080}
```

En Azure se mantiene el mismo esquema que ya usaba el proyecto: definir `DB_URL`, `DB_USERNAME` y `DB_PASSWORD` en App Service, en el IDE o en el pipeline. En local, `scripts/floci-local.ps1` escribe `.env.floci` (ignorado por Git) y `scripts/run-local.ps1` lo carga.

> `.env.floci` no se versiona. La plantilla pública es `.env.example`.

---

## 6. Puesta en marcha

### 6.1 Levantar Floci AZ y la base de datos

```powershell
.\scripts\floci-local.ps1 all
```

El script:

1. Ejecuta `docker compose -f docker-compose.floci.yml up -d`.
2. Espera a que `http://localhost:4577` responda.
3. Crea el servidor lógico `novahotel-sql` con el proveedor `managed`.
4. Espera a que el contenedor SQL Server 2025 quede `Ready`.
5. Crea la base `NovaHotelDB` (por ARM y, como respaldo, con `sqlcmd`).
6. Obtiene el puerto publicado en el host y escribe `.env.floci`.

Salida esperada (resumida):

```text
==> Levantando floci-az
==> Creando SQL Server logico 'novahotel-sql' (contenedor SQL Server 2025)
   estado del servidor SQL: Ready
==> Creando base de datos 'NovaHotelDB'
==> Obteniendo cadena de conexion del data plane
   host: localhost
   puerto SQL Server (host): 64276
   variables escritas en .env.floci
```

### 6.2 Ejecutar el backend

```powershell
.\scripts\run-local.ps1
```

El script compila y arranca Spring Boot con las variables de `.env.floci`. Para saltar la compilación (si ya generaste el JAR):

```powershell
.\scripts\run-local.ps1 -SkipBuild
```

También puedes hacerlo manualmente:

```powershell
$env:DB_URL="jdbc:sqlserver://localhost:64276;databaseName=NovaHotelDB;encrypt=true;trustServerCertificate=true;loginTimeout=30;"
$env:DB_USERNAME="sa"
$env:DB_PASSWORD="NovaHotel!2026"
.\mvnw.cmd spring-boot:run
```

### 6.3 Verificar la conexión

Con la aplicación en marcha:

```powershell
Invoke-RestMethod http://localhost:8080/api/habitaciones
```

Crear una habitación:

```powershell
$body = '{"numero":"101","tipo":"clasica","planta":1,"capacidad":2,"precioNoche":180.00,"estado":"Disponible"}'
Invoke-RestMethod -Uri http://localhost:8080/api/habitaciones -Method Post -ContentType "application/json" -Body $body
```

Respuesta:

```json
{"ocupadaHoy":false,"idHabitacion":1,"numero":"101","tipo":"clasica","planta":1,"capacidad":2,"precioNoche":180.00,"estado":"Disponible"}
```

### 6.4 Detener

```powershell
# Detener Spring Boot con Ctrl+C y luego:
.\scripts\floci-local.ps1 down
```

---

## 7. Configuración para Azure real

En producción no cambies código: solo define las variables.

```text
DB_URL=jdbc:sqlserver://novah.database.windows.net:1433;databaseName=NovaHotelDB;encrypt=true;trustServerCertificate=false;loginTimeout=30;
DB_USERNAME=<usuario>
DB_PASSWORD=<password>
APP_BASE_URL=https://<tu-dominio>
SERVER_PORT=8080
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<correo>
MAIL_PASSWORD=<contrasena-de-aplicacion>
MAIL_ENABLED=true
```

En Azure App Service puedes usar **Key Vault references** para `DB_PASSWORD` y `MAIL_PASSWORD`, manteniendo el mismo patrón de variables de entorno.

---

## 8. Evidencias de la entrega

| Evidencia | Archivo |
|---|---|
| Floci AZ inicializado, reachable y SQL Server con puerto publicado | [`docs/evidencias/01-floci-status.txt`](docs/evidencias/01-floci-status.txt) |
| Base `NovaHotelDB`, tablas creadas y 1 habitación persistida | [`docs/evidencias/02-sql-verificacion.txt`](docs/evidencias/02-sql-verificacion.txt) |
| Spring Boot conectado: HikariCP, Tomcat y aplicación iniciada | [`docs/evidencias/03-springboot-startup.log`](docs/evidencias/03-springboot-startup.log) |
| POST `201` y GET con la habitación persistida | [`docs/evidencias/04-api-crud.txt`](docs/evidencias/04-api-crud.txt) |

Fragmentos clave:

```text
HikariPool-1 - Start completed.
Tomcat started on port 8080 (http) with context path '/'
Started NovahotelApplication in 8.419 seconds
```

```text
dbo.Habitaciones
dbo.Reservas
dbo.Roles
dbo.Usuarios
```

```text
POST /api/habitaciones -> HTTP 201
GET  /api/habitaciones -> HTTP 200 [{"idHabitacion":1,"numero":"101", ...}]
```

---

## 9. Pruebas

Las pruebas unitarias usan H2 en memoria y no requieren Docker:

```powershell
.\mvnw.cmd test
```

Empaquetar sin pruebas:

```powershell
.\mvnw.cmd -DskipTests package
```

---

## 10. Publicar en GitHub

El proyecto se entrega con repositorio Git local inicializado. Para publicarlo:

```powershell
git remote add origin https://github.com/<usuario>/<repositorio>.git
git branch -M main
git push -u origin main
```

Si el repositorio remoto ya existe y tiene contenido, revisa primero:

```powershell
git remote -v
git status
git pull --rebase origin main
```

---

## 11. Solución de problemas

| Problema | Solución |
|---|---|
| Docker no responde | Abre Docker Desktop y espera a que el motor Linux esté listo (`docker info`). |
| Error `EulaNotAccepted` | El compose ya define `FLOCI_AZ_SERVICES_SQL_ACCEPT_EULA=Y`; verifica que estés usando `docker-compose.floci.yml`. |
| `DataPlaneNotEnabled` | Confirma `FLOCI_AZ_SERVICES_SQL_DATA_PLANE_PROVIDER=managed`. |
| Spring Boot sigue apuntando a Azure | Ejecuta con `.\scripts\run-local.ps1` o define `DB_URL` en la misma terminal antes de arrancar. |
| `Cannot open database "NovaHotelDB"` | Vuelve a ejecutar `.\scripts\floci-local.ps1 init`; el script crea la base también con `sqlcmd`. |
| El puerto cambió | Cada reinicio del contenedor SQL puede asignar otro puerto. Vuelve a ejecutar `.\scripts\floci-local.ps1 env` para regenerar `.env.floci`. |
| Puerto 8080 ocupado | Define `SERVER_PORT=8081` o detén el proceso que lo usa. |
| Reiniciar todo desde cero | `.\scripts\floci-local.ps1 down`, elimina `.floci-az-data` y `.env.floci`, y vuelve a ejecutar `all`. |
| Diagnóstico de Floci | `floci az doctor`, `floci az status`, `docker logs floci-az`. |

---

## 12. Referencias

- Floci: <https://floci.io/>
- Floci AZ: <https://floci.io/az/>
- Azure SQL en Floci: <https://floci.io/floci-az/services/sql/>
- Repositorio de floci-az: <https://github.com/floci-io/floci-az>
- Spring Boot: <https://spring.io/projects/spring-boot>
- Azure SQL Database: <https://learn.microsoft.com/azure/azure-sql/>
