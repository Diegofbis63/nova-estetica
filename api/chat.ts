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
const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "");

function findBestServiceMatch(userInput: string, services: Array<{ title: string; price: number }>): string | null {
    const normalizedInput = normalizeText(userInput);
    let bestMatch: string | null = null;
    let highestScore = 0;

    services.forEach(service => {
        const serviceName = normalizeText(service.title);
        const words = serviceName.split(/\s+/).filter(w => w.length > 2); // filter short words
        let score = 0;

        words.forEach(word => {
            if (normalizedInput.includes(word)) score += 1;
        });

        if (score > highestScore) {
            highestScore = score;
            bestMatch = service.title;
        }
    });

    return highestScore > 0 ? bestMatch : null;
}

interface ConvState {
    clientName: string | null;
    clientPhone: string | null;
    interestedService: string | null;
    stage: 'greeting' | 'service_selection' | 'name_collection' | 'phone_collection' | 'availability_proposal' | 'done';
    pendingDate: string | null;
    pendingTime: string | null;
}

function extractState(messages: Array<{ role: string; content: string }>, services: Array<{ title: string; price: number }>): ConvState {
    const state: ConvState = {
        clientName: null,
        clientPhone: null,
        interestedService: null,
        stage: 'greeting',
        pendingDate: null,
        pendingTime: null
    };

    if (messages.length === 0) return state;

    let lastAsked = '';
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === 'assistant') {
            const lowContent = msg.content.toLowerCase();
            if (lowContent.includes("tu nombre")) {
                lastAsked = 'name';
            } else if (lowContent.includes("whatsapp") || lowContent.includes("teléfono")) {
                lastAsked = 'phone';
            } else if (lowContent.includes("servicio") || lowContent.includes("tratamiento")) {
                lastAsked = 'service';
            } else if (lowContent.includes("horario disponible")) {
                lastAsked = 'availability';
            }
        } else if (msg.role === 'user') {
            const text = msg.content;

            // Try to extract service
            if (!state.interestedService) {
                const svc = findBestServiceMatch(text, services);
                if (svc) state.interestedService = svc;
            }

            // Try to extract name (Guard rail: no numbers, at least 3 chars)
            if (state.interestedService && !state.clientName) {
                if (!/\d/.test(text)) {
                    const cleaned = text.replace(/^(hola\s+)?(soy|me llamo|mi nombre es)\s+/i, '').trim();
                    // exclude basic feedback words
                    const isCommonWord = /^(si|sí|no|gracias|ok|dale|perfecto|hola)$/i.test(cleaned);
                    if (cleaned.length >= 3 && !isCommonWord && cleaned.toLowerCase() !== state.interestedService?.toLowerCase()) {
                        // Capitalize correctly
                        state.clientName = cleaned.replace(/\b\w/g, l => l.toUpperCase());
                    }
                }
            }

            // Try to extract phone (Guard rail: minimum digits)
            if (state.interestedService && state.clientName && !state.clientPhone) {
                const phoneMatch = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
                if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 8) {
                    state.clientPhone = phoneMatch[0].trim();
                }
            }
        }
    }

    // Appointment Parsing (Bot proposed this, so it could be in allText)
    const allText = messages.map(m => m.content).join('\n');
    const dateProposalMatch = allText.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dateProposalMatch) state.pendingDate = dateProposalMatch[0];

    const timeMatch = allText.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) state.pendingTime = timeMatch[0];

    // Determine Strict Stage
    if (messages.length <= 1) state.stage = 'greeting';
    else if (!state.interestedService) state.stage = 'service_selection';
    else if (!state.clientName) state.stage = 'name_collection';
    else if (!state.clientPhone) state.stage = 'phone_collection';
    else state.stage = 'availability_proposal';

    return state;
}

