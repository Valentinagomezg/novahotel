# Análisis de Floci aplicado a NOVA Hotels

## 1. Qué es Floci

Floci es una familia de emuladores locales de nube, con licencia MIT y sin cuenta ni credenciales reales. Expone servicios compatibles por protocolo en un puerto local:

| Emulador | Nube | Puerto |
|---|---|---|
| floci | AWS | 4566 |
| floci-az | Azure | 4577 |
| floci-gcp | GCP | 4588 |
| floci-oci | OCI | 4599 |

Para NOVA Hotels el emulador relevante es **floci-az**, porque el proyecto ya está construido para Azure SQL Server (`mssql-jdbc`, `SQLServerDialect`) y correo SMTP. Floci permite probar el backend contra servicios Azure sin crear una suscripción ni gastar crédito.

## 2. Servicios de floci-az que se acoplan al proyecto

| Servicio Floci AZ | Qué aporta | Uso propuesto en NOVA Hotels | Prioridad |
|---|---|---|---|
| **Azure SQL Database** | SQL Server 2025 real en Docker, con servidores, bases y cadenas JDBC | Base de datos `NovaHotelDB` para `Usuarios`, `Roles`, `Habitaciones` y `Reservas`. Es el servicio ya integrado. | Implementado |
| **Blob Storage** | Contenedores y blobs con API compatible con Azure Storage | Guardar fotos de habitaciones, comprobantes de reserva o PDFs de factura en lugar de `src/main/resources/static`. | Alta |
| **Queue Storage** | Colas con visibilidad y reintentos | Encolar el envío de correos de confirmación para que el registro de usuario no dependa del SMTP. | Alta |
| **Service Bus** | Colas y tópicos AMQP | Publicar eventos `reserva.creada`, `reserva.cancelada`, `checkin.realizado` para notificaciones y auditoría. | Media |
| **Communication Services Email** | API HTTP de correo con buzón local inspeccionable | Alternativa local a Gmail SMTP: los correos no salen, se pueden leer en `GET /emailMessages`. Útil para pruebas automatizadas. | Media |
| **Key Vault** | Secretos, versiones y borrado suave | Guardar `DB_PASSWORD`, `MAIL_PASSWORD` y el código de administrador en lugar de variables planas. | Media |
| **App Configuration** | Key-values, etiquetas y feature flags | Externalizar `app.admin-code`, `app.mail.enabled`, tarifas base o banderas de funcionalidades. | Media |
| **Microsoft Entra ID** | OIDC/OAuth2, JWKS | Evolucionar el login actual (BCrypt + sesión propia) a JWT con un proveedor de identidad local. | Futuro |
| **Azure Cache for Redis** | Redis/Valkey real | Cachear disponibilidad de habitaciones y sesiones cuando aumente la carga. | Futuro |
| **Azure Functions** | Funciones HTTP/Timer | Recordatorios de check-in, limpieza de reservas expiradas o reportes programados. | Futuro |
| **Azure Monitor / Log Analytics** | Logs, métricas y KQL | Centralizar trazas del backend y consultas de auditoría en local. | Opcional |

## 3. Decisión para esta entrega

Se implementó el servicio de mayor impacto y menor riesgo: **Azure SQL Database** con el proveedor `managed` de floci-az. Así, el mismo código y el mismo driver `mssql-jdbc` que se usan contra Azure SQL se ejecutan contra un SQL Server 2025 real en Docker.

Los demás servicios quedan documentados y listos para incorporarse de forma incremental; no se agregaron dependencias nuevas al `pom.xml` para no romper la compilación ni el alcance del proyecto.

## 4. Cómo se conecta Spring Boot

`application.properties` ya no lleva credenciales ni un host fijo:

```properties
spring.datasource.url=${DB_URL:jdbc:sqlserver://novah.database.windows.net:1433;databaseName=NovaHotelDB;encrypt=true;trustServerCertificate=false;loginTimeout=30;}
spring.datasource.username=${DB_USERNAME:}
spring.datasource.password=${DB_PASSWORD:}
```

- En Azure se definen `DB_URL`, `DB_USERNAME` y `DB_PASSWORD` en App Service o en el IDE.
- En local, `scripts/floci-local.ps1` crea el SQL Server y la base, obtiene el puerto publicado en el host y escribe `.env.floci`. Luego `scripts/run-local.ps1` carga ese archivo como variables de entorno.

Esto mantiene el mismo patrón de configuración por variables de entorno usado con Spring Boot + Azure, pero apuntando al emulador compartido.

## 5. Consideraciones de floci-az Azure SQL

- El plano de control (ARM) vive en `http://localhost:4577`.
- El plano de datos es un contenedor `mcr.microsoft.com/mssql/server:2025-latest`.
- El contenedor publica un puerto dinámico en el host; se obtiene con `docker port`.
- El endpoint `/connect` devuelve el hostname interno de Docker y el puerto interno (`1433`), por eso el script traduce el puerto al publicado en el host.
- El proveedor `managed` exige aceptar la EULA con `FLOCI_AZ_SERVICES_SQL_ACCEPT_EULA=Y`.
- En la versión probada, la base creada por ARM quedó registrada en el plano de control pero no apareció en el contenedor. El script la crea también con `sqlcmd` para garantizar la conexión JDBC.

## 6. Referencias

- Sitio oficial: <https://floci.io/>
- floci-az: <https://floci.io/az/>
- Documentación de Azure SQL: <https://floci.io/floci-az/services/sql/>
- Documentación de correo: <https://floci.io/floci-az/services/email/>
- Repositorio: <https://github.com/floci-io/floci-az>
