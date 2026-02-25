/**
 * OCR Service — No7 Analytics
 *
 * Currently: Simulated parsing (extracts numbers from filenames/metadata).
 * Structured so any real OCR provider can be plugged in by changing
 * only this file — components call parse() and get the same result shape.
 *
 * ═══════════════════════════════════════════════════════════════
 * UPGRADE HOOK: Real OCR Provider
 * ───────────────────────────────────────────────────────────────
 *
 * Option A — Azure Computer Vision (Read API):
 *   async function parseWithAzure(imageBlob) {
 *     const endpoint = 'https://YOUR_REGION.api.cognitive.microsoft.com'
 *     const key = 'YOUR_KEY'  // move to backend proxy!
 *
 *     const analyzeRes = await fetch(`${endpoint}/vision/v3.2/read/analyze`, {
 *       method: 'POST',
 *       headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/octet-stream' },
 *       body: imageBlob,
 *     })
 *     const opUrl = analyzeRes.headers.get('Operation-Location')
 *
 *     // Poll for results
 *     let result
 *     do {
 *       await sleep(1000)
 *       result = await fetch(opUrl, { headers: { 'Ocp-Apim-Subscription-Key': key } }).then(r=>r.json())
 *     } while (result.status !== 'succeeded')
 *
 *     const text = result.analyzeResult.readResults.flatMap(p=>p.lines).map(l=>l.text).join('\n')
 *     return extractFields(text)
 *   }
 *
 * Option B — Google Cloud Vision:
 *   Send base64 image to: https://vision.googleapis.com/v1/images:annotate
 *   Use TEXT_DETECTION feature, parse response.textAnnotations[0].description
 *
 * Option C — Tesseract.js (fully client-side, slower):
 *   import Tesseract from 'https://esm.sh/tesseract.js'
 *   const { data } = await Tesseract.recognize(imageBlob, 'eng')
 *   return extractFields(data.text)
 *
 * Option D — Backend proxy (recommended for security):
 *   Send image to your own server endpoint that calls Vision API.
 *   Keeps API keys off the client.
 *
 * ⚠️  SECURITY: Never embed Azure/Google API keys in client-side JS.
 *     Always route through a backend proxy.
 *     See docs/upgrade-hooks/OCR_UPGRADE.md
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Parse an image blob and extract sales fields.
 *
 * @param {Blob} imageBlob
 * @returns {Promise<OcrResult>}
 *
 * OcrResult: {
 *   ok: boolean,
 *   fields: { sales, trn, no7, no7trn, sfa, items, aura }  ← all optional
 *   confidence: number  (0–1)
 *   rawText: string
 *   provider: string
 * }
 */
export async function parse(imageBlob, settings = {}) {
  if (!settings.features?.ocr) {
    return { ok: false, fields: {}, confidence: 0, rawText: '', provider: 'disabled' };
  }

  // ── UPGRADE HOOK: Replace with real provider call ────────────
  // return await parseWithAzure(imageBlob)
  // ── END HOOK ─────────────────────────────────────────────────

  return await simulatedParse(imageBlob);
}

// ── SIMULATED PARSE ────────────────────────────────────────────
// Generates plausible-looking OCR results for demo/testing.
// Remove this once a real OCR provider is connected.

async function simulatedParse(imageBlob) {
  // Simulate network delay
  await sleep(1000 + Math.random() * 600);

  // Simulated extracted fields (demo values)
  const fields = {
    sales:  randomIn(15000, 28000),
    trn:    randomIn(150, 280),
    no7:    randomIn(2200, 5000),
    no7trn: randomIn(30, 80),
    sfa:    randomIn(55, 82),
    items:  randomIn(280, 480),
    aura:   randomIn(10, 45),
  };

  // Simulate variable confidence per field
  const fieldMeta = Object.fromEntries(
    Object.keys(fields).map(k => [k, { confidence: 0.75 + Math.random() * 0.22 }])
  );

  return {
    ok:         true,
    fields,
    fieldMeta,
    confidence: 0.85,
    rawText:    `[Simulated OCR text — connect a real provider for actual parsing]`,
    provider:   'simulated',
  };
}

// ── FIELD EXTRACTOR ────────────────────────────────────────────
// When you have raw OCR text, this tries to extract known fields.
// Use with real providers in Option A/B/C above.

export function extractFields(rawText) {
  const text = rawText.toUpperCase();
  const fields = {};

  const patterns = {
    sales:  [/SALES[:\s]+([0-9,]+)/,  /TOTAL[:\s]+AED[:\s]+([0-9,]+)/],
    trn:    [/TRN[:\s]+([0-9]+)/,     /TRANSACTIONS[:\s]+([0-9]+)/],
    no7:    [/NO\s*7[:\s]+([0-9,]+)/, /N7[:\s]+([0-9,]+)/],
    sfa:    [/SFA[:\s]+([0-9.]+)/],
    items:  [/ITEMS[:\s]+([0-9]+)/,   /QTY[:\s]+([0-9]+)/],
    aura:   [/AURA[:\s]+([0-9]+)/,    /SIGNUPS[:\s]+([0-9]+)/],
  };

  for (const [field, regexes] of Object.entries(patterns)) {
    for (const rx of regexes) {
      const m = text.match(rx);
      if (m) {
        fields[field] = parseFloat(m[1].replace(/,/g, ''));
        break;
      }
    }
  }

  return fields;
}

// ── HELPERS ────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function randomIn(min, max) { return Math.round(min + Math.random() * (max - min)); }
