package com.novahotel.controller;

import com.novahotel.dto.EstadoHabitacionRequest;
import com.novahotel.dto.HabitacionRequest;
import com.novahotel.dto.HabitacionResponse;
import com.novahotel.service.HabitacionService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/habitaciones")
public class HabitacionController {

    private final HabitacionService habitacionService;

    public HabitacionController(HabitacionService habitacionService) {
        this.habitacionService = habitacionService;
    }

    @GetMapping
    public ResponseEntity<List<HabitacionResponse>> listar() {
        return ResponseEntity.ok(habitacionService.listar());
    }

    @PostMapping
    public ResponseEntity<?> crear(@RequestBody HabitacionRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(habitacionService.crear(request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> actualizarEstado(
            @PathVariable Integer id,
            @RequestBody EstadoHabitacionRequest request
    ) {
        try {
            return ResponseEntity.ok(habitacionService.actualizarEstado(id, request.getEstado()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
