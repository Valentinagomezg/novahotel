package com.novahotel.dto;

public class UsuarioResponse {

    private final Integer idUsuario;
    private final String nombre;
    private final String apellidos;
    private final String correo;
    private final String rol;

    public UsuarioResponse(Integer idUsuario, String nombre, String apellidos, String correo, String rol) {
        this.idUsuario = idUsuario;
        this.nombre = nombre;
        this.apellidos = apellidos;
        this.correo = correo;
        this.rol = rol;
    }

    public Integer getIdUsuario() {
        return idUsuario;
    }

    public String getNombre() {
        return nombre;
    }

    public String getApellidos() {
        return apellidos;
    }

    public String getCorreo() {
        return correo;
    }

    public String getRol() {
        return rol;
    }
}
