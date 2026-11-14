package com.novahotel.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class HuespedResponse {

    private final Integer idUsuario;
    private final String nombre;
    private final String apellidos;
    private final String correo;
    private final String rol;
    private final LocalDateTime fechaRegistro;
    private final int totalReservas;
    private final int reservasActivas;
    private final BigDecimal totalGastado;
    private final LocalDateTime ultimaReserva;
    private final String telefono;
    private final String pais;
    private final String ciudad;

    public HuespedResponse(
            Integer idUsuario,
            String nombre,
            String apellidos,
            String correo,
            String rol,
            LocalDateTime fechaRegistro,
            int totalReservas,
            int reservasActivas,
            BigDecimal totalGastado,
            LocalDateTime ultimaReserva,
            String telefono,
            String pais,
            String ciudad
    ) {
        this.idUsuario = idUsuario;
        this.nombre = nombre;
        this.apellidos = apellidos;
        this.correo = correo;
        this.rol = rol;
        this.fechaRegistro = fechaRegistro;
        this.totalReservas = totalReservas;
        this.reservasActivas = reservasActivas;
        this.totalGastado = totalGastado;
        this.ultimaReserva = ultimaReserva;
        this.telefono = telefono;
        this.pais = pais;
        this.ciudad = ciudad;
    }

    public Integer getIdUsuario() { return idUsuario; }
    public String getNombre() { return nombre; }
    public String getApellidos() { return apellidos; }
    public String getCorreo() { return correo; }
    public String getRol() { return rol; }
    public LocalDateTime getFechaRegistro() { return fechaRegistro; }
    public int getTotalReservas() { return totalReservas; }
    public int getReservasActivas() { return reservasActivas; }
    public BigDecimal getTotalGastado() { return totalGastado; }
    public LocalDateTime getUltimaReserva() { return ultimaReserva; }
    public String getTelefono() { return telefono; }
    public String getPais() { return pais; }
    public String getCiudad() { return ciudad; }
}
