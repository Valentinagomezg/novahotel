-- Ejecutar en la base de datos NovaHotelDB (Azure SQL) si prefieres mantener
-- spring.jpa.hibernate.ddl-auto=validate en lugar de update.
IF COL_LENGTH('dbo.Usuarios', 'correo_verificado') IS NULL
    ALTER TABLE dbo.Usuarios ADD correo_verificado bit NULL;

IF COL_LENGTH('dbo.Usuarios', 'token_confirmacion') IS NULL
    ALTER TABLE dbo.Usuarios ADD token_confirmacion varchar(64) NULL;

IF COL_LENGTH('dbo.Usuarios', 'token_expiracion') IS NULL
    ALTER TABLE dbo.Usuarios ADD token_expiracion datetime2 NULL;
