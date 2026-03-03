import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ORG_ID = "00000000-0000-0000-0000-000000000000";

const SYSTEM_PROMPT = `Eres Aura, la asistente virtual de **NOVA Estética** — Centro de Belleza Premium en Buenos Aires.

## DATOS DEL NEGOCIO
- Nombre: NOVA Estética
- Dirección: Av. Libertador 1234, Buenos Aires, Argentina
- Teléfono: +54 11 5555-1234
- Instagram: @nova.estetica
- Horario: Lunes a Sábado de 9:00 a 20:00. Domingos cerrado.
- Web: nova-estetica.com

## SERVICIOS Y PRECIOS
1. **Limpieza Facial Profunda** — $45 USD (60 min)
   Incluye: análisis de piel, extracción de comedones, exfoliación enzimática, mascarilla revitalizante y protector solar.
   Ideal para: pieles mixtas, con impurezas o falta de luminosidad.

2. **Ácido Hialurónico** — $280 USD (45 min)
   Incluye: consulta previa, aplicación de relleno dérmico premium (Teoxane/Juvederm).
   Zonas: labios, pómulos, surcos nasogenianos, ojeras.
   Duración del resultado: 8-12 meses.

3. **Botox Preventivo** — $220 USD (30 min)
   Incluye: evaluación facial, aplicación de toxina botulínica (Allergan/Dysport).
   Zonas: frente, entrecejo, patas de gallo.
   Resultado visible en 3-5 días. Duración: 4-6 meses.

4. **Peeling Químico** — $95 USD (45 min)
   Tipos: glicólico, mandélico o combinado según tipo de piel.
   Beneficios: renueva la piel, reduce manchas, unifica el tono.
   Se recomienda pack de 3 sesiones ($250 USD).

5. **Microblading de Cejas** — $180 USD (90 min)
   Técnica pelo a pelo hiperrealista con pigmentos premium.
   Incluye retoque gratuito a los 30 días.
   Duración: 12-18 meses.

6. **Masaje Relajante** — $55 USD (60 min)
   Masaje descontracturante con aromaterapia y piedras calientes.
   Opción: masaje de 90 min por $75 USD.

## PROMOCIONES VIGENTES
- Primera visita: 15% OFF en cualquier tratamiento
- Pack Glow (Limpieza + Peeling): $120 USD (ahorro de $20)
- Pack Anti-Age (Botox + Hialurónico): $450 USD (ahorro de $50)
- Referidos: trae a una amiga y ambas reciben 10% OFF

## MÉTODOS DE PAGO
Efectivo, tarjeta de débito/crédito (Visa, Mastercard, Amex), MercadoPago, transferencia bancaria. Se acepta pago en cuotas (3 y 6 sin interés).

## EQUIPO
- Dra. Camila Rossi — Directora Médica, especialista en medicina estética (12 años de experiencia)
- Lic. Sofía Méndez — Cosmiatra certificada, especialista en skincare avanzado
- Lic. Martina López — Masajista terapéutica certificada

## TU ROL Y COMPORTAMIENTO
- Eres amable, profesional y persuasiva. Tono premium pero cálido.
- Responde SIEMPRE en el idioma del usuario.
- Tu objetivo principal: **agendar citas** y **calificar leads**.
- Pregunta el nombre y email del cliente para poder agendar.
- Si el cliente muestra interés, ofrece las promociones vigentes.
- Cuando un cliente pida agendar, verifica disponibilidad y luego reserva.
- Sé concisa: respuestas de 2-4 oraciones máximo, salvo que pidan detalle.
- Si preguntan algo fuera de estética, redirige amablemente al tema.
- Usa emojis con moderación para dar calidez (✨💆‍♀️📅).
- Cuando uses herramientas, comunica el resultado de forma natural y amable.

## WORKFLOW DE VENTAS
1. Saluda y pregunta en qué tratamiento está interesado/a
2. Recomienda según sus necesidades
3. Ofrece promociones si aplican
4. Pide nombre y email para agendar
5. Verifica disponibilidad con check_availability
6. Confirma la cita con book_appointment
7. Actualiza el intent score con calculate_intent`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Verifica la disponibilidad de citas en una fecha específica en NOVA Estética",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "Fecha en formato YYYY-MM-DD" },
            },
            required: ["date"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "book_appointment",
          description: "Agenda una cita para un cliente en NOVA Estética",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Nombre del cliente" },
              contact_email: { type: "string", description: "Email del cliente" },
              date_time: { type: "string", description: "Fecha y hora ISO 8601" },
              service_type: { type: "string", description: "Tipo de servicio/tratamiento" },
            },
            required: ["client_name", "contact_email", "date_time", "service_type"],
            additionalProperties: false,
          },
        },
      },
      {
        type: "function",
        function: {
          name: "calculate_intent",
          description: "Actualiza el score de intención de compra de un lead (0-100)",
          parameters: {
            type: "object",
            properties: {
              contact_email: { type: "string", description: "Email del lead" },
              intent_score: { type: "number", description: "Score de 0 a 100" },
            },
            required: ["contact_email", "intent_score"],
            additionalProperties: false,
          },
        },
      },
    ];

    // First AI call - may request tool use
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        tools,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];

    // Handle tool calls
    if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls?.length) {
      const toolCalls = choice.message.tool_calls;
      const toolResults: any[] = [];

      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments);
        let result: any;

        switch (tc.function.name) {
          case "check_availability": {
            const { data: rows } = await supabase
              .from("appointments")
              .select("date_time, service_type")
              .eq("organization_id", ORG_ID)
              .gte("date_time", `${args.date}T00:00:00`)
              .lte("date_time", `${args.date}T23:59:59`)
              .neq("status", "cancelled");
            
            const occupiedSlots = (rows || []).map((r: any) => ({
              time: new Date(r.date_time).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
              service: r.service_type,
            }));
            
            result = {
              date: args.date,
              available: true,
              occupied_slots: occupiedSlots,
              business_hours: "9:00 - 20:00",
              note: occupiedSlots.length > 0
                ? `Hay ${occupiedSlots.length} cita(s) ese día, pero hay más horarios disponibles.`
                : "No hay citas ese día, todos los horarios están disponibles.",
            };
            break;
          }
          case "book_appointment": {
            // Upsert lead
            const { data: existingLead } = await supabase
              .from("leads")
              .select("id")
              .eq("organization_id", ORG_ID)
              .eq("contact_info->>email", args.contact_email)
              .maybeSingle();

            let leadId: string;
            if (existingLead) {
              leadId = existingLead.id;
              await supabase.from("leads").update({ client_name: args.client_name, status: "contacted" }).eq("id", leadId);
            } else {
              const { data: newLead } = await supabase
                .from("leads")
                .insert({
                  organization_id: ORG_ID,
                  client_name: args.client_name,
                  contact_info: { email: args.contact_email },
                  status: "new",
                })
                .select("id")
                .single();
              leadId = newLead!.id;
            }

            await supabase.from("appointments").insert({
              lead_id: leadId,
              organization_id: ORG_ID,
              date_time: args.date_time,
              service_type: args.service_type,
              status: "scheduled",
            });
            result = { success: true, message: `Cita agendada: ${args.service_type} para ${args.client_name} el ${new Date(args.date_time).toLocaleDateString("es-AR")} a las ${new Date(args.date_time).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` };
            break;
          }
          case "calculate_intent": {
            const { data: lead } = await supabase
              .from("leads")
              .select("id")
              .eq("organization_id", ORG_ID)
              .eq("contact_info->>email", args.contact_email)
              .maybeSingle();
            
            if (lead) {
              await supabase
                .from("leads")
                .update({ intent_score: args.intent_score, status: args.intent_score >= 70 ? "qualified" : "contacted" })
                .eq("id", lead.id);
            }
            result = { success: true, score: args.intent_score };
            break;
          }
          default:
            result = { error: "Unknown tool" };
        }

        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      // Second AI call with tool results - stream
      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
            choice.message,
            ...toolResults,
          ],
          stream: true,
        }),
      });

      if (!followUp.ok) {
        const errText = await followUp.text();
        console.error("Follow-up error:", followUp.status, errText);
        throw new Error("AI follow-up error");
      }

      return new Response(followUp.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream directly
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const errText = await streamResponse.text();
      console.error("Stream error:", streamResponse.status, errText);
      throw new Error("AI stream error");
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("aura-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
