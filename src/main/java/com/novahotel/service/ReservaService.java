package com.novahotel.service;

import com.novahotel.dto.ReservaRequest;
import com.novahotel.dto.ReservaResponse;
import com.novahotel.entity.Reserva;
import com.novahotel.entity.Usuario;
import com.novahotel.repository.HabitacionRepository;
import com.novahotel.repository.ReservaRepository;
import com.novahotel.repository.UsuarioRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

@Service
public class ReservaService {

    private static final Set<String> ESTADOS_VALIDOS = Set.of("Pendiente", "Confirmada", "Check-in", "Cancelada");

    private final ReservaRepository reservaRepository;
    private final UsuarioRepository usuarioRepository;
    private final HabitacionRepository habitacionRepository;
    private final EmailService emailService;

    public ReservaService(
            ReservaRepository reservaRepository,
            UsuarioRepository usuarioRepository,
            HabitacionRepository habitacionRepository,
            EmailService emailService
    ) {
        this.reservaRepository = reservaRepository;
        this.usuarioRepository = usuarioRepository;
        this.habitacionRepository = habitacionRepository;
        this.emailService = emailService;
    }

    @Transactional
    public ReservaResponse crear(ReservaRequest request) {

        if (request.getIdUsuario() == null) {
            throw new IllegalArgumentException("Debes iniciar sesión para reservar");
        }

        Usuario usuario = usuarioRepository.findById(request.getIdUsuario())
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));

        if (request.getFechaLlegada() == null || request.getFechaSalida() == null) {
            throw new IllegalArgumentException("Las fechas de llegada y salida son obligatorias");
        }

        if (request.getFechaLlegada().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("La fecha de llegada no puede ser anterior a hoy");
        }

        if (!request.getFechaSalida().isAfter(request.getFechaLlegada())) {
            throw new IllegalArgumentException("La fecha de salida debe ser posterior a la de llegada");
        }

        long noches = ChronoUnit.DAYS.between(request.getFechaLlegada(), request.getFechaSalida());
        if (noches < 1) {
            throw new IllegalArgumentException("La reserva debe ser de al menos una noche");
        }

        if (request.getAdultos() == null || request.getAdultos() < 1) {
            throw new IllegalArgumentException("Debe haber al menos un adulto");
        }

        int ninos = request.getNinos() == null ? 0 : request.getNinos();
        if (ninos < 0) {
            throw new IllegalArgumentException("El número de niños no es válido");
        }

        verificarDisponibilidad(
                request.getTipoHabitacion(),
                request.getFechaLlegada(),
                request.getFechaSalida()
        );

        BigDecimal precioNoche = precioHabitacion(request.getTipoHabitacion());
        BigDecimal extra = precioExtra(request.getExtras());
        BigDecimal total = precioNoche.multiply(BigDecimal.valueOf(noches)).add(extra);

        Reserva reserva = new Reserva();
        reserva.setUsuario(usuario);
        reserva.setFechaLlegada(request.getFechaLlegada());
        reserva.setFechaSalida(request.getFechaSalida());
        reserva.setNoches((int) noches);
        reserva.setAdultos(request.getAdultos());
        reserva.setNinos(ninos);
        reserva.setTipoHabitacion(request.getTipoHabitacion());
        reserva.setPrecioNoche(precioNoche);
        reserva.setExtras(request.getExtras());
        reserva.setMetodoPago(request.getMetodoPago());
        reserva.setTelefono(request.getTelefono());
        reserva.setPais(request.getPais());
        reserva.setCiudad(request.getCiudad());
        reserva.setPeticiones(request.getPeticiones());
        reserva.setTotal(total);
        reserva.setEstado("Pendiente");

        Reserva guardada = reservaRepository.save(reserva);
        emailService.enviarConfirmacionReserva(guardada);

        return new ReservaResponse(guardada);
    }

    @Transactional(readOnly = true)
    public List<ReservaResponse> listarPorUsuario(Integer idUsuario) {
        return reservaRepository.findByUsuario_IdUsuarioOrderByFechaLlegadaDesc(idUsuario)
                .stream()
                .map(ReservaResponse::new)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReservaResponse> listarTodas() {
        return reservaRepository.findAllByOrderByFechaReservaDesc()
                .stream()
                .map(ReservaResponse::new)
                .toList();
    }

    @Transactional
    public ReservaResponse actualizarEstado(Integer idReserva, String estado) {
        Reserva reserva = reservaRepository.findById(idReserva)
                .orElseThrow(() -> new IllegalArgumentException("La reserva no existe"));

        reserva.setEstado(normalizarEstado(estado));

        return new ReservaResponse(reservaRepository.save(reserva));
    }

    @Transactional
    public ReservaResponse cancelar(Integer idReserva, Integer idUsuario) {
        Reserva reserva = reservaRepository.findById(idReserva)
                .orElseThrow(() -> new IllegalArgumentException("La reserva no existe"));

        if (idUsuario == null || reserva.getUsuario() == null
                || !idUsuario.equals(reserva.getUsuario().getIdUsuario())) {
            throw new IllegalArgumentException("No puedes cancelar esta reserva");
        }

        if ("Cancelada".equalsIgnoreCase(reserva.getEstado())) {
            throw new IllegalArgumentException("La reserva ya está cancelada");
        }

        if ("Check-in".equalsIgnoreCase(reserva.getEstado())) {
            throw new IllegalArgumentException("No se puede cancelar una estancia en curso");
        }

        reserva.setEstado("Cancelada");

        return new ReservaResponse(reservaRepository.save(reserva));
    }

    private String normalizarEstado(String estado) {
        if (estado == null || estado.isBlank()) {
            throw new IllegalArgumentException("El estado es obligatorio");
        }

        String limpio = estado.trim().toLowerCase();
        String canonico = switch (limpio) {
            case "pendiente" -> "Pendiente";
            case "confirmada" -> "Confirmada";
            case "check-in", "checkin", "check in" -> "Check-in";
            case "cancelada" -> "Cancelada";
            default -> null;
        };

        if (canonico == null || !ESTADOS_VALIDOS.contains(canonico)) {
            throw new IllegalArgumentException("Estado de reserva no válido");
        }

        return canonico;
    }

    private void verificarDisponibilidad(String tipo, LocalDate llegada, LocalDate salida) {
        String tipoNormalizado = tipo.trim().toLowerCase();
        long habitacionesDisponibles =
                habitacionRepository.countByTipoIgnoreCaseAndEstado(tipoNormalizado, "Disponible");

        if (habitacionesDisponibles == 0) {
            return;
        }

        long reservasSolapadas = reservaRepository.findAll().stream()
                .filter(reserva -> !"Cancelada".equalsIgnoreCase(reserva.getEstado()))
                .filter(reserva -> reserva.getFechaLlegada() != null && reserva.getFechaSalida() != null)
                .filter(reserva -> tipoNormalizado.equalsIgnoreCase(reserva.getTipoHabitacion()))
                .filter(reserva -> reserva.getFechaLlegada().isBefore(salida)
                        && reserva.getFechaSalida().isAfter(llegada))
                .count();

        if (reservasSolapadas >= habitacionesDisponibles) {
            throw new IllegalArgumentException(
                    "No hay disponibilidad para esas fechas en la habitación seleccionada"
            );
        }
    }

    private BigDecimal precioHabitacion(String tipo) {
        if (tipo == null) {
            throw new IllegalArgumentException("Debes elegir una habitación");
        }

        return switch (tipo.trim().toLowerCase()) {
            case "clasica" -> new BigDecimal("180.00");
            case "deluxe" -> new BigDecimal("240.00");
            case "nova" -> new BigDecimal("480.00");
            default -> throw new IllegalArgumentException("Tipo de habitación no válido");
        };
    }

    private BigDecimal precioExtra(String extras) {
        if (extras == null || extras.isBlank()) {
            return BigDecimal.ZERO;
        }

        return switch (extras.trim()) {
            case "Traslado aeropuerto · 60 €" -> new BigDecimal("60.00");
            case "Cena romántica · 120 €" -> new BigDecimal("120.00");
            case "Ritual spa para dos · 90 €" -> new BigDecimal("90.00");
            case "Pack bienvenida · 45 €" -> new BigDecimal("45.00");
            default -> BigDecimal.ZERO;
        };
    }
}
