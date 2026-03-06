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
    isAskingAlternatives: boolean;
    targetDate: string | null;
    previouslySuggestedCount: number;
    isAmbiguous: boolean;
    rejectedDates: string[];
    requestedTime: string | null;
}

function extractState(messages: Array<{ role: string; content: string }>, services: Array<{ title: string; price: number }>): ConvState {
    const state: ConvState = {
        clientName: null,
        clientPhone: null,
        interestedService: null,
        stage: 'greeting',
        pendingDate: null,
        pendingTime: null,
        isAskingAlternatives: false,
        targetDate: null,
        previouslySuggestedCount: 0,
        isAmbiguous: false,
        rejectedDates: [],
        requestedTime: null
    };

    if (messages.length === 0) return state;

    let lastAssistantAsked = '';
    // Look at the last assistant message to see what we are expecting
    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length > 0) {
        const lastBotMsg = assistantMsgs[assistantMsgs.length - 1].content.toLowerCase();
        if (lastBotMsg.includes("tu nombre") || lastBotMsg.includes("gusto de hablar")) lastAssistantAsked = 'name';
        else if (lastBotMsg.includes("whatsapp") || lastBotMsg.includes("teléfono")) lastAssistantAsked = 'phone';
        else if (lastBotMsg.includes("servicio") || lastBotMsg.includes("tratamiento")) lastAssistantAsked = 'service';
    }

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === 'user') {
            const text = msg.content;

            // 1. Extract Service
            if (!state.interestedService) {
                const svc = findBestServiceMatch(text, services);
                if (svc) {
                    state.interestedService = svc;
                    // If we found the service in THIS message, we stop here for this message processing
                    // to avoid extracting "quiero turno para x" as a name in the same turn.
                    continue;
                }
            }

            // 2. Extract Name
            // Only extract if we have a service but no name
            if (state.interestedService && !state.clientName) {
                const nameKeywords = /^(soy|me llamo|mi nombre es)\s+/i;
                const hasNameKeyword = nameKeywords.test(text);

                // Only extract if bot asked for name OR user used keyword
                // AND ensure it doesn't look like a service request
                if (lastAssistantAsked === 'name' || hasNameKeyword) {
                    if (!/\d/.test(text)) {
                        const cleaned = text.replace(nameKeywords, '').replace(/^(hola\s+)?/i, '').trim();

                        // Strict blacklist from user request
                        const blacklist = [/hola/i, /quiero/i, /turno/i, /estetica/i, /servicio/i, /tratamiento/i];
                        const isBlacklisted = blacklist.some(regex => regex.test(cleaned));

                        const isCommonWord = /^(si|sí|no|gracias|ok|dale|perfecto|hola)$/i.test(cleaned);
                        const isSentence = cleaned.split(' ').length > 4;
                        const looksLikeService = services.some(s => normalizeText(cleaned).includes(normalizeText(s.title)));

                        if (cleaned.length >= 3 && !isBlacklisted && !isCommonWord && !isSentence && !looksLikeService) {
                            state.clientName = cleaned.replace(/\b\w/g, l => l.toUpperCase());
                            if (!hasNameKeyword) continue; // consume message
                        }
                    }
                }
            }

            // 3. Extract Phone
            if (state.interestedService && state.clientName && !state.clientPhone) {
                const phoneMatch = text.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);
                if (phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 8) {
                    state.clientPhone = phoneMatch[0].trim();
                }
            }

            // 4. Extract Preferred Slot (if user mentions a time/date)
            if (state.interestedService && state.clientName && state.clientPhone) {
                // Time detection: matches 13:00, 13hs, 13 hs, a las 13
                const timeMatch = text.match(/(\d{1,2})[:h\s]*(\d{2})?hs?/i);
                if (timeMatch) {
                    const hours = timeMatch[1].padStart(2, '0');
                    const mins = timeMatch[2] || '00';
                    state.requestedTime = `${hours}:${mins}`;
                }
            }

            // 5. Detect Day Rejection
            const rejectionKeywords = /no\s+(puedo|sirve|va|es\s+posible).*?(ese\s+dia|el\s+dia|hoy|mañana|lunes|martes|miercoles|jueves|viernes|sabado|domingo)/i;
            const looseRejection = /ese\s+dia\s+no/i;
            if (rejectionKeywords.test(text) || looseRejection.test(text)) {
                // If the bot just suggested a date, we add it to rejections
                if (state.pendingDate) {
                    state.rejectedDates.push(state.pendingDate);
                }

                // Also check for specific day mentions in the rejection
                const daysArr = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
                for (const d of daysArr) {
                    if (text.toLowerCase().includes(d)) {
                        const now = new Date();
                        const targetIdx = daysArr.indexOf(d);
                        const currentIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
                        let diff = targetIdx - currentIdx;
                        if (diff <= 0) diff += 7;
                        const target = new Date(now);
                        target.setDate(now.getDate() + diff);
                        state.rejectedDates.push(target.toISOString().split('T')[0]);
                    }
                }
            }
        }
    }

    // Appointment Parsing from History & Counting Suggestions
    if (assistantMsgs.length > 0) {
        // Find ALL previous date/time suggestions in history to know 'where we are'
        assistantMsgs.forEach(m => {
            const lowMsg = m.content.toLowerCase();
            if (lowMsg.includes("horario disponible") || lowMsg.includes("serviría") || lowMsg.includes("te sirve quizás") || lowMsg.includes("parece el") || lowMsg.includes("otros horarios")) {
                state.previouslySuggestedCount++;
            }
        });

        const lastBotMsg = assistantMsgs[assistantMsgs.length - 1].content;
        const dateMatch = lastBotMsg.match(/(\d{4})-(\d{2})-(\d{2})/);
        const timeMatch = lastBotMsg.match(/(\d{1,2}):(\d{2})/);
        if (dateMatch) state.pendingDate = dateMatch[0];
        if (timeMatch && !state.pendingTime) state.pendingTime = timeMatch[0].padStart(5, '0');
    }

    // Intent detection for alternatives
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || "";

    // Day detection
    const daysArr = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    for (const d of daysArr) {
        if (lastUserMsg.includes(d)) {
            const now = new Date();
            const targetIdx = daysArr.indexOf(d);
            const currentIdx = now.getDay() === 0 ? 6 : now.getDay() - 1; // map to 0-6 starting lunes
            let diff = targetIdx - currentIdx;
            if (diff <= 0) diff += 7;
            const target = new Date(now);
            target.setDate(now.getDate() + diff);
            state.targetDate = target.toISOString().split('T')[0];
            state.isAskingAlternatives = true;
            break;
        }
    }
    if (lastUserMsg.includes("mañana")) {
        const target = new Date();
        target.setDate(target.getDate() + 1);
        state.targetDate = target.toISOString().split('T')[0];
        state.isAskingAlternatives = true;
    }

    const userConfirmsStrict = /\b(si|sí|dale|ok|perfecto|bien|confirmar|confirmado)\b/i.test(lastUserMsg);
    const userRejectsStrict = /\b(no|otro|cambiar|no puedo|busca|otra|me sirve)\b/i.test(lastUserMsg) || lastUserMsg.includes("no me sirve");

    if (userRejectsStrict) {
        state.isAskingAlternatives = true;
        state.isAmbiguous = false;
    } else if (userConfirmsStrict) {
        state.isAskingAlternatives = false;
        state.isAmbiguous = false;
    } else if (state.stage === 'availability_proposal') {
        // If it's the proposal stage and we don't see clear YES or clear NO, it's ambiguous
        state.isAmbiguous = /turno|hora|momento|ver/i.test(lastUserMsg);
    }

    if (!state.isAskingAlternatives && !userConfirmsStrict && !state.isAmbiguous) {
        state.isAskingAlternatives = /otro|horario|disponible|dia|puedo|cambiar|opciones|turno|momento|proximo/i.test(lastUserMsg) || state.requestedTime !== null;
    }

    // Stage update
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
    availableSlots: Array<{ date: string, time: string }>,
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
            return `¡Excelente elección! El **${state.interestedService}** es uno de nuestros tratamientos estrella. ✨ Antes de ver la agenda, ¿con quién tengo el gusto de hablar?`;

        case 'phone_collection':
            return `¡Un gusto conocerte, **${state.clientName}**! 😊\n\nPara poder enviarte los detalles de tu turno y registrar tu perfil, indícame tu número de WhatsApp.`;

        case 'availability_proposal':
            if (state.isAmbiguous) {
                return `Entiendo, **${state.clientName}**. ✨ ¿Te gustaría confirmar este horario o prefieres que busquemos otra opción?`;
            }

            if (availableSlots.length > 0) {
                const isNthSuggestion = state.previouslySuggestedCount > 0;
                const slot = availableSlots[0];

                // Specific requested time logic
                if (state.requestedTime) {
                    const isMatch = slot.time.startsWith(state.requestedTime.split(':')[0]);
                    if (isMatch) {
                        return `¡Buenas noticias, **${state.clientName}**! 😊 Tengo disponible el **${slot.date}** a las **${slot.time}hs**, tal como pediste. ✨ ¿Te gustaría confirmarlo?`;
                    } else {
                        return `Lo siento, a las **${state.requestedTime}hs** no tengo lugar disponible. 🗓️ Pero tengo disponible el **${slot.date}** a las **${slot.time}hs**. ¿Te serviría?`;
                    }
                }

                // If user rejected a day
                if (state.rejectedDates.length > 0 && state.isAskingAlternatives) {
                    return `Comprendido, buscamos otro día. 🗓️ ¿Qué te parece el **${slot.date}** a las **${slot.time}hs**? ✨`;
                }

                if (state.isAskingAlternatives && isNthSuggestion) {
                    return `¡Entendido! No hay problema. 😊 ¿Te sirve quizás el **${slot.date}** a las **${slot.time}hs**? ✨`;
                }

                if (isNthSuggestion) {
                    return `¿Qué te parece el **${slot.date}** a las **${slot.time}hs**? ¿Te queda mejor este horario? 🗓️`;
                }

                return `¡Perfecto, ${state.clientName}! Ya registré tus datos provisoriamente. 🌟\n\nPara **${state.interestedService}**, el próximo horario disponible que tengo es el **${slot.date} a las ${slot.time}hs**. 🗓️\n\n¿Te queda bien este horario o prefieres buscar otro? (Responde "sí" para confirmar)`;
            }
            return "Por el momento no tengo más espacios esta semana. 🗓️ ¿Te gustaría dejar tu contacto para que te avisemos si alguien cancela o se libera algún lugar? 😊";

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
        const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        if (!connectionString) throw new Error("Missing connection string");
        pool = new Pool({ connectionString });

        // Fetch services
        const { rows: services } = await pool.query<{ title: string; price: number }>(
            'SELECT title, price FROM services WHERE active = true ORDER BY sort_order ASC, created_at ASC'
        );

        const state = extractState(messages, services);

        // Find availability
        const foundSlots: Array<{ date: string, time: string }> = [];
        if (state.stage === 'availability_proposal' && state.interestedService) {
            const searchDate = state.targetDate ? new Date(state.targetDate) : new Date();
            if (!state.targetDate) searchDate.setDate(searchDate.getDate() + 1);

            // We skip slots already suggested
            let totalFoundToSkip = 0;
            const slotsToFind = 1;

            for (let d = 0; d < 14 && foundSlots.length < slotsToFind; d++) {
                const dateStr = searchDate.toISOString().split('T')[0];

                // Skip rejected dates
                if (state.rejectedDates.includes(dateStr)) {
                    searchDate.setDate(searchDate.getDate() + 1);
                    continue;
                }

                const { rows: taken } = await pool.query<{ date_time: string }>(
                    "SELECT date_time FROM appointments WHERE date_time::date = $1 AND status != 'canceled'",
                    [dateStr]
                );
                const takenHours = new Set(taken.map(r => new Date(r.date_time).getUTCHours()));

                // If user requested a specific time, check it first for this day
                if (state.requestedTime) {
                    const reqH = parseInt(state.requestedTime.split(':')[0]);
                    if (reqH >= 10 && reqH <= 18 && !takenHours.has(reqH)) {
                        foundSlots.push({ date: dateStr, time: `${reqH.toString().padStart(2, '0')}:00` });
                        if (foundSlots.length >= slotsToFind) break;
                    }
                }

                for (let h = 10; h <= 18; h++) {
                    // Avoid duplicate if requestedTime was already found for this day
                    if (state.requestedTime && parseInt(state.requestedTime.split(':')[0]) === h) continue;

                    if (!takenHours.has(h)) {
                        // Check if we already suggested this one in history
                        totalFoundToSkip++;
                        if (totalFoundToSkip > state.previouslySuggestedCount) {
                            foundSlots.push({ date: dateStr, time: `${h.toString().padStart(2, '0')}:00` });
                            if (foundSlots.length >= slotsToFind) break;
                        }
                    }
                }
                searchDate.setDate(searchDate.getDate() + 1);
            }
        }

        const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || "";
        const userConfirms = /\b(si|sí|dale|ok|perfecto|bien|confirmar|confirmado)\b/i.test(lastUserMsg);
        const userRejects = /\b(no|otro|cambiar|no puedo|busca|otra|me sirve)\b/i.test(lastUserMsg) || lastUserMsg.includes("no me sirve");

        let isBookingConfirmed = false;
        // User is confirming BUT only if they didn't also reject it in the same message (e.g. "no me sirve")
        if (state.stage === 'availability_proposal' && userConfirms && !userRejects && !state.isAmbiguous && state.pendingDate && state.pendingTime) {
            const dateTimeStr = `${state.pendingDate}T${state.pendingTime}:00Z`;

            const { rows: leads } = await pool.query<{ id: string }>(
                `SELECT id FROM leads WHERE contact_info->>'phone' = $1 LIMIT 1`,
                [state.clientPhone]
            );
            const leadId = leads.length > 0 ? leads[0].id : null;

            if (leadId) {
                // verify not already booked
                const { rows: existingApps } = await pool.query(
                    `SELECT id FROM appointments WHERE lead_id = $1 AND date_time = $2 AND status != 'canceled'`,
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
        const responseText = generateResponse(state, services, foundSlots, isBookingConfirmed);

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
