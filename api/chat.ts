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
            const words = text.split(' ');
            for (let i = 0; i < words.length; i++) {
                const chunk = (i === 0 ? '' : ' ') + words[i];
                const data = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                // Variable delay for human feel
                await new Promise(r => setTimeout(r, 20 + Math.random() * 40));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
        }
    });
    return new Response(stream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
    });
}

// ─── Sophisticated State Extraction ──────────────────────────────────────────
interface ConvState {
    clientEmail: string | null;
    clientPhone: string | null;
    interestedService: string | null;
    stage: 'greeting' | 'service_selection' | 'availability_proposal' | 'contact_info_collection' | 'done';
    pendingDate: string | null;
    pendingTime: string | null;
}

function extractState(messages: Array<{ role: string; content: string }>, services: Array<{ title: string; price: number }>): ConvState {
    const state: ConvState = {
        clientEmail: null,
        clientPhone: null,
        interestedService: null,
        stage: 'greeting',
        pendingDate: null,
        pendingTime: null
    };

    if (messages.length === 0) return state;

    const allText = messages.map(m => m.content).join('\n').toLowerCase();
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || "";

    // 1. Service Detection
    for (const svc of services) {
        if (lastUserMsg.includes(svc.title.toLowerCase())) {
            state.interestedService = svc.title;
            break;
        }
    }
    if (!state.interestedService) {
        for (const svc of services) {
            if (allText.includes(svc.title.toLowerCase())) {
                state.interestedService = svc.title;
                break;
            }
        }
    }

    // 2. Contact Detection
    const emailMatch = allText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    if (emailMatch) state.clientEmail = emailMatch[0].toLowerCase();

    const phoneMatch = allText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 8) {
        state.clientPhone = phoneMatch[0].trim();
    }

    // 3. Appointment Extraction (Detecting the bot's proposal and user's "ok")
    const dateProposalMatch = allText.match(/(\d{4})-(\d{2})-(\d{2})/); // ISO Date in text
    if (dateProposalMatch) state.pendingDate = dateProposalMatch[0];

    const timeMatch = allText.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) state.pendingTime = timeMatch[0];

    // Update Stage
    if (messages.length <= 1) state.stage = 'greeting';
    else if (!state.interestedService) state.stage = 'service_selection';
    else if (!state.pendingDate || !state.pendingTime) state.stage = 'availability_proposal';
    else if (!state.clientEmail && !state.clientPhone) state.stage = 'contact_info_collection';
    else state.stage = 'done';

    return state;
}

function generateResponse(
    state: ConvState,
    services: Array<{ title: string; price: number }>,
    availableSlot: { date: string, time: string } | null,
    isBookingConfirmed: boolean
): string {
    if (isBookingConfirmed) {
        return `¡Excelente! 🎉 He confirmado tu turno para **${state.interestedService}** el día **${state.pendingDate}** a las **${state.pendingTime}hs**. Estaremos esperándote en NOVA Estética para brindarte una experiencia única de lujo. Que tengas un día maravilloso. ✨ ¡Adiós!`;
    }

    switch (state.stage) {
        case 'greeting':
            return "¡Hola! Bienvenido a **NOVA Estética**. 😊 Soy tu asistente virtual y estoy aquí para ayudarte a lucir y sentirte increíble. ¿Te gustaría agendar un turno para uno de nuestros tratamientos exclusivos hoy?";

        case 'service_selection': {
            const svcList = services.map(s => `• **${s.title}**`).join('\n');
            return `¡Me encantaría ayudarte! ✨ ¿Para qué servicio te gustaría agendar? Actualmente disponemos de:\n\n${svcList}\n\nDime cuál prefieres y buscamos un espacio para ti.`;
        }

        case 'availability_proposal':
            if (availableSlot) {
                return `¡Perfecto! Para **${state.interestedService}**, el próximo horario disponible que tengo es el **${availableSlot.date} a las ${availableSlot.time}hs**. 🗓️ ¿Te queda bien este horario o prefieres buscar otro?`;
            }
            return "Estamos consultando nuestra agenda de lujo... Por favor, dime qué día te vendría bien y buscaremos el mejor horario para ti. 😊";

        case 'contact_info_collection':
            return `¡Excelente elección! Para finalizar la reserva de tu turno de **${state.interestedService}**, ¿podrías dejarme un medio de contacto? Ya sea un **Email** (con @) o un número de **Teléfono** para enviarte los detalles. ✨`;

        default:
            return "Entiendo. ¿Hay algo más en lo que pueda asistirte para que tu experiencia en NOVA sea perfecta? ✨";
    }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: Request) {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
        const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> };
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });

        // Fetch services
        const { rows: services } = await pool.query<{ title: string; price: number }>(
            'SELECT title, price FROM services WHERE active = true ORDER BY sort_order ASC, created_at ASC'
        );

        const state = extractState(messages, services);

        // Find availability if needed
        let nextSlot: { date: string, time: string } | null = null;
        if (state.stage === 'availability_proposal' && state.interestedService) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() + 1); // Start tomorrow

            let found = false;
            for (let d = 0; d < 14 && !found; d++) {
                const dateStr = checkDate.toISOString().split('T')[0];
                const { rows: taken } = await pool.query<{ date_time: string }>(
                    "SELECT date_time FROM appointments WHERE date_time::date = $1 AND status != 'cancelled'",
                    [dateStr]
                );
                const takenHours = new Set(taken.map(r => new Date(r.date_time).getUTCHours()));

                for (let h = 10; h <= 18; h++) {
                    if (!takenHours.has(h)) {
                        nextSlot = { date: dateStr, time: `${h}:00` };
                        found = true;
                        break;
                    }
                }
                checkDate.setDate(checkDate.getDate() + 1);
            }
        }

        const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || "";
        const userConfirms = /si|sí|dale|ok|perfecto|bien|está bien|me gusta|confirmar/.test(lastUserMsg);

        if (state.stage === 'availability_proposal' && userConfirms && nextSlot) {
            state.pendingDate = nextSlot.date;
            state.pendingTime = nextSlot.time;
            state.stage = 'contact_info_collection';
        }

        let isBookingConfirmed = false;
        if (state.stage === 'done') {
            const dateTimeStr = `${state.pendingDate}T${state.pendingTime}:00Z`;
            const contactValue = state.clientEmail || state.clientPhone || 'N/A';
            const contactKey = state.clientEmail ? 'email' : 'phone';

            const { rows: newLead } = await pool.query<{ id: string }>(
                "INSERT INTO leads (client_name, contact_info, status, intent_score) VALUES ($1, $2, 'qualified', 98) RETURNING id",
                ['Cliente Nova', JSON.stringify({ [contactKey]: contactValue })]
            );

            await pool.query(
                "INSERT INTO appointments (lead_id, date_time, service_type, status) VALUES ($1, $2, $3, 'scheduled')",
                [newLead[0].id, dateTimeStr, state.interestedService]
            );
            isBookingConfirmed = true;
        }

        const response = generateResponse(state, services, nextSlot, isBookingConfirmed);
        await pool.end();
        return sseStream(response);

    } catch (e: unknown) {
        const error = e as Error;
        console.error("Chat error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
}
