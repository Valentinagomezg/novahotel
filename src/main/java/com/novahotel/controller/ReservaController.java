package com.novahotel.controller;

import com.novahotel.dto.CancelarReservaRequest;
import com.novahotel.dto.EstadoReservaRequest;
import com.novahotel.dto.ReservaRequest;
import com.novahotel.dto.ReservaResponse;
import com.novahotel.service.ReservaService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reservas")
public class ReservaController {

    private final ReservaService reservaService;

    public ReservaController(ReservaService reservaService) {
        this.reservaService = reservaService;
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody ReservaRequest request) {
        try {
            ReservaResponse reserva = reservaService.crear(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(reserva);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<ReservaResponse>> listarTodas() {
        return ResponseEntity.ok(reservaService.listarTodas());
    }

    @GetMapping("/usuario/{idUsuario}")
    public ResponseEntity<List<ReservaResponse>> listarPorUsuario(@PathVariable Integer idUsuario) {
        return ResponseEntity.ok(reservaService.listarPorUsuario(idUsuario));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> actualizarEstado(
            @PathVariable Integer id,
            @RequestBody EstadoReservaRequest request
    ) {
        try {
            return ResponseEntity.ok(reservaService.actualizarEstado(id, request.getEstado()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/cancelar")
    public ResponseEntity<?> cancelar(
            @PathVariable Integer id,
            @RequestBody CancelarReservaRequest request
    ) {
        try {
            return ResponseEntity.ok(reservaService.cancelar(id, request.getIdUsuario()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
