package com.novahotel.repository;

import com.novahotel.entity.Habitacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HabitacionRepository extends JpaRepository<Habitacion, Integer> {
    List<Habitacion> findAllByOrderByNumeroAsc();

    boolean existsByNumero(String numero);

    long countByTipoIgnoreCaseAndEstado(String tipo, String estado);
}
