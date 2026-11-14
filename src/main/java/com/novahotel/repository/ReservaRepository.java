package com.novahotel.repository;

import com.novahotel.entity.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {
    List<Reserva> findByUsuario_IdUsuarioOrderByFechaLlegadaDesc(Integer idUsuario);

    List<Reserva> findAllByOrderByFechaReservaDesc();
}
