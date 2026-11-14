package com.novahotel.repository;

import com.novahotel.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    boolean existsByCorreo(String correo);

    Optional<Usuario> findByCorreo(String correo);

    Optional<Usuario> findByTokenConfirmacion(String tokenConfirmacion);
}