function generateResponse(
    state: ConvState,
    services: Array<{ title: string; price: number }>,
    availableSlot: { date: string, time: string } | null,
    isBookingConfirmed: boolean
): string {
    if (isBookingConfirmed) {
        return `¡Excelente! 🎉 He confirmado tu turno para **${state.interestedService}** el día **${state.pendingDate}** a las **${state.pendingTime}hs**. Estaremos esperándote en NOVA Estética para brindarte una experiencia única de lujo.\n\nQue tengas un día maravilloso. ✨ ¡Adiós!`;
    }

    switch (state.stage) {
        case 'greeting':
            return "¡Hola! Bienvenido a **NOVA Estética**. 😊 Soy tu asistente virtual y estoy aquí para ayudarte a lucir y sentirte increíble.\n\n¿Te gustaría agendar un turno para uno de nuestros tratamientos exclusivos hoy?";

        case 'service_selection': {
            const svcList = services.map(s => `• **${s.title}**`).join('\n');
            return `¡Me encantaría ayudarte! ✨ ¿Qué tratamiento o servicio estás buscando? Nuestras opciones son:\n\n${svcList}\n\nDime cuál prefieres para comenzar.`;
        }

        case 'name_collection':
            return `¡Excelente elección el **${state.interestedService}**! ✨ Para poder brindarte una atención personalizada, ¿podrías decirme tu nombre y apellido? (Procura ingresar tu nombre sin números).`;

        case 'phone_collection':
            return `¡Un gusto conocerte, **${state.clientName}**! 😊\n\nPara poder enviarte los detalles de tu turno y registrar tu perfil, indícame tu número de WhatsApp.`;

        case 'availability_proposal':
            if (availableSlot) {
                return `¡Perfecto, ${state.clientName}! Ya registré tus datos provisoriamente. 🌟\n\nPara **${state.interestedService}**, el próximo horario disponible que tengo es el **${availableSlot.date} a las ${availableSlot.time}hs**. 🗓️\n\n¿Te queda bien este horario o prefieres buscar otro? (Responde "sí" para confirmar)`;
            }
            return "Estamos consultando nuestra agenda de lujo... Por favor, dime qué día te vendría bien y buscaremos el mejor horario para ti. 😊";

        default:
            return "Entiendo. ¿Hay algo más en lo que pueda asistirte para que tu experiencia en NOVA sea perfecta? ✨";
    }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: Request) {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    let pool: Pool | null = null;
    try {
        const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> };
        pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
                        nextSlot = { date: dateStr, time: `${h.toString().padStart(2, '0')}:00` };
                        found = true;
                        break;
                    }
                }
                checkDate.setDate(checkDate.getDate() + 1);
            }
        }

        const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || "";
        const userConfirms = /si|sí|dale|ok|perfecto|bien|está bien|me gusta|confirmar/i.test(lastUserMsg);

        let isBookingConfirmed = false;
        // User is confirming the explicit date/time we proposed previously
        if (state.stage === 'availability_proposal' && userConfirms && state.pendingDate && state.pendingTime) {
            const dateTimeStr = `${state.pendingDate}T${state.pendingTime}:00Z`;

            const { rows: leads } = await pool.query<{ id: string }>(
                `SELECT id FROM leads WHERE contact_info->>'phone' = $1 LIMIT 1`,
                [state.clientPhone]
            );
            const leadId = leads.length > 0 ? leads[0].id : null;

            if (leadId) {
                // verify not already booked
                const { rows: existingApps } = await pool.query(
                    `SELECT id FROM appointments WHERE lead_id = $1 AND date_time = $2 AND status != 'cancelled'`,
                    [leadId, dateTimeStr]
                );

                if (existingApps.length === 0) {
                    await pool.query(
                        "INSERT INTO appointments (lead_id, date_time, service_type, status) VALUES ($1, $2, $3, 'pending')",
                        [leadId, dateTimeStr, state.interestedService]
                    );
                }
                isBookingConfirmed = true;
            }
        }

        // Generate response
        const responseText = generateResponse(state, services, nextSlot, isBookingConfirmed);

        // --- EARLY UPSERT FOR LEADS (Guard Rails Passed) ---
        if (state.interestedService && state.clientName && state.clientPhone) {
            const contactValue = state.clientPhone;
            // Append assistant's soon-to-be response to history so it's perfectly in sync in DB!
            const newHistory = [...messages, { role: 'assistant', content: responseText }];
            const chatHistoryJson = JSON.stringify(newHistory);

            const { rows: existingLeads } = await pool.query<{ id: string }>(
                `SELECT id FROM leads WHERE contact_info->>'phone' = $1`,
                [contactValue]
            );

            const intentScore = isBookingConfirmed ? 100 : 80;

            if (existingLeads.length > 0) {
                await pool.query(
                    `UPDATE leads SET client_name = $1, intent_score = $2, chat_history = $3::jsonb WHERE id = $4`,
                    [state.clientName, intentScore, chatHistoryJson, existingLeads[0].id]
                );
            } else {
                await pool.query(
                    `INSERT INTO leads (client_name, contact_info, status, intent_score, chat_history) VALUES ($1, $2, 'qualified', $3, $4::jsonb)`,
                    [state.clientName, JSON.stringify({ phone: contactValue }), intentScore, chatHistoryJson]
                );
            }
        }
        // ---------------------------------------------------

        await pool.end();
        return sseStream(responseText);

    } catch (e: unknown) {
        if (pool) await pool.end();
        const error = e as Error;
        console.error("Chat error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
}
