export const config = {
    runtime: 'edge',
};

import { Pool } from '@neondatabase/serverless';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
};

export default async function handler(req: Request) {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { messages } = await req.json();
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

        const pool = new Pool({ connectionString: process.env.DATABASE_URL });

        // Fetch dynamic services from DB
        const { rows: services } = await pool.query('SELECT * FROM services WHERE active = true ORDER BY created_at ASC');
        const serviceListStr = services.map(s => `- **${s.title}** — $${s.price} (${s.duration || 'N/A'})\n  ${s.description || ''}`).join('\n\n');

        const SYSTEM_PROMPT = `Eres Nova, la asistente virtual de **NOVA Estética** — Centro de Belleza Premium en Buenos Aires.

## DATOS DEL NEGOCIO
- Nombre: NOVA Estética
- Dirección: Av. Libertador 1234, Buenos Aires, Argentina
- Teléfono: +54 11 5555-1234
- Instagram: @nova.estetica
- Horario: Lunes a Sábado de 9:00 a 20:00. Domingos cerrado.
- Web: nova-estetica.com

## SERVICIOS Y PRECIOS
${serviceListStr || 'Actualmente no hay servicios listados.'}

## PROMOCIONES VIGENTES
- Primera visita: 15% OFF en cualquier tratamiento
- Pack Glow (Limpieza + Peeling): $120 (ahorro de $20)
- Referidos: trae a una amiga y ambas reciben 10% OFF

## MÉTODOS DE PAGO
Efectivo, tarjeta de débito/crédito (Visa, Mastercard, Amex), MercadoPago, transferencia bancaria. Se acepta pago en cuotas (3 y 6 sin interés).

## EQUIPO
- Dra. Camila Rossi — Directora Médica, especialista en medicina estética
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

        if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls?.length) {
            const toolCalls = choice.message.tool_calls;
            const toolResults = [];

            for (const tc of toolCalls) {
                const args = JSON.parse(tc.function.arguments);
                let result = {};

                switch (tc.function.name) {
                    case "check_availability": {
                        const { rows } = await pool.query(
                            "SELECT date_time, service_type FROM appointments WHERE date_time >= $1 AND date_time <= $2 AND status != 'cancelled'",
                            [`${args.date} 00:00:00`, `${args.date} 23:59:59`]
                        );

                        const occupiedSlots = rows.map((r: { date_time: string, service_type: string }) => ({
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
                        // Check existing lead
                        const { rows: existingLead } = await pool.query(
                            "SELECT id FROM leads WHERE contact_info->>'email' = $1", [args.contact_email]
                        );

                        let leadId;
                        if (existingLead.length > 0) {
                            leadId = existingLead[0].id;
                            await pool.query("UPDATE leads SET client_name = $1, status = 'contacted' WHERE id = $2", [args.client_name, leadId]);
                        } else {
                            const { rows: newLead } = await pool.query(
                                "INSERT INTO leads (client_name, contact_info, status) VALUES ($1, $2, 'new') RETURNING id",
                                [args.client_name, JSON.stringify({ email: args.contact_email })]
                            );
                            leadId = newLead[0].id;
                        }

                        await pool.query(
                            "INSERT INTO appointments (lead_id, date_time, service_type, status) VALUES ($1, $2, $3, 'scheduled')",
                            [leadId, args.date_time, args.service_type]
                        );

                        result = { success: true, message: `Cita agendada: ${args.service_type} para ${args.client_name} el ${new Date(args.date_time).toLocaleDateString("es-AR")} a las ${new Date(args.date_time).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` };
                        break;
                    }
                    case "calculate_intent": {
                        const { rows: lead } = await pool.query(
                            "SELECT id FROM leads WHERE contact_info->>'email' = $1", [args.contact_email]
                        );

                        if (lead.length > 0) {
                            const newStatus = args.intent_score >= 70 ? 'qualified' : 'contacted';
                            await pool.query(
                                "UPDATE leads SET intent_score = $1, status = $2 WHERE id = $3",
                                [args.intent_score, newStatus, lead[0].id]
                            );
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

            // Second AI call - streamed
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

        // Default return stream
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
    } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error";
        console.error("api/chat error:", e);
        return new Response(
            JSON.stringify({ error: errorMsg }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
}
