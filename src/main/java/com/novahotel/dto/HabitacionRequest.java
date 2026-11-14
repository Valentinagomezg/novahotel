package com.novahotel.dto;

import java.math.BigDecimal;

public class HabitacionRequest {

    private String numero;
    private String tipo;
    private Integer planta;
    private Integer capacidad;
    private BigDecimal precioNoche;
    private String estado;

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Integer getPlanta() { return planta; }
    public void setPlanta(Integer planta) { this.planta = planta; }
    public Integer getCapacidad() { return capacidad; }
    public void setCapacidad(Integer capacidad) { this.capacidad = capacidad; }
    public BigDecimal getPrecioNoche() { return precioNoche; }
    public void setPrecioNoche(BigDecimal precioNoche) { this.precioNoche = precioNoche; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}
