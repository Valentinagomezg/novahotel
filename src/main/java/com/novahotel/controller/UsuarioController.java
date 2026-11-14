package com.novahotel.controller;

import com.novahotel.dto.HuespedResponse;
import com.novahotel.dto.LoginRequest;
import com.novahotel.dto.PerfilRequest;
import com.novahotel.dto.RegistroRequest;
import com.novahotel.dto.UsuarioResponse;
import com.novahotel.entity.Usuario;
import com.novahotel.service.UsuarioService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    public UsuarioController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @GetMapping
    public ResponseEntity<List<HuespedResponse>> listarHuespedes() {
        return ResponseEntity.ok(usuarioService.listarHuespedes());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarPerfil(
            @PathVariable Integer id,
            @RequestBody PerfilRequest request
    ) {
        try {
            return ResponseEntity.ok(usuarioService.actualizarPerfil(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/registro")
    public ResponseEntity<?> registrar(@RequestBody RegistroRequest request) {
        try {
            Usuario usuario = usuarioService.registrar(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(usuarioService.toResponse(usuario));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            UsuarioResponse usuario = usuarioService.login(request);
            return ResponseEntity.ok(usuario);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    @GetMapping("/confirmar")
    public RedirectView confirmar(@RequestParam(value = "token", required = false) String token) {
        boolean confirmado = usuarioService.confirmarCorreo(token);
        return new RedirectView(
                "/confirmacion-cuenta.html?estado=" + (confirmado ? "ok" : "error")
        );
    }

    @PostMapping("/reenviar-confirmacion")
    public ResponseEntity<?> reenviarConfirmacion(@RequestBody(required = false) Map<String, String> body) {
        try {
            String correo = body == null ? null : body.get("correo");
            usuarioService.reenviarConfirmacion(correo);
            return ResponseEntity.ok(Map.of(
                    "mensaje", "Te hemos enviado un nuevo enlace de confirmación."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
