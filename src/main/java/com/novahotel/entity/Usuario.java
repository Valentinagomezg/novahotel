
package com.novahotel.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Usuarios", schema = "dbo")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "nombre")
    private String nombre;

    @Column(name = "apellidos")
    private String apellidos;

    @Column(name = "correo")
    private String correo;

    @Column(name = "password_hash")
    private String passwordHash;

    @ManyToOne
    @JoinColumn(name = "id_rol")
    private Rol rol;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    @Column(name = "correo_verificado")
    private Boolean correoVerificado;

    @Column(name = "token_confirmacion", length = 64)
    private String tokenConfirmacion;

    @Column(name = "token_expiracion")
    private LocalDateTime tokenExpiracion;

    @PrePersist
    public void antesDeGuardar() {
        fechaRegistro = LocalDateTime.now();
    }

    public Integer getIdUsuario() { return idUsuario; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getApellidos() { return apellidos; }
    public void setApellidos(String apellidos) { this.apellidos = apellidos; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
    public Rol getRol() { return rol; }
    public void setRol(Rol rol) { this.rol = rol; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(LocalDateTime fechaRegistro) { this.fechaRegistro = fechaRegistro; }
    public Boolean getCorreoVerificado() { return correoVerificado; }
    public void setCorreoVerificado(Boolean correoVerificado) { this.correoVerificado = correoVerificado; }
    public String getTokenConfirmacion() { return tokenConfirmacion; }
    public void setTokenConfirmacion(String tokenConfirmacion) { this.tokenConfirmacion = tokenConfirmacion; }
    public LocalDateTime getTokenExpiracion() { return tokenExpiracion; }
    public void setTokenExpiracion(LocalDateTime tokenExpiracion) { this.tokenExpiracion = tokenExpiracion; }
}
