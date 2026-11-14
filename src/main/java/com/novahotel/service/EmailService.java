package com.novahotel.service;

import com.novahotel.entity.Reserva;
import com.novahotel.entity.Usuario;

import jakarta.mail.internet.MimeMessage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final Locale ES = Locale.forLanguageTag("es-ES");
    private static final DateTimeFormatter DIA_MES = DateTimeFormatter.ofPattern("d MMM", ES);
    private static final String FUENTE = "'Helvetica Neue',Helvetica,Arial,sans-serif";
    private static final String SERIF = "Georgia,'Times New Roman',serif";

    private final JavaMailSender mailSender;
    private final boolean habilitado;
    private final String remitente;
    private final String nombreRemitente;
    private final String baseUrl;
    private final String usuarioSmtp;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.enabled:true}") boolean habilitado,
            @Value("${app.mail.from:}") String remitente,
            @Value("${app.mail.from-name:NOVA Hotels}") String nombreRemitente,
            @Value("${app.base-url:http://localhost:8080}") String baseUrl,
            @Value("${spring.mail.username:}") String usuarioSmtp
    ) {
        this.mailSender = mailSender;
        this.habilitado = habilitado;
        this.remitente = (remitente == null || remitente.isBlank()) ? usuarioSmtp : remitente;
        this.nombreRemitente = nombreRemitente;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.usuarioSmtp = usuarioSmtp;
    }

    public boolean enviarConfirmacionRegistro(Usuario usuario, String token) {
        String enlace = baseUrl + "/api/usuarios/confirmar?token=" + token;
        String nombre = nombreCompleto(usuario);

        String contenido = ""
                + hero(
                        "Activación de cuenta",
                        "Bienvenido a <em style=\"color:#e6d3a9;font-style:italic;\">NOVA.</em>",
                        "Tu cuenta está casi lista: confirma tu correo electrónico para activarla.",
                        null)
                + "<tr><td style=\"padding:38px 40px 0;\">"
                + "  <p style=\"margin:0 0 14px;color:#0f1a24;font-size:16px;line-height:1.7;\">Hola, <strong style=\"color:#0f1a24;\">" + escapar(nombre) + "</strong>.</p>"
                + "  <p style=\"margin:0;color:#33454f;font-size:15px;line-height:1.8;\">Con tu cuenta activa podrás reservar estancias, consultar tu historial de visitas y guardar tus datos para la próxima vez.</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding:30px 40px 0;\" align=\"center\">" + boton(enlace, "Confirmar mi cuenta") + "</td></tr>"
                + "<tr><td style=\"padding:30px 40px 0;\">" + panelPasos() + "</td></tr>"
                + "<tr><td style=\"padding:20px 40px 0;\">"
                + cajaSuave("<strong style=\"color:#0f1a24;\">El enlace caduca en 48 horas.</strong><br>"
                        + "Si el botón no funciona, copia y pega esta dirección en tu navegador:<br>"
                        + "<span style=\"display:inline-block;margin-top:8px;word-break:break-all;color:#a8874a;font-size:12px;\">" + escapar(enlace) + "</span>")
                + "</td></tr>"
                + "<tr><td style=\"padding:26px 40px 40px;\">"
                + "  <div style=\"border-top:1px solid #eae3d4;padding-top:18px;color:#6b7a85;font-size:13px;line-height:1.7;text-align:center;\">"
                + "    Si no has creado esta cuenta, puedes ignorar este mensaje. No se activará nada hasta que confirmes tu correo."
                + "  </div>"
                + "</td></tr>";

        boolean enviado = enviar(
                usuario.getCorreo(),
                "Activa tu cuenta · NOVA Hotels",
                envolver("Activa tu cuenta · NOVA Hotels",
                        "Solo un clic para empezar a disfrutar de NOVA Hotels.",
                        contenido)
        );

        if (!enviado) {
            log.warn("No se pudo enviar el correo de confirmacion a {}. "
                    + "Puedes confirmar la cuenta abriendo este enlace: {}", usuario.getCorreo(), enlace);
        }

        return enviado;
    }

    public boolean enviarConfirmacionReserva(Reserva reserva) {
        if (reserva == null || reserva.getUsuario() == null) {
            return false;
        }

        Usuario usuario = reserva.getUsuario();
        String nombre = nombreCompleto(usuario);
        String codigo = codigo(reserva);
        String enlace = baseUrl + "/cuenta.html?reserva=" + reserva.getIdReserva();

        String contenido = ""
                + hero(
                        "Reserva " + escapar(codigo),
                        "Tu estancia<br><em style=\"color:#e6d3a9;font-style:italic;\">empieza aquí.</em>",
                        "Gracias por elegir NOVA Hotels.",
                        pastillaEstado(reserva.getEstado()))
                + "<tr><td style=\"padding:36px 40px 0;\">"
                + "  <p style=\"margin:0;color:#33454f;font-size:15px;line-height:1.8;\">Hola, <strong style=\"color:#0f1a24;\">" + escapar(nombre) + "</strong>. Tu reserva ya está registrada. Guarda este correo: aquí tienes todos los detalles de tu estancia.</p>"
                + "</td></tr>"
                + "<tr><td style=\"padding:24px 40px 0;\">" + cintaFechas(reserva) + "</td></tr>"
                + "<tr><td style=\"padding:26px 40px 0;\">"
                + etiqueta("Tu habitación")
                + tarjetaHabitacion(reserva)
                + "</td></tr>"
                + "<tr><td style=\"padding:14px 40px 0;\">" + franjaDatos(reserva) + "</td></tr>"
                + bloqueTexto("Extras", reserva.getExtras())
                + bloqueTexto("Peticiones especiales", reserva.getPeticiones())
                + "<tr><td style=\"padding:24px 40px 0;\">"
                + etiqueta("Desglose de precio")
                + tarjetaPrecio(reserva)
                + "</td></tr>"
                + "<tr><td style=\"padding:30px 40px 0;\" align=\"center\">" + boton(enlace, "Ver mi reserva") + "</td></tr>"
                + "<tr><td style=\"padding:24px 40px 42px;\">" + ayuda() + "</td></tr>";

        return enviar(
                usuario.getCorreo(),
                "Reserva " + codigo + " registrada · NOVA Hotels",
                envolver("Reserva " + codigo + " · NOVA Hotels",
                        "Tu reserva está registrada. Consulta fechas, habitación y total.",
                        contenido)
        );
    }

    private String hero(String ceja, String titulo, String subtitulo, String pastillaHtml) {
        return ""
                + "<tr><td align=\"center\" style=\"background-color:#0f1a24;background-image:linear-gradient(160deg,#16283a 0%,#0b141c 100%);padding:44px 40px 40px;\">"
                + "  <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" align=\"center\"><tr>"
                + "    <td align=\"center\">"
                + "      <div style=\"width:54px;height:54px;border-radius:50%;border:1px solid #c9a86a;color:#e6d3a9;font-family:" + SERIF + ";font-size:24px;font-weight:700;line-height:54px;text-align:center;\">N</div>"
                + "      <div style=\"margin-top:14px;color:#f8f5ef;font-family:" + SERIF + ";font-size:17px;font-weight:600;letter-spacing:0.32em;text-transform:uppercase;\">NOVA Hotels</div>"
                + "      <div style=\"margin-top:7px;color:#c9a86a;font-size:9px;font-weight:700;letter-spacing:0.46em;text-transform:uppercase;\">Hotel &amp; Resort</div>"
                + "    </td>"
                + "  </tr></table>"
                + "  <div style=\"height:26px;font-size:0;line-height:0;\">&nbsp;</div>"
                + "  <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" align=\"center\"><tr>"
                + "    <td width=\"46\" style=\"width:46px;height:1px;background-color:#c9a86a;font-size:0;line-height:0;\">&nbsp;</td>"
                + "  </tr></table>"
                + "  <p style=\"margin:22px 0 0;color:#c9a86a;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;\">" + ceja + "</p>"
                + "  <h1 style=\"margin:12px 0 0;color:#ffffff;font-family:" + SERIF + ";font-size:30px;line-height:1.22;font-weight:600;letter-spacing:-0.01em;\">" + titulo + "</h1>"
                + (pastillaHtml == null || pastillaHtml.isBlank()
                        ? ""
                        : "<div style=\"margin-top:18px;font-size:0;line-height:0;\">" + pastillaHtml + "</div>")
                + "  <p style=\"margin:16px 0 0;color:#8fa0ad;font-size:13px;line-height:1.65;\">" + subtitulo + "</p>"
                + "</td></tr>";
    }

    private String panelPasos() {
        return ""
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#faf8f3;border:1px solid #eae3d4;border-radius:18px;\">"
                + "<tr><td style=\"padding:20px 22px 8px;\">"
                + "  <p style=\"margin:0 0 16px;color:#a8874a;font-size:10px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;\">Tu cuenta en 3 pasos</p>"
                + paso("01", "Confirma tu correo", "Un clic en el botón y tu cuenta queda activa.")
                + paso("02", "Accede a la aplicación", "Inicia sesión con tu correo y contraseña.")
                + paso("03", "Disfruta de NOVA", "Reserva estancias y gestiona todo desde tu cuenta.")
                + "</td></tr></table>";
    }

    private String paso(String numero, String titulo, String detalle) {
        return ""
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:0 0 12px;\"><tr>"
                + "  <td width=\"42\" style=\"width:42px;vertical-align:top;\">"
                + "    <span style=\"display:inline-block;width:30px;height:30px;border-radius:9px;background-color:#0f1a24;color:#e6d3a9;text-align:center;font-size:11px;font-weight:700;line-height:30px;\">" + numero + "</span>"
                + "  </td>"
                + "  <td style=\"padding-left:12px;vertical-align:top;\">"
                + "    <div style=\"color:#0f1a24;font-size:13px;font-weight:700;line-height:1.4;\">" + escapar(titulo) + "</div>"
                + "    <div style=\"margin-top:2px;color:#6b7a85;font-size:12px;line-height:1.55;\">" + escapar(detalle) + "</div>"
                + "  </td>"
                + "</tr></table>";
    }

    private String cintaFechas(Reserva reserva) {
        return ""
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#faf8f3;border:1px solid #eae3d4;border-radius:18px;\">"
                + "<tr>"
                + "  <td width=\"44%\" align=\"center\" style=\"padding:24px 8px 22px;\">"
                + "    <div style=\"color:#a8874a;font-size:9px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;\">Llegada</div>"
                + "    <div style=\"margin-top:8px;color:#0f1a24;font-family:" + SERIF + ";font-size:26px;font-weight:600;line-height:1.1;\">" + escapar(diaMes(reserva.getFechaLlegada())) + "</div>"
                + "    <div style=\"margin-top:7px;color:#6b7a85;font-size:11px;\">" + escapar(diaSemana(reserva.getFechaLlegada())) + " · desde 15:00</div>"
                + "  </td>"
                + "  <td width=\"12%\" align=\"center\" style=\"vertical-align:middle;\">"
                + "    <span style=\"display:inline-block;width:36px;height:36px;border-radius:50%;background-color:#0f1a24;color:#e6d3a9;font-size:14px;font-weight:700;line-height:36px;text-align:center;\">&rarr;</span>"
                + "  </td>"
                + "  <td width=\"44%\" align=\"center\" style=\"padding:24px 8px 22px;\">"
                + "    <div style=\"color:#a8874a;font-size:9px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;\">Salida</div>"
                + "    <div style=\"margin-top:8px;color:#0f1a24;font-family:" + SERIF + ";font-size:26px;font-weight:600;line-height:1.1;\">" + escapar(diaMes(reserva.getFechaSalida())) + "</div>"
                + "    <div style=\"margin-top:7px;color:#6b7a85;font-size:11px;\">" + escapar(diaSemana(reserva.getFechaSalida())) + " · hasta 12:00</div>"
                + "  </td>"
                + "</tr></table>";
    }

    private String tarjetaHabitacion(Reserva reserva) {
        String tipo = reserva.getTipoHabitacion();
        String descripcion = descripcionHabitacion(tipo);
        return ""
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid #eae3d4;border-radius:18px;\">"
                + "<tr><td style=\"padding:22px 24px;\">"
                + "  <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                + "    <td style=\"vertical-align:top;\">"
                + "      <div style=\"color:#a8874a;font-size:9px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;\">Categoría</div>"
                + "      <div style=\"margin-top:8px;color:#0f1a24;font-family:" + SERIF + ";font-size:26px;font-weight:600;line-height:1.15;\">" + escapar(nombreHabitacion(tipo)) + "</div>"
                + "      <div style=\"margin-top:6px;color:#6b7a85;font-size:12px;\">" + (descripcion == null ? "" : escapar(descripcion)) + "</div>"
                + "    </td>"
                + "    <td width=\"36%\" align=\"right\" style=\"vertical-align:top;\">"
                + "      <div style=\"color:#a8874a;font-size:9px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;\">Por noche</div>"
                + "      <div style=\"margin-top:8px;color:#0f1a24;font-family:" + SERIF + ";font-size:24px;font-weight:700;line-height:1.1;\">" + escapar(dinero(reserva.getPrecioNoche())) + "</div>"
                + "    </td>"
                + "  </tr></table>"
                + "</td></tr></table>";
    }

    private String franjaDatos(Reserva reserva) {
        return ""
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid #eae3d4;border-radius:18px;overflow:hidden;\">"
                + "<tr>"
                + celdaDato("Huéspedes", huespedes(reserva), true)
                + celdaDato("Noches", noches(reserva) + (noches(reserva) == 1 ? " noche" : " noches"), true)
                + celdaDato("Código", codigo(reserva), false)
                + "</tr></table>";
    }

    private String celdaDato(String etiqueta, String valor, boolean bordeDerecho) {
        return ""
                + "<td align=\"center\" style=\"width:33.33%;padding:16px 8px;background-color:#faf8f3;"
                + (bordeDerecho ? "border-right:1px solid #eae3d4;" : "")
                + "\">"
                + "  <div style=\"color:#8b98a2;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;\">" + escapar(etiqueta) + "</div>"
                + "  <div style=\"margin-top:6px;color:#0f1a24;font-size:14px;font-weight:700;line-height:1.35;\">" + escapar(valor) + "</div>"
                + "</td>";
    }

    private String bloqueTexto(String etiqueta, String valor) {
        if (valor == null || valor.isBlank()) {
            return "";
        }
        return ""
                + "<tr><td style=\"padding:14px 40px 0;\">"
                + cajaSuave("<div style=\"color:#a8874a;font-size:9px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;margin-bottom:7px;\">" + escapar(etiqueta) + "</div>"
                        + "<div style=\"color:#33454f;font-size:13px;line-height:1.65;\">" + escapar(valor) + "</div>")
                + "</td></tr>";
    }

    private String tarjetaPrecio(Reserva reserva) {
        BigDecimal subtotal = subtotal(reserva);
        BigDecimal total = reserva.getTotal() == null ? BigDecimal.ZERO : reserva.getTotal();
        BigDecimal extras = total.subtract(subtotal).max(BigDecimal.ZERO);
        boolean hayExtras = extras.compareTo(BigDecimal.ZERO) > 0;
        int noches = noches(reserva);

        return ""
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid #eae3d4;border-radius:18px;overflow:hidden;\">"
                + "<tr><td style=\"padding:20px 24px 10px;\">"
                + "  <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">"
                + "    <tr>"
                + "      <td style=\"padding:5px 0;color:#6b7a85;font-size:13px;\">Habitación · " + noches + (noches == 1 ? " noche" : " noches") + "</td>"
                + "      <td align=\"right\" style=\"padding:5px 0;color:#0f1a24;font-size:13px;font-weight:700;\">" + escapar(dinero(subtotal)) + "</td>"
                + "    </tr>"
                + (hayExtras
                        ? "    <tr>"
                        + "      <td style=\"padding:5px 0;color:#6b7a85;font-size:13px;\">Extras</td>"
                        + "      <td align=\"right\" style=\"padding:5px 0;color:#0f1a24;font-size:13px;font-weight:700;\">+ " + escapar(dinero(extras)) + "</td>"
                        + "    </tr>"
                        : "")
                + "    <tr><td colspan=\"2\" style=\"padding:10px 0 2px;color:#8b98a2;font-size:11px;\">Precio total de la estancia</td></tr>"
                + "  </table>"
                + "</td></tr>"
                + "<tr><td style=\"background-color:#0f1a24;background-image:linear-gradient(135deg,#16283a,#0b141c);padding:18px 24px;\">"
                + "  <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                + "    <td style=\"color:#e6d3a9;font-size:10px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;\">Total</td>"
                + "    <td align=\"right\" style=\"color:#ffffff;font-family:" + SERIF + ";font-size:24px;font-weight:700;\">" + escapar(dinero(total)) + "</td>"
                + "  </tr></table>"
                + "</td></tr>"
                + "</table>";
    }

    private String ayuda() {
        return ""
                + "<div style=\"border-top:1px solid #eae3d4;padding-top:20px;color:#6b7a85;font-size:13px;line-height:1.7;\">"
                + "  ¿Necesitas cambiar algo? Escríbenos a "
                + "  <a href=\"mailto:reservas@novahotels.com\" style=\"color:#a8874a;text-decoration:none;font-weight:700;\">reservas@novahotels.com</a>"
                + "  o llámanos al +33 1 84 80 20 20.<br>"
                + "  <span style=\"display:inline-block;margin-top:10px;color:#0f1a24;font-weight:700;\">Check-in 15:00 · Check-out 12:00</span>"
                + "</div>";
    }

    private String etiqueta(String texto) {
        return "<p style=\"margin:0 0 12px;color:#a8874a;font-size:10px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;\">" + escapar(texto) + "</p>";
    }

    private String boton(String enlace, String texto) {
        return ""
                + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" align=\"center\" style=\"margin:0 auto;\"><tr>"
                + "  <td style=\"border-radius:999px;background-color:#c9a86a;background-image:linear-gradient(120deg,#e6d3a9,#c9a86a);box-shadow:0 12px 26px rgba(201,168,106,0.35);\">"
                + "    <a href=\"" + escapar(enlace) + "\" style=\"display:inline-block;padding:18px 42px;border-radius:999px;color:#0b141c;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;\">" + texto + " &nbsp;&rarr;</a>"
                + "  </td>"
                + "</tr></table>";
    }

    private String cajaSuave(String contenidoHtml) {
        return ""
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#faf8f3;border:1px solid #eae3d4;border-radius:18px;\">"
                + "<tr><td style=\"padding:18px 22px;color:#6b7a85;font-size:13px;line-height:1.7;\">" + contenidoHtml + "</td></tr>"
                + "</table>";
    }

    private String pastillaEstado(String estado) {
        String clave = estado == null ? "" : estado.trim().toLowerCase(ES);
        String fondo;
        String borde;
        String color;

        switch (clave) {
            case "confirmada" -> {
                fondo = "#16302a";
                borde = "#2f7d5b";
                color = "#b9e3cb";
            }
            case "cancelada" -> {
                fondo = "#33201e";
                borde = "#8a4a42";
                color = "#f2bdb8";
            }
            case "check-in", "checkin", "en curso" -> {
                fondo = "#1a2b39";
                borde = "#2f5d7d";
                color = "#bcd6ea";
            }
            case "pendiente" -> {
                fondo = "#33291a";
                borde = "#a8874a";
                color = "#e6d3a9";
            }
            default -> {
                fondo = "#1b2633";
                borde = "#3d4c5a";
                color = "#c3ccd4";
            }
        }

        return "<span style=\"display:inline-block;padding:8px 16px;border-radius:999px;background-color:" + fondo
                + ";border:1px solid " + borde + ";color:" + color
                + ";font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;\">"
                + escapar(valor(estado)) + "</span>";
    }

    private String envolver(String titulo, String preheader, String contenido) {
        return ""
                + "<!DOCTYPE html>"
                + "<html lang=\"es\" xmlns=\"http://www.w3.org/1999/xhtml\"><head>"
                + "<meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
                + "<meta name=\"x-apple-disable-message-reformatting\">"
                + "<meta name=\"color-scheme\" content=\"light only\">"
                + "<title>" + escapar(titulo) + "</title>"
                + "</head>"
                + "<body style=\"margin:0;padding:0;background-color:#ece5d8;\">"
                + "<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;\">" + escapar(preheader) + "</div>"
                + "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:#ece5d8;padding:36px 12px;font-family:" + FUENTE + ";\">"
                + "<tr><td align=\"center\">"
                + "  <table role=\"presentation\" width=\"620\" cellpadding=\"0\" cellspacing=\"0\" style=\"width:100%;max-width:620px;background-color:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 26px 70px rgba(15,26,36,0.18);\">"
                + "    <tr><td style=\"height:4px;background-color:#c9a86a;background-image:linear-gradient(90deg,#e6d3a9,#c9a86a 45%,#a8874a);font-size:0;line-height:0;\">&nbsp;</td></tr>"
                + contenido
                + pie()
                + "  </table>"
                + "  <p style=\"margin:22px 0 0;color:#9aa4ad;font-size:11px;letter-spacing:0.08em;\">&copy; 2026 NOVA Hotels · Todos los derechos reservados</p>"
                + "</td></tr></table>"
                + "</body></html>";
    }

    private String pie() {
        return ""
                + "<tr><td style=\"background-color:#0b141c;background-image:linear-gradient(160deg,#142535,#0b141c);padding:26px 40px 28px;\">"
                + "  <table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>"
                + "    <td style=\"color:#f8f5ef;font-family:" + SERIF + ";font-size:15px;font-weight:600;\">NOVA Hotels</td>"
                + "    <td align=\"right\" style=\"color:#c9a86a;font-size:9px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;\">Hotel &amp; Resort</td>"
                + "  </tr></table>"
                + "  <div style=\"margin-top:14px;height:1px;background-color:#2c3a49;font-size:0;line-height:0;\">&nbsp;</div>"
                + "  <p style=\"margin:14px 0 0;color:#7d8ea0;font-size:11px;line-height:1.75;\">12 Boulevard de la Mer, Costa Azul · +33 1 84 80 20 20<br>Recibes este correo porque hiciste una reserva o creaste una cuenta en NOVA Hotels.</p>"
                + "</td></tr>";
    }

    private boolean enviar(String destino, String asunto, String html) {
        if (destino == null || destino.isBlank()) {
            log.warn("No se envio el correo '{}': el destinatario esta vacio", asunto);
            return false;
        }

        if (!habilitado) {
            log.info("Correo '{}' omitido: app.mail.enabled=false", asunto);
            return false;
        }

        if (usuarioSmtp == null || usuarioSmtp.isBlank()) {
            log.warn("Correo '{}' omitido: configura MAIL_USERNAME y MAIL_PASSWORD para enviar correos", asunto);
            return false;
        }

        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, false, "UTF-8");
            helper.setFrom(remitente, nombreRemitente);
            helper.setTo(destino);
            helper.setSubject(asunto);
            helper.setText(html, true);
            mailSender.send(mensaje);
            log.info("Correo '{}' enviado a {}", asunto, destino);
            return true;
        } catch (Exception e) {
            log.error("No se pudo enviar el correo '{}' a {}: {}", asunto, destino, e.getMessage());
            return false;
        }
    }

    private String nombreCompleto(Usuario usuario) {
        if (usuario == null) {
            return "huésped";
        }
        String nombre = (usuario.getNombre() == null ? "" : usuario.getNombre()).trim();
        String apellidos = (usuario.getApellidos() == null ? "" : usuario.getApellidos()).trim();
        String completo = (nombre + " " + apellidos).trim();
        return completo.isEmpty() ? "huésped" : completo;
    }

    private String codigo(Reserva reserva) {
        return String.format("#%04d", reserva.getIdReserva() == null ? 0 : reserva.getIdReserva());
    }

    private String nombreHabitacion(String tipo) {
        if (tipo == null) {
            return "—";
        }
        return switch (tipo.trim().toLowerCase()) {
            case "clasica" -> "Clásica";
            case "deluxe" -> "Deluxe";
            case "nova" -> "Suite Nova";
            default -> tipo;
        };
    }

    private String descripcionHabitacion(String tipo) {
        if (tipo == null) {
            return null;
        }
        return switch (tipo.trim().toLowerCase()) {
            case "clasica" -> "28 m² · 2 personas";
            case "deluxe" -> "36 m² · 2 personas";
            case "nova" -> "68 m² · 4 personas";
            default -> null;
        };
    }

    private String huespedes(Reserva reserva) {
        int adultos = reserva.getAdultos() == null ? 0 : reserva.getAdultos();
        int ninos = reserva.getNinos() == null ? 0 : reserva.getNinos();

        String texto = adultos + (adultos == 1 ? " adulto" : " adultos");
        if (ninos > 0) {
            texto += " · " + ninos + (ninos == 1 ? " niño" : " niños");
        }
        return texto;
    }

    private int noches(Reserva reserva) {
        if (reserva.getNoches() != null && reserva.getNoches() > 0) {
            return reserva.getNoches();
        }
        if (reserva.getFechaLlegada() != null && reserva.getFechaSalida() != null) {
            long calculadas = ChronoUnit.DAYS.between(reserva.getFechaLlegada(), reserva.getFechaSalida());
            return calculadas > 0 ? (int) calculadas : 0;
        }
        return 0;
    }

    private BigDecimal subtotal(Reserva reserva) {
        BigDecimal precio = reserva.getPrecioNoche() == null ? BigDecimal.ZERO : reserva.getPrecioNoche();
        return precio.multiply(BigDecimal.valueOf(noches(reserva)));
    }

    private String diaMes(LocalDate fecha) {
        return fecha == null ? "—" : fecha.format(DIA_MES).toUpperCase(ES);
    }

    private String diaSemana(LocalDate fecha) {
        if (fecha == null) {
            return "";
        }
        return capitalizar(fecha.getDayOfWeek().getDisplayName(TextStyle.FULL, ES));
    }

    private String capitalizar(String texto) {
        if (texto == null || texto.isEmpty()) {
            return texto;
        }
        return texto.substring(0, 1).toUpperCase(ES) + texto.substring(1);
    }

    private String valor(String valor) {
        return valor == null || valor.isBlank() ? "—" : valor;
    }

    private String dinero(BigDecimal valor) {
        if (valor == null) {
            return "—";
        }
        NumberFormat formato = NumberFormat.getCurrencyInstance(ES);
        return formato.format(valor);
    }

    private String escapar(String texto) {
        if (texto == null) {
            return "";
        }
        return texto
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
