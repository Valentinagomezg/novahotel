package com.novahotel.dto;

import com.novahotel.entity.Habitacion;

import java.math.BigDecimal;

public class HabitacionResponse {

    private final Integer idHabitacion;
    private final String numero;
    private final String tipo;
    private final Integer planta;
    private final Integer capacidad;
    private final BigDecimal precioNoche;
    private final String estado;
    private final boolean ocupadaHoy;

    public HabitacionResponse(Habitacion habitacion, boolean ocupadaHoy) {
        this.idHabitacion = habitacion.getIdHabitacion();
        this.numero = habitacion.getNumero();
        this.tipo = habitacion.getTipo();
        this.planta = habitacion.getPlanta();
        this.capacidad = habitacion.getCapacidad();
        this.precioNoche = habitacion.getPrecioNoche();
        this.estado = habitacion.getEstado();
        this.ocupadaHoy = ocupadaHoy;
    }

    public Integer getIdHabitacion() { return idHabitacion; }
    public String getNumero() { return numero; }
    public String getTipo() { return tipo; }
    public Integer getPlanta() { return planta; }
    public Integer getCapacidad() { return capacidad; }
    public BigDecimal getPrecioNoche() { return precioNoche; }
    public String getEstado() { return estado; }
    public boolean isOcupadaHoy() { return ocupadaHoy; }
}
