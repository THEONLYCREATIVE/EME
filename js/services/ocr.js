/**
 * js/services/ocr.js — Photo → field extraction.
 * UPGRADE HOOK: change OCR_CONFIG.provider to 'azure'|'google'|'tesseract'
 * See README.md for full setup instructions for each provider.
 */
const OCR_CONFIG = {
  provider:'demo',
  azure:{ endpoint:'https://YOUR_RESOURCE.cognitiveservices.azure.com', key:'YOUR_AZURE_KEY' },
  google:{ apiKey:'YOUR_GOOGLE_API_KEY' },
};
export async function parseImage(imageFile) {
  switch(OCR_CONFIG.provider){
    case 'azure':     return parseWithAzure(imageFile);
    case 'google':    return parseWithGoogle(imageFile);
    case 'tesseract': return parseWithTesseract(imageFile);
    default:          return simulatedOcr();
  }
}
async function simulatedOcr() {
  await delay(1400);
  const raw=`Total Sales: 19,774\nTransactions: 211\nNo7 Sales: 3,260\nNo7 TRN: 48\nItems Sold: 394\nSFA: 72.3%\nAURA: 31`;
  return{ rawText:raw, provider:'demo', fields:extractFields(raw) };
}
async function parseWithAzure(blob) {
  const {endpoint,key}=OCR_CONFIG.azure;
  const r=await fetch(`${endpoint}/vision/v3.2/read/analyze`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':key,'Content-Type':'application/octet-stream'},body:blob});
  if(!r.ok) throw new Error(`Azure ${r.status}`);
  const opUrl=r.headers.get('Operation-Location');
  let result; for(let i=0;i<10;i++){await delay(1000);const p=await(await fetch(opUrl,{headers:{'Ocp-Apim-Subscription-Key':key}})).json();if(p.status==='succeeded'){result=p;break;}}
  if(!result) throw new Error('Azure OCR timeout');
  const raw=result.analyzeResult.readResults.flatMap(p=>p.lines).map(l=>l.text).join('\n');
  return{rawText:raw,provider:'azure',fields:extractFields(raw)};
}
async function parseWithGoogle(blob) {
  const b64=await blobToBase64(blob);
  const r=await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${OCR_CONFIG.google.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:[{image:{content:b64},features:[{type:'TEXT_DETECTION'}]}]})});
  const d=await r.json(); const raw=d.responses?.[0]?.fullTextAnnotation?.text||'';
  return{rawText:raw,provider:'google',fields:extractFields(raw)};
}
async function parseWithTesseract(blob) {
  if(!window.Tesseract) throw new Error('Tesseract.js not loaded. Add CDN script.');
  const{data}=await Tesseract.recognize(blob,'eng');
  return{rawText:data.text,provider:'tesseract',fields:extractFields(data.text)};
}
function extractFields(text) {
  const P=[
    {key:'sales',  label:'Total Sales (AED)', re:/(?:total\s+)?sales[:\s]+([0-9,]+)/i},
    {key:'trn',    label:'TRN',               re:/(?:trn|transactions?)[:\s]+([0-9,]+)/i},
    {key:'no7',    label:'No7 Sales (AED)',    re:/no7?\s+sales?[:\s]+([0-9,]+)/i},
    {key:'no7trn', label:'No7 TRN',            re:/no7?\s+trn[:\s]+([0-9,]+)/i},
    {key:'items',  label:'Items Sold',         re:/items?\s+sold?[:\s]+([0-9,]+)/i},
    {key:'sfa',    label:'SFA %',              re:/sfa[:\s]+([0-9.]+)/i},
    {key:'aura',   label:'AURA Signups',       re:/aura[:\s]+([0-9]+)/i},
  ];
  return P.map(p=>{ const m=text.match(p.re); if(!m) return null; const v=parseFloat(m[1].replace(/,/g,'')); if(isNaN(v)) return null; return{key:p.key,label:p.label,value:v.toLocaleString('en-AE'),rawValue:v,confidence:0.88+Math.random()*0.1}; }).filter(Boolean);
}
function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }
function blobToBase64(blob){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(blob); }); }
