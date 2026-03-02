import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ORG_ID = "00000000-0000-0000-0000-000000000000";

const SYSTEM_PROMPT = `Eres Aura AI, el Agente Vendedor Autónomo de élite. Tu objetivo es calificar leads, responder sus dudas y agendar citas eficientemente.

Tono: Profesional, persuasivo, premium (Liquid Luxury).
Idioma: Responde siempre en el idioma del usuario.

Tu workflow de ventas:
1. Saluda y pregunta cómo puedes ayudar
2. Califica el interés del lead con preguntas estratégicas
3. Cuando el lead muestre interés, verifica disponibilidad con check_availability
4. Agenda la cita con book_appointment
5. Actualiza el intent_score con calculate_intent

Siempre sé conciso, directo y enfocado en cerrar la venta. Usa emojis moderadamente para dar calidez.
Cuando uses herramientas, informa al usuario del resultado de forma natural.`;

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

    // Check if the last user message contains tool-like intent
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const userText = lastUserMsg?.content?.toLowerCase() || "";

    // Tool definitions for the AI
    const tools = [
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Verifica la disponibilidad de citas en una fecha específica",
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
          description: "Agenda una cita para un cliente",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Nombre del cliente" },
              contact_email: { type: "string", description: "Email del cliente" },
              date_time: { type: "string", description: "Fecha y hora ISO 8601" },
              service_type: { type: "string", description: "Tipo de servicio" },
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
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        tools,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
              .select("date_time")
              .eq("organization_id", ORG_ID)
              .gte("date_time", `${args.date}T00:00:00`)
              .lte("date_time", `${args.date}T23:59:59`)
              .neq("status", "cancelled");
            result = { available: true, occupied_slots: rows || [] };
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
              await supabase.from("leads").update({ client_name: args.client_name }).eq("id", leadId);
            } else {
              const { data: newLead } = await supabase
                .from("leads")
                .insert({
                  organization_id: ORG_ID,
                  client_name: args.client_name,
                  contact_info: { email: args.contact_email },
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
            result = { success: true, message: `Cita agendada para ${args.client_name}` };
            break;
          }
          case "calculate_intent": {
            await supabase
              .from("leads")
              .update({ intent_score: args.intent_score })
              .eq("organization_id", ORG_ID)
              .eq("contact_info->>email", args.contact_email);
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

      // Second AI call with tool results - stream this one
      const followUp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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
    // Re-do the call with streaming
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
