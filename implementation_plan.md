# Implementación de Nueva Lógica de Flujo, Logs y Refinamiento UX en Chatbot/Dashboard

Este plan aborda las directivas de reingeniería UX y el flujo estricto (Guard Rails) para el chatbot y la gestión de leads, garantizando trazabilidad y operación basada 100% en datos reales.

## 1. Refinamiento UX: Dashboard Operativo (Final Polish)

- **A. Jerarquía Operativa:** Ya hemos invertido el orden (Citas arriba, Leads abajo).
- **B. Tabla Citas (Appointments):** Se mantendrán las columnas ajustadas: `Cliente` (ya actualizado de "Paciente"), `Contacto (WhatsApp)`, `Servicio`, `Fecha y Hora (24hs strict)`, `Estado` y `Acciones`.
- **C. Tabla Leads (Prospectos):** Se mantendrán las columnas: `Prospecto`, `Interés (IA)`, `Última Interacción` y `Gestión`.
  - **Botón Log:** El modal leerá la nueva columna `chat_history` y renderizará el texto como burbujas de chat.
  - **Visualización de Chat:** Los mensajes `role: 'user'` se verán alineados a la derecha (tono azul/destacado) y `role: 'assistant'` a la izquierda (tono gris/secundario).
- **D. Instrucción de Formateo de Fechas:** Las horas se renderizarán usando `Intl.DateTimeFormat` forzando `hour12: false`.
- **E. Cero Mocks:** Se removerán o asegurará que no hay datos "dummy". Si la DB está vacía, el Dashboard muestra "Sin datos".

## 2. Refactorización de Lógica del Bot (`api/chat.ts`) - Flujo Estricto (Guard Rails)

El chatbot actuará como un recepcionista de élite siguiendo pasos bloqueantes en este orden:

1. **Identificar Servicio:** Mediante keywords mapeadas a los servicios reales de la base de datos (con lógica fuzzy).
2. **Identificar Nombre:** Se solicitará y se validará que **no contenga números y tenga al menos 3 caracteres**. Si no cumple, el bot lo vuelve a pedir amablemente.
3. **Identificar WhatsApp:** Se solicitará un teléfono válido verificando que contenga un **formato numérico válido** (ej. ignorar si la persona escribe solo letras).
4. **Propuesta de Turnos:** Solo si se tienen estos 3 datos (Servicio, Nombre y WhatsApp válidos), la IA evalúa la disponibilidad en Postgres y propone horarios en formato natural de 24hs.

## 3. Persistencia de Logs y Trazabilidad (Early Persistence)

- **Modificación Base de Datos:** Agregaré una columna JSONB `chat_history` a la tabla `leads` si aún no está implementada nativamente.
- **Micro-Registro Atómico:** En cada ciclo del Chatbot (`/api/chat`), apenas la IA posea [Servicio + Nombre + WhatsApp]:
  - Realizará un **UPSERT** en la tabla `leads`.
  - El lead se actualizará con cada mensaje extra de ahí en adelante.
  - **Crucial:** Cada vez que el usuario y el bot interactúan (una vez pasados los "Guard Rails"), el log de `chat_history` se guarda en la base de datos.
  - Así logramos que si la persona abandona la conversación u cierra la pestaña antes de confirmar, el perfil del prospecto (**Lead**) y todo su **chat_history** ya estén en el panel.

## Plan de Verificación

### Análisis Manual In-App

1. **Dashboard:** Verificar la ausencia de Hardcodes, la presencia del botón Log, burbujas azules/grises en el modal, horas 24hs.
2. **Postgres:** Validar el campo `chat_history` JSONB almacenando el historial.
3. **Flujo de IA:** Simular chat como cliente:
   - Intentar poner números en el nombre -> Debe rebotar.
   - Intentar poner un nombre vacío (2 letras) -> Debe rebotar.
   - Intentar dar letras en el WhatsApp -> Debe solicitar números.
   - Refrescar página antes de confirmar el turno -> Ir al Dashboard/Admin -> Confirmar que el usuario apareció en "Clientes Potenciales" con su historial de chat disponible.
