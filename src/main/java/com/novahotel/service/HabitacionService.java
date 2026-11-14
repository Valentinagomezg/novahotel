package com.novahotel.service;

import com.novahotel.dto.HabitacionRequest;
import com.novahotel.dto.HabitacionResponse;
import com.novahotel.entity.Habitacion;
import com.novahotel.entity.Reserva;
import com.novahotel.repository.HabitacionRepository;
import com.novahotel.repository.ReservaRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class HabitacionService {

    private static final Set<String> ESTADOS_VALIDOS = Set.of("Disponible", "Limpieza", "Mantenimiento");

    private final HabitacionRepository habitacionRepository;
    private final ReservaRepository reservaRepository;

    public HabitacionService(HabitacionRepository habitacionRepository, ReservaRepository reservaRepository) {
        this.habitacionRepository = habitacionRepository;
        this.reservaRepository = reservaRepository;
    }

    @Transactional(readOnly = true)
    public List<HabitacionResponse> listar() {
        Map<String, Integer> ocupadasPorTipo = ocupadasHoyPorTipo();
        List<HabitacionResponse> respuesta = new ArrayList<>();

        for (Habitacion habitacion : habitacionRepository.findAllByOrderByNumeroAsc()) {
            String tipo = normalizar(habitacion.getTipo());
            int restantes = ocupadasPorTipo.getOrDefault(tipo, 0);
            boolean ocupada = "Disponible".equalsIgnoreCase(habitacion.getEstado()) && restantes > 0;
            if (ocupada) {
                ocupadasPorTipo.put(tipo, restantes - 1);
            }
            respuesta.add(new HabitacionResponse(habitacion, ocupada));
        }

        return respuesta;
    }

    @Transactional
    public HabitacionResponse crear(HabitacionRequest request) {
        if (request.getNumero() == null || request.getNumero().isBlank()) {
            throw new IllegalArgumentException("El número de habitación es obligatorio");
        }

        String numero = request.getNumero().trim();
        if (habitacionRepository.existsByNumero(numero)) {
            throw new IllegalArgumentException("Ya existe una habitación con ese número");
        }

        String tipo = normalizarTipo(request.getTipo());
        int planta = request.getPlanta() == null ? 1 : request.getPlanta();
        int capacidad = request.getCapacidad() == null ? 2 : request.getCapacidad();

        if (planta < 1) {
            throw new IllegalArgumentException("La planta debe ser mayor que cero");
        }
        if (capacidad < 1) {
            throw new IllegalArgumentException("La capacidad debe ser mayor que cero");
        }

        BigDecimal precio = request.getPrecioNoche() != null
                ? request.getPrecioNoche()
                : precioBase(tipo);

        if (precio.signum() <= 0) {
            throw new IllegalArgumentException("El precio por noche debe ser mayor que cero");
        }

        Habitacion habitacion = new Habitacion();
        habitacion.setNumero(numero);
        habitacion.setTipo(tipo);
        habitacion.setPlanta(planta);
        habitacion.setCapacidad(capacidad);
        habitacion.setPrecioNoche(precio);
        habitacion.setEstado(normalizarEstado(request.getEstado()));

        return new HabitacionResponse(habitacionRepository.save(habitacion), false);
    }

    @Transactional
    public HabitacionResponse actualizarEstado(Integer idHabitacion, String estado) {
        Habitacion habitacion = habitacionRepository.findById(idHabitacion)
                .orElseThrow(() -> new IllegalArgumentException("La habitación no existe"));

        habitacion.setEstado(normalizarEstado(estado));
        habitacionRepository.save(habitacion);

        return listar().stream()
                .filter(respuesta -> respuesta.getIdHabitacion().equals(idHabitacion))
                .findFirst()
                .orElseGet(() -> new HabitacionResponse(habitacion, false));
    }

    private Map<String, Integer> ocupadasHoyPorTipo() {
        LocalDate hoy = LocalDate.now();
        Map<String, Integer> ocupadas = new HashMap<>();

        for (Reserva reserva : reservaRepository.findAll()) {
            if ("Cancelada".equalsIgnoreCase(reserva.getEstado())) {
                continue;
            }
            if (reserva.getFechaLlegada() == null || reserva.getFechaSalida() == null) {
                continue;
            }
            boolean enCurso = !reserva.getFechaLlegada().isAfter(hoy)
                    && reserva.getFechaSalida().isAfter(hoy);
            if (enCurso) {
                ocupadas.merge(normalizar(reserva.getTipoHabitacion()), 1, Integer::sum);
            }
        }

        return ocupadas;
    }

    private String normalizarTipo(String tipo) {
        if (tipo == null) {
            throw new IllegalArgumentException("El tipo de habitación es obligatorio");
        }
        return switch (tipo.trim().toLowerCase()) {
            case "clasica", "clásica" -> "clasica";
            case "deluxe" -> "deluxe";
            case "nova", "suite nova" -> "nova";
            default -> throw new IllegalArgumentException("Tipo de habitación no válido");
        };
    }

    private BigDecimal precioBase(String tipo) {
        return switch (tipo) {
            case "clasica" -> new BigDecimal("180.00");
            case "deluxe" -> new BigDecimal("240.00");
            default -> new BigDecimal("480.00");
        };
    }

    private String normalizarEstado(String estado) {
        if (estado == null || estado.isBlank()) {
            return "Disponible";
        }
        String limpio = estado.trim().toLowerCase();
        return switch (limpio) {
            case "disponible" -> "Disponible";
            case "limpieza" -> "Limpieza";
            case "mantenimiento" -> "Mantenimiento";
            default -> throw new IllegalArgumentException("Estado de habitación no válido");
        };
    }

    private String normalizar(String valor) {
        return valor == null ? "" : valor.trim().toLowerCase();
    }
}
