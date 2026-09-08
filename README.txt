MehrAI — Gemini Live (O‘zbekcha ovoz + realistik avatar + lip-sync)
=================================================================

NIMA BOR:
- Gemini Live API orqali jonli AI suhbat
- O‘zbek tilida audio javob
- Mikrofon orqali real-time gapirish
- Gemini audio javobining transkripsiyasi chatda ko‘rinadi
- Realistik avatar
- Ovoz amplitudasiga mos lab animatsiyasi
- 5 xil Gemini ovozini UI orqali tanlash
- API kaliti brauzerga chiqmaydi: server ichidagi .env da turadi
- Suhbat konteksti Live sessiya ichida saqlanadi

1) TALABLAR
- Windows 10/11
- Node.js 18+ (tavsiya: 20 yoki yangi)
- Google AI Studio Gemini API key
- Chrome / Edge

2) API KEY OLISH
- https://aistudio.google.com/app/apikey manziliga kiring
- Create API key bosing
- Kalitni nusxalang

3) .ENV YARATISH
.env.example faylidan nusxa oling va nomini .env qiling.
Ichida:

GEMINI_API_KEY=SIZNING_KALITINGIZ
GEMINI_LIVE_MODEL=gemini-3.1-flash-live-preview
GEMINI_VOICE=Achernar
PORT=3000

4) O‘RNATISH
Loyiha papkasida PowerShell oching:

npm install

5) ISHGA TUSHIRISH

npm start

6) BRAUZER

http://localhost:3000

7) MIKROFON
Brauzer mikrofon ruxsatini so‘rasa Allow / Разрешить bosing.
Mikrofon tugmasini bosing va o‘zbekcha gapiring. Tugmani yana bossangiz oqim tugaydi va MehrAI javob beradi.

OVOZLAR
- Achernar — Soft
- Aoede — Breezy
- Leda — Youthful
- Vindemiatrix — Gentle
- Sulafat — Warm

MUHIM
- Google AI Pro/Gemini ilova obunasi va Developer API billing alohida tizimlar.
- API free tier mavjud bo‘lishi mumkin, lekin limitlar/model mavjudligi Google tomonidan o‘zgarishi mumkin.
- API kalitni hech kimga yubormang va GitHub’ga .env faylini yuklamang.
