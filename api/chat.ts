export const config = { runtime: 'edge' };

import { Pool } from '@neondatabase/serverless';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
};

// ─── Typing simulation helper ────────────────────────────────────────────────
function sseStream(text: string): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            // Split into small chunks to simulate typing
            const words = text.split(' ');
            for (let i = 0; i < words.length; i++) {
                const chunk = (i === 0 ? '' : ' ') + words[i];
                const data = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                // Simulate human typing delay
                await new Promise(r => setTimeout(r, 28 + Math.random() * 35));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
        }
    });
    return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
    });
}

// ─── Conversation state extraction ────────────────────────────────────────────
interface ConvState {
    clientName: string | null;
    clientEmail: string | null;
    interestedService: string | null;
    stage: 'greeting' | 'service_inquiry' | 'collecting_info' | 'availability' | 'confirm_booking' | 'booked' | 'general';
    pendingDate: string | null;
    pendingTime: string | null;
    intentScore: number;
}

function extractState(messages: Array<{ role: string; content: string }>, services: Array<{ title: string; price: number; duration: string; description: string }>): ConvState {
    const state: ConvState = {
        clientName: null,
        clientEmail: null,
        interestedService: null,
        stage: 'greeting',
        pendingDate: null,
        pendingTime: null,
        intentScore: 10,
    };

    const allText = messages.map(m => m.content).join('\n').toLowerCase();

    // Extract email
    const emailMatch = allText.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);
    if (emailMatch) state.clientEmail = emailMatch[0].toLowerCase();

    // Extract name from patterns
    const namePatterns = [
        /me llamo ([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i,
        /soy ([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i,
        /mi nombre es ([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i,
        /i'm ([a-z]+(?:\s+[a-z]+)?)/i,
        /my name is ([a-z]+(?:\s+[a-z]+)?)/i,
    ];
    for (const p of namePatterns) {
        const m = allText.match(p);
        if (m) { state.clientName = capitalize(m[1]); break; }
    }

    // Extract interested service
    for (const svc of services) {
        if (allText.includes(svc.title.toLowerCase())) {
            state.interestedService = svc.title;
            break;
        }
    }

    // Detect date mentions
    const dateMatch = allText.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (dateMatch) {
        const year = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : new Date().getFullYear();
        state.pendingDate = `${year}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[1]).padStart(2, '0')}`;
    }

    // Detect time mentions
    const timeMatch = allText.match(/(\d{1,2})(?::(\d{2}))?\s*(?:hs?|am|pm|:00)?(?:\s|$)/i);
    if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const min = timeMatch[2] || '00';
        if (hour >= 9 && hour <= 20) state.pendingTime = `${String(hour).padStart(2, '0')}:${min}`;
    }

    // Determine intent score
    const highIntent = ['agendar', 'reservar', 'turno', 'quiero', 'me interesa', 'precio', 'costo', 'cuánto', 'disponible', 'cuando', 'mañana', 'appointment', 'book'];
    const medIntent = ['información', 'qué es', 'cómo funciona', 'tratamiento', 'servicio'];
    for (const kw of highIntent) { if (allText.includes(kw)) state.intentScore = Math.max(state.intentScore, 65); }
    for (const kw of medIntent) { if (allText.includes(kw)) state.intentScore = Math.max(state.intentScore, 40); }
    if (state.clientEmail) state.intentScore = Math.max(state.intentScore, 75);
    if (state.pendingDate) state.intentScore = Math.max(state.intentScore, 85);

    // Determine stage
    if (messages.length === 0) state.stage = 'greeting';
    else if (!state.interestedService) state.stage = 'service_inquiry';
    else if (!state.clientName || !state.clientEmail) state.stage = 'collecting_info';
    else if (!state.pendingDate) state.stage = 'availability';
    else if (state.pendingDate && state.clientEmail) state.stage = 'confirm_booking';

    return state;
}

// ─── Response generator ───────────────────────────────────────────────────────
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateResponse(
    lastUserMsg: string,
    state: ConvState,
    services: Array<{ title: string; price: number; duration: string; description: string }>,
    availableSlots: string[],
    bookingResult: { success: boolean; datetime?: string; service?: string } | null
): string {
    const msg = lastUserMsg.toLowerCase();

    // ── Booked confirmation
    if (bookingResult?.success) {
        const greetings = state.clientName ? `, ${state.clientName}` : '';
        return pickRandom([
            `¡Perfecto${greetings}! 🎉 Tu cita para **${bookingResult.service}** quedó agendada para el **${bookingResult.datetime}**. Te vamos a enviar un recordatorio. ¿Hay algo más en lo que pueda ayudarte?`,
            `¡Listo${greetings}! ✨ Tu turno para **${bookingResult.service}** está confirmado el **${bookingResult.datetime}**. Si necesitás cambiar algo, no dudes en escribirnos. ¡Nos vemos!`,
            `¡Tu reserva está hecha${greetings}! 📅 **${bookingResult.service}** — **${bookingResult.datetime}**. Cualquier consulta extra, acá estamos. ¡Hasta pronto!`,
        ]);
    }

    // ── General greetings
    if (/^(hola|buenas|hello|hi|hey|buen día|buenos días|buenas tardes|buenas noches)/.test(msg)) {
        return pickRandom([
            "¡Hola! 😊 Soy Nova, la asistente de NOVA Estética. ¿En qué puedo ayudarte hoy? ¿Estás buscando información sobre algún tratamiento en particular?",
            "¡Buenas! Bienvenida a NOVA Estética 💆‍♀️ Soy Nova. ¿Qué tratamiento te está llamando la atención?",
            "¡Hola! ¿Cómo estás? Soy la asistente de NOVA Estética. ¿Puedo contarte sobre nuestros tratamientos o ayudarte a agendar una cita?",
        ]);
    }

    // ── Price inquiries
    if (/precio|cuánto|costo|vale|cobran|tarifa/.test(msg)) {
        if (services.length === 0) {
            return "Nuestros precios varían según el tratamiento. ¿Querés que te cuente cuáles son nuestros servicios disponibles?";
        }
        const svcName = state.interestedService;
        const found = svcName ? services.find(s => s.title.toLowerCase() === svcName.toLowerCase()) : null;
        if (found) {
            return pickRandom([
                `El tratamiento **${found.title}** tiene un valor de **$${found.price}** y dura aproximadamente ${found.duration || 'variable'}. ¡También tenemos 15% OFF en la primera visita! 🌟 ¿Te gustaría agendar una cita?`,
                `**${found.title}** cuesta **$${found.price}** (duración: ${found.duration || 'aprox. 1 hora'}). Y si es tu primera vez con nosotras, tenés un 15% de descuento. ¿Lo agendamos?`,
            ]);
        }
        const list = services.map(s => `• **${s.title}**: $${s.price}`).join('\n');
        return `Estos son nuestros tratamientos y precios:\n\n${list}\n\n¿Alguno te interesa en particular? 😊`;
    }

    // ── Services listing
    if (/servicio|tratamiento|ofrecen|tienen|qué hacen|catálogo/.test(msg)) {
        if (services.length === 0) {
            return "Por el momento estamos actualizando nuestro catálogo de servicios. ¡Podés escribirnos por Instagram @nova.estetica o llamarnos al +54 11 5555-1234 para más info!";
        }
        const list = services.map(s => `• **${s.title}** — $${s.price} | ${s.duration || 'consultar'}`).join('\n');
        return `¡Claro que sí! En NOVA Estética ofrecemos:\n\n${list}\n\n¿Hay alguno que te llame la atención? Con gusto te cuento más detalles ✨`;
    }

    // ── Availability & booking
    if (/agendar|reservar|turno|cita|appointment|quiero un|me anoto/.test(msg)) {
        if (!state.clientName && !state.clientEmail) {
            return pickRandom([
                "¡Con mucho gusto te ayudo a agendar! 📅 Para reservar tu turno necesito tu nombre y tu email. ¿Me los compartís?",
                "¡Perfecto, agendemos! Solo necesito tu nombre completo y email para confirmar el turno. ¿Me los indicás?",
                "¡Excelente elección! Para reservar tu cita, ¿podés decirme tu nombre y email?",
            ]);
        }
        if (!state.clientName) {
            return "¡Genial! Ya tengo tu email. ¿Me indicás tu nombre para completar la reserva?";
        }
        if (!state.clientEmail) {
            return `Perfecto, ${state.clientName}! ¿Cuál es tu email? Lo necesito para enviarte la confirmación.`;
        }
        if (!state.pendingDate) {
            const slots = availableSlots.length > 0
                ? `Tenemos disponibilidad en los siguientes horarios: ${availableSlots.slice(0, 4).join(', ')}.`
                : 'Tenemos disponibilidad de Lunes a Sábado de 9:00 a 20:00.';
            return `${slots} ¿Qué fecha y horario te queda mejor, ${state.clientName}? 😊`;
        }
    }

    // ── Scheduling with date/time
    if (state.pendingDate && state.clientName && state.clientEmail) {
        const service = state.interestedService || 'Consulta general';
        if (availableSlots.length > 0) {
            return `¡Hay disponibilidad ese día ${state.clientName}! 🎉 Horarios libres: **${availableSlots.slice(0, 4).join(', ')}**. ¿Cuál te viene mejor para tu **${service}**? Así confirmo tu turno.`;
        }
        return `¿A qué horario te viene mejor para tu **${service}**, ${state.clientName}? Nuestro horario es de 9:00 a 20:00 de Lunes a Sábado 📅`;
    }

    // ── Promotions
    if (/promo|descuento|oferta|beneficio|referido/.test(msg)) {
        return pickRandom([
            "¡Tenemos excelentes promos! 🌟\n\n• **15% OFF** en tu primera visita\n• **Pack Glow** (Limpieza + Peeling) por $120 (¡ahorrás $20!)\n• **Referidos**: traé a una amiga y ambas reciben 10% OFF\n\n¿Te interesa alguna?",
            "Hay varias promos vigentes:\n\n✨ Primera visita: **15% OFF**\n💆 Pack Glow: **$120** (Limpieza + Peeling)\n👯 Referidas: **10% OFF** para vos y tu amiga\n\n¿Aprovechamos alguna?",
        ]);
    }

    // ── Location / hours
    if (/dónde|dirección|ubicación|horario|cuando abren|cuando cierran|llegar|address|where|hours/.test(msg)) {
        return pickRandom([
            "Estamos ubicadas en **Av. Libertador 1234, Buenos Aires** 📍 Abrimos de **Lunes a Sábado de 9:00 a 20:00** (domingos descansamos). ¿Agendamos tu visita?",
            "¡Nos encontramos en **Av. Libertador 1234, CABA**! Nuestro horario es de 9 a 20hs de Lunes a Sábado. ¿Venís a vernos? 😊",
        ]);
    }

    // ── Payment methods
    if (/pago|pagar|efectivo|tarjeta|mercadopago|cuotas|transferencia/.test(msg)) {
        return "Aceptamos **efectivo, tarjeta de débito/crédito** (Visa, Mastercard, Amex), **MercadoPago** y **transferencia bancaria**. También ofrecemos **cuotas sin interés** en 3 y 6 pagos 💳";
    }

    // ── Contact
    if (/instagram|redes|contacto|teléfono|whatsapp|llamar/.test(msg)) {
        return "¡Podés encontrarnos en Instagram como **@nova.estetica** 📸 o llamarnos al **+54 11 5555-1234**. También podés agendar tu turno directamente desde acá, ¡es mucho más fácil! 😊";
    }

    // ── Farewells
    if (/gracias|chau|adiós|hasta luego|bye|ok listo|perfecto gracias/.test(msg)) {
        return pickRandom([
            "¡Un placer haberte ayudado! 💆‍♀️ Te esperamos en NOVA Estética. ¡Que tengas un excelente día!",
            "¡Gracias a vos! 😊 Si necesitás algo más, acá estamos. ¡Hasta pronto!",
            "¡Hasta luego! ✨ Cualquier consulta que tengas, no dudes en escribirnos. ¡Nos vemos en NOVA!",
        ]);
    }

    // ── Collecting name when we only have email
    if (state.clientEmail && !state.clientName) {
        return "¡Gracias por tu email! ¿Me decís tu nombre para poder personalizarte mejor la atención?";
    }

    // ── Collecting email when we have name
    if (state.clientName && !state.clientEmail) {
        return `¡Hola, ${state.clientName}! ¿Me podés dar tu email? Lo uso para enviarte la confirmación de tu cita.`;
    }

    // ── Default: guide conversation
    const defaults = [
        "¿En qué puedo ayudarte hoy? 😊 Podés preguntarme sobre nuestros tratamientos, precios o agendarte una cita directamente.",
        "¡Estoy aquí para lo que necesites! ¿Querés info sobre algún tratamiento o preferís reservar un turno?",
        "Claro, con gusto. ¿Me contás un poco más sobre lo que estás buscando? Así te oriento mejor con nuestros servicios 💆‍♀️",
    ];
    return pickRandom(defaults);
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: Request) {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> };
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });

        // Load active services from DB
        const { rows: services } = await pool.query<{ title: string; price: number; duration: string; description: string }>(
            'SELECT title, price, duration, description FROM services WHERE active = true ORDER BY created_at ASC'
        );

        // Extract conversation state
        const state = extractState(messages, services);
        const lastMsg = messages[messages.length - 1]?.content || '';

        // ── Check availability if date is detected
        let availableSlots: string[] = [];
        if (state.pendingDate) {
            const { rows: taken } = await pool.query<{ date_time: string }>(
                "SELECT date_time FROM appointments WHERE date_time >= $1 AND date_time <= $2 AND status != 'cancelled'",
                [`${state.pendingDate} 00:00:00`, `${state.pendingDate} 23:59:59`]
            );
            const takenHours = new Set(taken.map(r => new Date(r.date_time).getHours()));
            for (let h = 9; h <= 19; h++) {
                if (!takenHours.has(h)) availableSlots.push(`${String(h).padStart(2, '0')}:00`);
            }
        }

        // ── Book appointment if we have all the data and user confirms
        let bookingResult: { success: boolean; datetime?: string; service?: string } | null = null;
        const wantsToBook = /confirm|sí|si|dale|perfecto|listo|ok|de acuerdo|agendar|reservar/.test(lastMsg.toLowerCase());

        if (
            wantsToBook &&
            state.clientName &&
            state.clientEmail &&
            state.pendingDate &&
            state.pendingTime
        ) {
            const dateTimeStr = `${state.pendingDate}T${state.pendingTime}:00`;
            const service = state.interestedService || 'Consulta general';

            // Upsert lead
            const { rows: existingLead } = await pool.query<{ id: string }>(
                "SELECT id FROM leads WHERE contact_info->>'email' = $1",
                [state.clientEmail]
            );
            let leadId: string;
            if (existingLead.length > 0) {
                leadId = existingLead[0].id;
                await pool.query(
                    "UPDATE leads SET client_name = $1, status = 'qualified', intent_score = $2 WHERE id = $3",
                    [state.clientName, state.intentScore, leadId]
                );
            } else {
                const { rows: newLead } = await pool.query<{ id: string }>(
                    "INSERT INTO leads (client_name, contact_info, status, intent_score) VALUES ($1, $2, 'qualified', $3) RETURNING id",
                    [state.clientName, JSON.stringify({ email: state.clientEmail }), state.intentScore]
                );
                leadId = newLead[0].id;
            }

            // Insert appointment
            await pool.query(
                "INSERT INTO appointments (lead_id, date_time, service_type, status) VALUES ($1, $2, $3, 'scheduled')",
                [leadId, dateTimeStr, service]
            );

            const friendlyDate = new Date(dateTimeStr).toLocaleDateString('es-AR', {
                weekday: 'long', day: 'numeric', month: 'long'
            });
            const friendlyTime = state.pendingTime;

            bookingResult = { success: true, datetime: `${friendlyDate} a las ${friendlyTime}hs`, service };
        }

        // ── Update lead intent in background (don't block response)
        if (state.clientEmail && state.intentScore >= 40) {
            pool.query(
                "UPDATE leads SET intent_score = $1 WHERE contact_info->>'email' = $2",
                [state.intentScore, state.clientEmail]
            ).catch(() => {/* silent */ });
        }

        // Generate the natural response
        const response = generateResponse(lastMsg, state, services, availableSlots, bookingResult);

        await pool.end();
        return sseStream(response);

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.error('chat error:', msg);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
