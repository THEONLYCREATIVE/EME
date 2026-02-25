# OCR Upgrade Guide

Upgrade the photo-parsing feature from simulated to real OCR.

## File to edit
`src/services/ocr.js` — replace the `simulatedParse()` call inside `parse()`.

## Option A: Azure Computer Vision (Recommended)
Best accuracy for receipt/screen text. ~$1.50/1000 images.

### Setup
1. Create Azure account → Cognitive Services → Computer Vision
2. Note your **endpoint** + **subscription key**
3. Build a simple proxy endpoint (see security note below)

### Code change in ocr.js
```js
// In the parse() function, replace:
return await simulatedParse(imageBlob)

// With:
return await parseWithAzure(imageBlob)

// Add this function:
async function parseWithAzure(imageBlob) {
  // ⚠️ Route through your backend — never put keys in client JS
  const formData = new FormData()
  formData.append('image', imageBlob)
  
  const res = await fetch('/api/ocr', { method: 'POST', body: formData })
  const { text } = await res.json()
  const fields = extractFields(text)
  
  return {
    ok: true,
    fields,
    confidence: 0.88,
    rawText: text,
    provider: 'azure',
  }
}
```

### Backend proxy (Node.js / Vercel)
```js
// api/ocr.js (Vercel serverless)
export default async function handler(req, res) {
  const buffer = await req.arrayBuffer()
  
  const analyzeRes = await fetch(
    `${process.env.AZURE_VISION_ENDPOINT}/vision/v3.2/read/analyze`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    }
  )
  
  const opUrl = analyzeRes.headers.get('Operation-Location')
  let result
  do {
    await new Promise(r => setTimeout(r, 1000))
    result = await fetch(opUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_VISION_KEY }
    }).then(r => r.json())
  } while (result.status !== 'succeeded')
  
  const text = result.analyzeResult.readResults
    .flatMap(p => p.lines)
    .map(l => l.text)
    .join('\n')
  
  res.json({ text })
}
```

## Option B: Google Cloud Vision
Similar setup — send to `vision.googleapis.com/v1/images:annotate`.
Use `TEXT_DETECTION` feature type.

## Option C: Tesseract.js (Fully client-side)
No API costs, no backend needed. ~3-5 seconds per image.

```js
// In ocr.js, add import:
const Tesseract = await import('https://esm.sh/tesseract.js')

async function parseWithTesseract(imageBlob) {
  const url = URL.createObjectURL(imageBlob)
  const { data } = await Tesseract.recognize(url, 'eng', {
    logger: m => console.log('[Tesseract]', m)
  })
  URL.revokeObjectURL(url)
  return {
    ok: true,
    fields: extractFields(data.text),
    confidence: data.confidence / 100,
    rawText: data.text,
    provider: 'tesseract',
  }
}
```

## Security
⚠️ **Never** embed Azure/Google API keys in client-side JavaScript.
Use a serverless proxy (Vercel/Netlify functions) to keep keys server-side.
