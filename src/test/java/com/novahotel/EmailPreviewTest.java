package com.novahotel;

import com.novahotel.entity.Reserva;
import com.novahotel.entity.Usuario;
import com.novahotel.service.EmailService;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Properties;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailPreviewTest {

    @Test
    void generaVistasDeLosCorreos() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenAnswer(invocation -> new MimeMessage(Session.getInstance(new Properties())));

        EmailService service = new EmailService(
                sender,
                true,
                "no-reply@novahotels.com",
                "NOVA Hotels",
                "http://localhost:8080",
                "no-reply@novahotels.com"
        );

        Usuario usuario = new Usuario();
        usuario.setNombre("Julian");
        usuario.setApellidos("Rocha");
        usuario.setCorreo("julian@example.com");

        service.enviarConfirmacionRegistro(usuario, "abc123");

        Reserva reserva = new Reserva();
        var idReserva = Reserva.class.getDeclaredField("idReserva");
        idReserva.setAccessible(true);
        idReserva.set(reserva, 7);
        reserva.setUsuario(usuario);
        reserva.setFechaLlegada(LocalDate.of(2026, 11, 20));
        reserva.setFechaSalida(LocalDate.of(2026, 11, 23));
        reserva.setNoches(3);
        reserva.setAdultos(2);
        reserva.setNinos(1);
        reserva.setTipoHabitacion("nova");
        reserva.setPrecioNoche(new BigDecimal("180.00"));
        reserva.setExtras("Cena de bienvenida, Spa");
        reserva.setPeticiones("Habitación alta, cuna para bebé");
        reserva.setMetodoPago("Tarjeta");
        reserva.setTotal(new BigDecimal("660.00"));
        reserva.setEstado("Pendiente");

        service.enviarConfirmacionReserva(reserva);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender, times(2)).send(captor.capture());
        List<MimeMessage> mensajes = captor.getAllValues();

        Path salida = Path.of("target", "preview");
        Files.createDirectories(salida);
        Files.writeString(salida.resolve("confirmacion.html"), String.valueOf(mensajes.get(0).getContent()));
        Files.writeString(salida.resolve("reserva.html"), String.valueOf(mensajes.get(1).getContent()));
    }
}
