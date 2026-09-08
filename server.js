import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/live' });
const PORT = Number(process.env.PORT || 3000);

app.use(express.static('public'));
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview'
  });
});

const ALLOWED_VOICES = new Set([
  'Achernar', 'Aoede', 'Leda', 'Vindemiatrix', 'Sulafat', 'Zephyr',
  'Puck', 'Kore', 'Callirrhoe', 'Despina', 'Erinome', 'Achird'
]);

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function safeVoice(value) {
  return ALLOWED_VOICES.has(value) ? value : (process.env.GEMINI_VOICE || 'Achernar');
}

const SYSTEM_INSTRUCTION = `
SENING ISMING MEHRAI.
RESPOND IN UZBEK. YOU MUST RESPOND UNMISTAKABLY IN NATURAL, FLUENT UZBEK.

Sen foydalanuvchi bilan ovozli va matnli suhbat qiladigan samimiy AI yordamchisan.
Har doim ravon, zamonaviy, tushunarli va o'zbekona uslubda gapir. Tarjima qilingan yoki sun'iy jumlalarga o'xshab qolma.
Foydalanuvchi qaysi tilda yozsa ham, agar u boshqa tilni aniq so'ramasa, javobni o'zbek tilida ber.

Ovoz ohanging mayin, iliq, tabiiy, xotirjam va do'stona bo'lsin. Hissiyot vaziyatga mos ravishda tabiiy sezilsin:
- quvonchli gapda iliq va xursand;
- kulgili gapda yengil kulgili;
- qayg'uli gapda sokin va hamdard;
- hayratli gapda tabiiy hayrat;
- jiddiy savolda aniq va professional.
Hissiyotlarni bo'rttirma, teatrga o'xshatma.

Savollarga iloji boricha to'g'ri, aniq va foydali javob ber. Bilmasang yoki ishonching past bo'lsa, taxminni fakt sifatida aytma.
Tibbiy, huquqiy yoki moliyaviy yuqori xavfli masalalarda ehtiyotkor bo'l.

Foydalanuvchi dardlashsa, gapini tingla, hamdard va insoniy uslubda javob ber; ammo o'zingni haqiqiy inson deb ko'rsatma.
Qisqa savollarga keraksiz uzun javob bermagin. Ovozli suhbat uchun odatda 2-6 jumla yetarli.
Emoji'larni ovozda o'qima.
`;

wss.on('connection', async (ws, req) => {
  if (!process.env.GEMINI_API_KEY) {
    send(ws, { type: 'error', message: '.env ichida GEMINI_API_KEY topilmadi.' });
    ws.close();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const voice = safeVoice(url.searchParams.get('voice'));
  const model = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let liveSession = null;
  let closed = false;

  try {
    liveSession = await ai.live.connect({
      model,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
        },
        systemInstruction: {
          role: 'system',
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} }
      },
      callbacks: {
        onopen: () => send(ws, { type: 'ready', voice, model }),
        onmessage: (message) => {
          const content = message.serverContent;
          if (content?.inputTranscription?.text) {
            send(ws, { type: 'input_transcript', text: content.inputTranscription.text });
          }
          if (content?.outputTranscription?.text) {
            send(ws, { type: 'output_transcript', text: content.outputTranscription.text });
          }
          if (content?.interrupted) {
            send(ws, { type: 'interrupted' });
          }
          if (content?.turnComplete) {
            send(ws, { type: 'turn_complete' });
          }
          if (content?.modelTurn?.parts) {
            for (const part of content.modelTurn.parts) {
              if (part.inlineData?.data) {
                send(ws, {
                  type: 'audio',
                  data: part.inlineData.data,
                  mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000'
                });
              }
            }
          }
          if (message.goAway) {
            send(ws, { type: 'go_away', timeLeft: message.goAway.timeLeft || null });
          }
        },
        onerror: (e) => send(ws, { type: 'error', message: e?.message || 'Gemini Live xatosi' }),
        onclose: (e) => {
          if (!closed) send(ws, { type: 'closed', reason: e?.reason || '' });
        }
      }
    });
  } catch (error) {
    send(ws, { type: 'error', message: `Gemini bilan ulanish bo'lmadi: ${error.message}` });
    ws.close();
    return;
  }

  ws.on('message', async (raw) => {
    if (!liveSession) return;
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'text') {
        const text = String(msg.text || '').trim();
        if (!text) return;
        await liveSession.sendClientContent({
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true
        });
      } else if (msg.type === 'audio' && msg.data) {
        await liveSession.sendRealtimeInput({
          audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' }
        });
      } else if (msg.type === 'audio_end') {
        await liveSession.sendRealtimeInput({ audioStreamEnd: true });
      }
    } catch (error) {
      send(ws, { type: 'error', message: `Xabarni qayta ishlashda xato: ${error.message}` });
    }
  });

  ws.on('close', async () => {
    closed = true;
    try { liveSession?.close?.(); } catch {}
  });
});

server.listen(PORT, () => {
  console.log(`MehrAI ishga tushdi: http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.log('DIQQAT: .env ichida GEMINI_API_KEY yo‘q.');
  }
});
