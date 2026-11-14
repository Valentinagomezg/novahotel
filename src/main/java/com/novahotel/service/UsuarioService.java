package com.novahotel.service;

import com.novahotel.dto.HuespedResponse;
import com.novahotel.dto.LoginRequest;
import com.novahotel.dto.PerfilRequest;
import com.novahotel.dto.RegistroRequest;
import com.novahotel.dto.UsuarioResponse;
import com.novahotel.entity.Reserva;
import com.novahotel.entity.Usuario;
import com.novahotel.entity.Rol;
import com.novahotel.repository.ReservaRepository;
import com.novahotel.repository.UsuarioRepository;
import com.novahotel.repository.RolRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final ReservaRepository reservaRepository;
    private final BCryptPasswordEncoder encoder;
    private final EmailService emailService;
    private final String codigoAdmin;

    public UsuarioService(
            UsuarioRepository usuarioRepository,
            RolRepository rolRepository,
            ReservaRepository reservaRepository,
            BCryptPasswordEncoder encoder,
            EmailService emailService,
            @Value("${app.admin-code:1075652100}") String codigoAdmin
    ) {
        this.usuarioRepository = usuarioRepository;
        this.rolRepository = rolRepository;
        this.reservaRepository = reservaRepository;
        this.encoder = encoder;
        this.emailService = emailService;
        this.codigoAdmin = codigoAdmin;
    }

    @Transactional
    public Usuario registrar(RegistroRequest request) {

        if (request.getNombre() == null || request.getNombre().isBlank()
                || request.getApellidos() == null || request.getApellidos().isBlank()
                || request.getCorreo() == null || request.getCorreo().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Todos los campos son obligatorios");
        }

        String correo = request.getCorreo().trim().toLowerCase();

        if (usuarioRepository.existsByCorreo(correo)) {
            throw new IllegalArgumentException(
                    "Este correo ya está registrado"
            );
        }

        String nombreRol = "Usuario";

        if ("administrador".equalsIgnoreCase(request.getRol())) {
            if (request.getCodigoAdmin() == null
                    || !request.getCodigoAdmin().trim().equals(codigoAdmin)) {
                throw new IllegalArgumentException(
                        "El código de administrador no es válido"
                );
            }
            nombreRol = "Administrador";
        }

        final String rolSolicitado = nombreRol;
        Rol rol = rolRepository.findByNombreRol(rolSolicitado)
                .orElseThrow(() ->
                        new IllegalStateException("No existe el rol " + rolSolicitado)
                );

        Usuario usuario = new Usuario();
        usuario.setNombre(request.getNombre().trim());
        usuario.setApellidos(request.getApellidos().trim());
        usuario.setCorreo(correo);
        usuario.setRol(rol);
        usuario.setPasswordHash(encoder.encode(request.getPassword()));
        usuario.setCorreoVerificado(false);

        String token = UUID.randomUUID().toString().replace("-", "");
        usuario.setTokenConfirmacion(token);
        usuario.setTokenExpiracion(LocalDateTime.now().plusHours(48));

        Usuario guardado = usuarioRepository.save(usuario);
        emailService.enviarConfirmacionRegistro(guardado, token);

        return guardado;
    }

    @Transactional
    public boolean confirmarCorreo(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        Usuario usuario = usuarioRepository.findByTokenConfirmacion(token.trim()).orElse(null);
        if (usuario == null) {
            return false;
        }

        if (usuario.getTokenExpiracion() != null
                && usuario.getTokenExpiracion().isBefore(LocalDateTime.now())) {
            return false;
        }

        usuario.setCorreoVerificado(true);
        usuario.setTokenConfirmacion(null);
        usuario.setTokenExpiracion(null);
        usuarioRepository.save(usuario);
        return true;
    }

    @Transactional
    public void reenviarConfirmacion(String correo) {
        if (correo == null || correo.isBlank()) {
            throw new IllegalArgumentException("Ingresa tu correo electrónico");
        }

        Usuario usuario = usuarioRepository.findByCorreo(correo.trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No existe una cuenta con ese correo electrónico"
                ));

        if (Boolean.TRUE.equals(usuario.getCorreoVerificado())) {
            throw new IllegalArgumentException("Tu correo ya está confirmado. Ya puedes iniciar sesión.");
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        usuario.setTokenConfirmacion(token);
        usuario.setTokenExpiracion(LocalDateTime.now().plusHours(48));
        usuarioRepository.save(usuario);

        emailService.enviarConfirmacionRegistro(usuario, token);
    }

    @Transactional
    public UsuarioResponse actualizarPerfil(Integer idUsuario, PerfilRequest request) {
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new IllegalArgumentException("El usuario no existe"));

        if (request.getNombre() == null || request.getNombre().isBlank()
                || request.getApellidos() == null || request.getApellidos().isBlank()
                || request.getCorreo() == null || request.getCorreo().isBlank()) {
            throw new IllegalArgumentException("Nombre, apellidos y correo son obligatorios");
        }

        String correo = request.getCorreo().trim().toLowerCase();
        usuarioRepository.findByCorreo(correo).ifPresent(otro -> {
            if (!otro.getIdUsuario().equals(idUsuario)) {
                throw new IllegalArgumentException("Este correo ya está registrado por otra cuenta");
            }
        });

        usuario.setNombre(request.getNombre().trim());
        usuario.setApellidos(request.getApellidos().trim());
        usuario.setCorreo(correo);

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            if (request.getPassword().length() < 6) {
                throw new IllegalArgumentException("La contraseña debe tener al menos 6 caracteres");
            }
            usuario.setPasswordHash(encoder.encode(request.getPassword()));
        }

        return toResponse(usuarioRepository.save(usuario));
    }

    @Transactional(readOnly = true)
    public UsuarioResponse login(LoginRequest request) {

        if (request.getCorreo() == null || request.getCorreo().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Ingresa tu correo y contraseña");
        }

        String correo = request.getCorreo().trim().toLowerCase();

        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() ->
                        new IllegalArgumentException("Correo o contraseña incorrectos")
                );

        if (!encoder.matches(request.getPassword(), usuario.getPasswordHash())) {
            throw new IllegalArgumentException("Correo o contraseña incorrectos");
        }

        if (Boolean.FALSE.equals(usuario.getCorreoVerificado())) {
            throw new IllegalStateException(
                    "Debes confirmar tu correo electrónico antes de acceder. "
                            + "Revisa tu bandeja de entrada o solicita un nuevo enlace de confirmación."
            );
        }

        return toResponse(usuario);
    }

    public UsuarioResponse toResponse(Usuario usuario) {
        String rol = usuario.getRol() == null ? "Usuario" : usuario.getRol().getNombreRol();
        return new UsuarioResponse(
                usuario.getIdUsuario(),
                usuario.getNombre(),
                usuario.getApellidos(),
                usuario.getCorreo(),
                rol
        );
    }

    @Transactional(readOnly = true)
    public List<HuespedResponse> listarHuespedes() {
        Map<Integer, List<Reserva>> reservasPorUsuario = reservaRepository.findAll().stream()
                .filter(reserva -> reserva.getUsuario() != null)
                .collect(Collectors.groupingBy(reserva -> reserva.getUsuario().getIdUsuario()));

        List<HuespedResponse> huespedes = new ArrayList<>();

        for (Usuario usuario : usuarioRepository.findAll()) {
            List<Reserva> reservas = reservasPorUsuario.getOrDefault(usuario.getIdUsuario(), List.of());
            List<Reserva> activas = reservas.stream()
                    .filter(reserva -> !"Cancelada".equalsIgnoreCase(reserva.getEstado()))
                    .toList();

            BigDecimal totalGastado = activas.stream()
                    .map(Reserva::getTotal)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Reserva ultima = reservas.stream()
                    .max(Comparator.comparing(
                            Reserva::getFechaReserva,
                            Comparator.nullsLast(Comparator.naturalOrder())
                    ))
                    .orElse(null);

            String rol = usuario.getRol() == null ? "Usuario" : usuario.getRol().getNombreRol();

            huespedes.add(new HuespedResponse(
                    usuario.getIdUsuario(),
                    usuario.getNombre(),
                    usuario.getApellidos(),
                    usuario.getCorreo(),
                    rol,
                    usuario.getFechaRegistro(),
                    reservas.size(),
                    activas.size(),
                    totalGastado,
                    ultima == null ? null : ultima.getFechaReserva(),
                    ultima == null ? null : ultima.getTelefono(),
                    ultima == null ? null : ultima.getPais(),
                    ultima == null ? null : ultima.getCiudad()
            ));
        }

        huespedes.sort(Comparator
                .comparing(HuespedResponse::getTotalReservas).reversed()
                .thenComparing(HuespedResponse::getNombre, Comparator.nullsLast(String::compareToIgnoreCase)));

        return huespedes;
    }
}
