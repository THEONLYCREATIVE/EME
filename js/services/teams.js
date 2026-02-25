/**
 * js/services/teams.js — Microsoft Teams integration stubs.
 * UPGRADE HOOK: See README.md for full Entra ID OAuth + Graph API setup,
 * voice transcription with Azure Speech / Whisper, and meeting notes pipeline.
 */
export const TEAMS_CONFIG = { clientId:'YOUR_ENTRA_CLIENT_ID', tenantId:'YOUR_TENANT_ID' };
export async function teamsLogin() { window.open('https://teams.microsoft.com','_blank'); return{ok:false,message:'Teams OAuth not configured. See js/services/teams.js'}; }
let mediaRecorder=null, audioChunks=[];
export const voice = {
  isRecording:false,
  async startRecording(){ const s=await navigator.mediaDevices.getUserMedia({audio:true}); audioChunks=[]; mediaRecorder=new MediaRecorder(s); mediaRecorder.ondataavailable=e=>audioChunks.push(e.data); mediaRecorder.start(); this.isRecording=true; },
  async stopAndTranscribe(){ if(!mediaRecorder||!this.isRecording) return null; this.isRecording=false; return new Promise(res=>{ mediaRecorder.onstop=async()=>{ const blob=new Blob(audioChunks,{type:'audio/webm'}); mediaRecorder.stream.getTracks().forEach(t=>t.stop()); res({text:'[Voice transcription not configured. See js/services/teams.js]',blob}); }; mediaRecorder.stop(); }); },
};
export function saveStickyNote({text,tag='meeting',date=new Date().toISOString()}){const notes=JSON.parse(localStorage.getItem('n7__sticky_notes')||'[]');notes.unshift({id:Date.now(),text,tag,date});localStorage.setItem('n7__sticky_notes',JSON.stringify(notes));return notes[0];}
export function getStickyNotes(){return JSON.parse(localStorage.getItem('n7__sticky_notes')||'[]');}
