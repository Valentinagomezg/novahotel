package com.novahotel.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "Reservas", schema = "dbo")
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reserva")
    private Integer idReserva;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_llegada", nullable = false)
    private LocalDate fechaLlegada;

    @Column(name = "fecha_salida", nullable = false)
    private LocalDate fechaSalida;

    @Column(name = "noches", nullable = false)
    private Integer noches;

    @Column(name = "adultos", nullable = false)
    private Integer adultos;

    @Column(name = "ninos", nullable = false)
    private Integer ninos;

    @Column(name = "tipo_habitacion", nullable = false)
    private String tipoHabitacion;

    @Column(name = "precio_noche", nullable = false)
    private BigDecimal precioNoche;

    @Column(name = "extras")
    private String extras;

    @Column(name = "metodo_pago")
    private String metodoPago;

    @Column(name = "telefono")
    private String telefono;

    @Column(name = "pais")
    private String pais;

    @Column(name = "ciudad")
    private String ciudad;

    @Column(name = "peticiones")
    private String peticiones;

    @Column(name = "total", nullable = false)
    private BigDecimal total;

    @Column(name = "estado", nullable = false)
    private String estado;

    @Column(name = "fecha_reserva", nullable = false)
    private LocalDateTime fechaReserva;

    @PrePersist
    public void antesDeGuardar() {
        if (fechaReserva == null) {
            fechaReserva = LocalDateTime.now();
        }
        if (estado == null) {
            estado = "Pendiente";
        }
    }

    public Integer getIdReserva() { return idReserva; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public LocalDate getFechaLlegada() { return fechaLlegada; }
    public void setFechaLlegada(LocalDate fechaLlegada) { this.fechaLlegada = fechaLlegada; }
    public LocalDate getFechaSalida() { return fechaSalida; }
    public void setFechaSalida(LocalDate fechaSalida) { this.fechaSalida = fechaSalida; }
    public Integer getNoches() { return noches; }
    public void setNoches(Integer noches) { this.noches = noches; }
    public Integer getAdultos() { return adultos; }
    public void setAdultos(Integer adultos) { this.adultos = adultos; }
    public Integer getNinos() { return ninos; }
    public void setNinos(Integer ninos) { this.ninos = ninos; }
    public String getTipoHabitacion() { return tipoHabitacion; }
    public void setTipoHabitacion(String tipoHabitacion) { this.tipoHabitacion = tipoHabitacion; }
    public BigDecimal getPrecioNoche() { return precioNoche; }
    public void setPrecioNoche(BigDecimal precioNoche) { this.precioNoche = precioNoche; }
    public String getExtras() { return extras; }
    public void setExtras(String extras) { this.extras = extras; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getPais() { return pais; }
    public void setPais(String pais) { this.pais = pais; }
    public String getCiudad() { return ciudad; }
    public void setCiudad(String ciudad) { this.ciudad = ciudad; }
    public String getPeticiones() { return peticiones; }
    public void setPeticiones(String peticiones) { this.peticiones = peticiones; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getFechaReserva() { return fechaReserva; }
    public void setFechaReserva(LocalDateTime fechaReserva) { this.fechaReserva = fechaReserva; }
}
