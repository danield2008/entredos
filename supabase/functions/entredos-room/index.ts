import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TOPICS = new Set(["all", "romantic", "fun", "deep", "memories", "future"]);
const GAME_MODES = new Set(["questions", "who", "truth", "memories", "date", "deep"]);
const MAX_BODY_BYTES = 8192;

function reply(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}
function cleanName(input: unknown, fallback: string) {
  const value = typeof input === "string"
    ? input.replace(/[<>\u0000-\u001F\u007F]/g, "").trim().slice(0, 24)
    : "";
  return value || fallback;
}
function cleanCode(input: unknown) {
  return typeof input === "string" ? input.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) : "";
}
function cleanToken(input: unknown) {
  if (typeof input !== "string") return null;
  const token = input.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token) ? token : null;
}
function newRoomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}
async function hmacKey(value: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SERVICE_KEY),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, "0")).join("");
}
function clientIp(req: Request) {
  // Supabase's edge proxy provides these headers; only a pseudonymous HMAC is persisted.
  return req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}
async function enforceRateLimit(req: Request, action: "create" | "join" | "join_code", extra = "") {
  const key = await hmacKey(clientIp(req) + "|" + extra);
  const limits = action === "create"
    ? { max: 5, seconds: 600 }
    : action === "join"
      ? { max: 12, seconds: 300 }
      : { max: 5, seconds: 600 };
  const { data, error } = await db.rpc("entredos_consume_room_rate_limit", {
    p_key_hash: key, p_action: action, p_max_attempts: limits.max,
    p_window_seconds: limits.seconds,
  });
  if (error) throw error;
  return data === true;
}
function roomPublic(room: Record<string, any>) {
  return {
    code: room.code,
    topic: room.topic,
    game_mode: room.game_mode || "questions",
    intensity: room.intensity || "romantico",
    host_name: room.host_name,
    guest_name: room.guest_name,
    status: room.status,
    question_index: room.question_index,
    question_limit: room.question_limit,
    expires_at: room.expires_at,
  };
}
async function fetchRoom(code: string) {
  const { data, error } = await db.from("entredos_rooms").select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  if (!data) return { room: null, error: "room_not_found" as const };
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return { room: null, error: "room_expired" as const };
  }
  return { room: data, error: null };
}
function roleFor(room: Record<string, any>, token: string) {
  if (room.host_token === token) return "host" as const;
  if (room.guest_token && room.guest_token === token) return "guest" as const;
  return null;
}
async function statePayload(room: Record<string, any>, token: string) {
  const role = roleFor(room, token);
  if (!role) return { ok: false, error: "invalid_token" };
  const { data: answers, error } = await db
    .from("entredos_room_answers").select("role, answer, submitted_at")
    .eq("room_code", room.code).eq("question_index", room.question_index);
  if (error) throw error;
  const mine = (answers || []).find((a: any) => a.role === role);
  const partnerRole = role === "host" ? "guest" : "host";
  const partner = (answers || []).find((a: any) => a.role === partnerRole);
  const hostAnswer = (answers || []).find((a: any) => a.role === "host");
  const guestAnswer = (answers || []).find((a: any) => a.role === "guest");
  const bothAnswered = Boolean(hostAnswer && guestAnswer);
  return {
    ok: true, role, room: roomPublic(room), my_answer: mine?.answer ?? "",
    my_submitted: Boolean(mine), partner_submitted: Boolean(partner),
    both_answered: bothAnswered,
    answers: bothAnswered ? {
      host: hostAnswer.answer, guest: guestAnswer.answer,
      host_name: room.host_name, guest_name: room.guest_name,
    } : null,
  };
}
function normalizeError(message: string) {
  const common: Record<string, string> = {
    room_not_found: "No existe ninguna sala con ese código.",
    room_expired: "Esta sala ha caducado. Cread una nueva.",
    invalid_token: "La sesión de esta sala ya no es válida. Volved a entrar con el código.",
    room_full: "Esta sala ya tiene dos participantes.",
    partner_not_ready: "Esperad a que la otra persona entre en la sala.",
    answers_pending: "Los dos tenéis que responder antes de continuar.",
    question_changed: "La pregunta ya ha cambiado. Se actualizará ahora.",
    rate_limited: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
    answer_already_submitted: "Ya has enviado una respuesta para esta ronda.",
  };
  return common[message] || "No se ha podido completar la acción. Inténtalo de nuevo.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405);
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) return reply({ ok: false, error: "payload_too_large" }, 413);

  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply({ ok: false, error: "invalid_body" }, 400);
    }
    const action = typeof body.action === "string" ? body.action : "";
    if (action === "create") {
      if (!(await enforceRateLimit(req, "create"))) {
        return reply({ ok: false, error: "rate_limited", message: normalizeError("rate_limited") }, 429);
      }
      const topic = typeof body.topic === "string" ? body.topic : "all";
      if (!TOPICS.has(topic)) return reply({ ok: false, error: "invalid_topic" }, 400);
      const gameMode = typeof body.game_mode === "string" ? body.game_mode : "questions";
      if (!GAME_MODES.has(gameMode)) return reply({ ok: false, error: "invalid_game_mode" }, 400);
      const intensity = typeof body.intensity === "string" ? body.intensity : "romantico";
      if (!["suave", "romantico", "profundo", "atrevido"].includes(intensity)) {
        return reply({ ok: false, error: "invalid_intensity" }, 400);
      }
      const requestedLimit = Number(body.question_limit ?? 10);
      if (![5, 10, 15, 20].includes(requestedLimit)) {
        return reply({ ok: false, error: "invalid_question_limit" }, 400);
      }
      const hostToken = crypto.randomUUID();
      const hostName = cleanName(body.name, "Persona 1");
      let inserted: Record<string, any> | null = null;
      for (let tries = 0; tries < 6 && !inserted; tries++) {
        const code = newRoomCode();
        const { data, error } = await db.from("entredos_rooms").insert({
          code, topic, game_mode: gameMode, intensity, question_limit: requestedLimit,
          host_token: hostToken, host_name: hostName, status: "waiting",
        }).select("*").maybeSingle();
        if (!error && data) inserted = data;
        else if (error?.code !== "23505") throw error;
      }
      if (!inserted) return reply({ ok: false, error: "could_not_create_room" }, 500);
      return reply({ ok: true, role: "host", token: hostToken, room: roomPublic(inserted) });
    }

    const code = cleanCode(body.code);
    const token = cleanToken(body.token);
    if (!code || code.length !== 6) return reply({ ok: false, error: "invalid_code" }, 400);

    if (action === "join") {
      if (!(await enforceRateLimit(req, "join"))) {
        return reply({ ok: false, error: "rate_limited", message: normalizeError("rate_limited") }, 429);
      }
      if (!(await enforceRateLimit(req, "join_code", code))) {
        return reply({ ok: false, error: "rate_limited", message: normalizeError("rate_limited") }, 429);
      }
      const found = await fetchRoom(code);
      if (!found.room) return reply({ ok: false, error: found.error, message: normalizeError(found.error || "") }, 404);
      if (found.room.guest_token) return reply({ ok: false, error: "room_full", message: normalizeError("room_full") }, 409);
      const guestToken = crypto.randomUUID();
      const guestName = cleanName(body.name, "Persona 2");
      const { data, error } = await db.from("entredos_rooms")
        .update({ guest_token: guestToken, guest_name: guestName, status: "playing" })
        .eq("code", code).is("guest_token", null).select("*").maybeSingle();
      if (error) throw error;
      if (!data) return reply({ ok: false, error: "room_full", message: normalizeError("room_full") }, 409);
      return reply({ ...(await statePayload(data, guestToken)), token: guestToken });
    }

    if (!token) return reply({ ok: false, error: "invalid_token", message: normalizeError("invalid_token") }, 401);
    const found = await fetchRoom(code);
    if (!found.room) return reply({ ok: false, error: found.error, message: normalizeError(found.error || "") }, 404);
    const room = found.room;
    const role = roleFor(room, token);
    if (!role) return reply({ ok: false, error: "invalid_token", message: normalizeError("invalid_token") }, 401);

    if (action === "state") return reply(await statePayload(room, token));

    if (action === "answer") {
      if (room.status !== "playing" || !room.guest_token) {
        return reply({ ok: false, error: "partner_not_ready", message: normalizeError("partner_not_ready") }, 409);
      }
      const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, 600) : "";
      if (!answer) return reply({ ok: false, error: "empty_answer", message: "Escribe tu respuesta antes de enviarla." }, 400);
      const { error } = await db.from("entredos_room_answers").insert({
        room_code: code, question_index: room.question_index, role, answer,
      });
      if (error?.code === "23505") {
        return reply({ ok: false, error: "answer_already_submitted", message: normalizeError("answer_already_submitted") }, 409);
      }
      if (error) throw error;
      const refreshed = await fetchRoom(code);
      if (!refreshed.room) return reply({ ok: false, error: refreshed.error }, 404);
      return reply(await statePayload(refreshed.room, token));
    }

    if (action === "next") {
      const { data, error } = await db.rpc("entredos_advance_room", {
        p_code: code, p_token: token, p_expected_index: room.question_index,
      });
      if (error) throw error;
      if (!data?.ok) {
        const reason = data?.error || "could_not_advance";
        return reply({ ok: false, error: reason, message: normalizeError(reason) }, 409);
      }
      const refreshed = await fetchRoom(code);
      if (!refreshed.room) return reply({ ok: false, error: refreshed.error }, 404);
      return reply(await statePayload(refreshed.room, token));
    }

    if (action === "finish") {
      const { error } = await db.from("entredos_rooms").update({ status: "finished" })
        .eq("code", code).in("status", ["waiting", "playing"]);
      if (error) throw error;
      const refreshed = await fetchRoom(code);
      if (!refreshed.room) return reply({ ok: false, error: refreshed.error }, 404);
      return reply(await statePayload(refreshed.room, token));
    }

    return reply({ ok: false, error: "unknown_action" }, 400);
  } catch (err) {
    console.error("entredos-room error", err);
    return reply({ ok: false, error: "server_error", message: "El servidor ha tenido un problema. Prueba otra vez en unos segundos." }, 500);
  }
});
