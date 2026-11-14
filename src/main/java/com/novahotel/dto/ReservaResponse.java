package com.novahotel.dto;

import com.novahotel.entity.Reserva;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ReservaResponse {

    private final Integer idReserva;
    private final Integer idUsuario;
    private final String huesped;
    private final String correo;
    private final LocalDate fechaLlegada;
    private final LocalDate fechaSalida;
    private final Integer noches;
    private final Integer adultos;
    private final Integer ninos;
    private final String tipoHabitacion;
    private final BigDecimal precioNoche;
    private final String extras;
    private final String metodoPago;
    private final String telefono;
    private final String pais;
    private final String ciudad;
    private final String peticiones;
    private final BigDecimal total;
    private final String estado;
    private final LocalDateTime fechaReserva;

    public ReservaResponse(Reserva reserva) {
        this.idReserva = reserva.getIdReserva();
        this.idUsuario = reserva.getUsuario().getIdUsuario();
        this.huesped = reserva.getUsuario().getNombre() + " " + reserva.getUsuario().getApellidos();
        this.correo = reserva.getUsuario().getCorreo();
        this.fechaLlegada = reserva.getFechaLlegada();
        this.fechaSalida = reserva.getFechaSalida();
        this.noches = reserva.getNoches();
        this.adultos = reserva.getAdultos();
        this.ninos = reserva.getNinos();
        this.tipoHabitacion = reserva.getTipoHabitacion();
        this.precioNoche = reserva.getPrecioNoche();
        this.extras = reserva.getExtras();
        this.metodoPago = reserva.getMetodoPago();
        this.telefono = reserva.getTelefono();
        this.pais = reserva.getPais();
        this.ciudad = reserva.getCiudad();
        this.peticiones = reserva.getPeticiones();
        this.total = reserva.getTotal();
        this.estado = reserva.getEstado();
        this.fechaReserva = reserva.getFechaReserva();
    }

    public Integer getIdReserva() { return idReserva; }
    public Integer getIdUsuario() { return idUsuario; }
    public String getHuesped() { return huesped; }
    public String getCorreo() { return correo; }
    public LocalDate getFechaLlegada() { return fechaLlegada; }
    public LocalDate getFechaSalida() { return fechaSalida; }
    public Integer getNoches() { return noches; }
    public Integer getAdultos() { return adultos; }
    public Integer getNinos() { return ninos; }
    public String getTipoHabitacion() { return tipoHabitacion; }
    public BigDecimal getPrecioNoche() { return precioNoche; }
    public String getExtras() { return extras; }
    public String getMetodoPago() { return metodoPago; }
    public String getTelefono() { return telefono; }
    public String getPais() { return pais; }
    public String getCiudad() { return ciudad; }
    public String getPeticiones() { return peticiones; }
    public BigDecimal getTotal() { return total; }
    public String getEstado() { return estado; }
    public LocalDateTime getFechaReserva() { return fechaReserva; }
}
