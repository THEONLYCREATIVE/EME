/** js/utils/calc.js — Pure KPI math. No DOM. Unit-testable. */
export function calcDayKPIs(e,ctx) {
  const {sales,trn,items,no7,aura}=e;
  const {dayBP,n7DayBP,kdRate,divAPercent}=ctx;
  const kd=kdRate||11.99, divA=(divAPercent||60)/100;
  const atv=safe(sales/trn), ipc=safe(items/trn);
  const no7Vat=no7!=null?no7*0.95:null, no7Pct=safe(no7/sales*100), auraPct=safe(aura/trn*100);
  const achPct=safe(sales/dayBP*100), gap=sales!=null&&dayBP!=null?sales-dayBP:null;
  const n7AchPct=safe(no7/n7DayBP*100);
  return{ sales,trn,items,no7,aura, atv,ipc,conv:ipc, no7Vat,no7Pct,auraPct, achPct,gap,n7AchPct,
    kdSales:safe(sales/kd), kdNo7:safe(no7/kd), kdAtv:safe(atv/kd),
    divAValue:sales!=null?sales*divA:null, divBValue:sales!=null?sales*(1-divA):null,
    divAPct:divA*100, divBPct:(1-divA)*100 };
}
export function calcWeekKPIs(entries,ctx) {
  const {weekBP,n7WeekBP}=ctx; const valid=entries.filter(Boolean);
  const wkSales=sum(valid,'sales'),wkNo7=sum(valid,'no7'),wkTrn=sum(valid,'trn'),wkItems=sum(valid,'items'),wkAura=sum(valid,'aura');
  const sfas=valid.filter(e=>e.sfa!=null).map(e=>e.sfa);
  const with$=valid.filter(e=>e.sales>0);
  const best=with$.reduce((a,b)=>b.sales>(a?.sales||0)?b:a,null);
  const worst=with$.reduce((a,b)=>b.sales<(a?.sales??Infinity)?b:a,null);
  return{ wkSales,wkNo7,wkTrn,wkItems,wkAura,
    wkAtv:safe(wkSales/wkTrn), wkIpc:safe(wkItems/wkTrn),
    wkNo7Pct:safe(wkNo7/wkSales*100), wkAuraPct:safe(wkAura/wkTrn*100),
    wkAchPct:safe(wkSales/weekBP*100), wkN7AchPct:safe(wkNo7/n7WeekBP*100),
    wkGap:weekBP!=null&&wkSales!=null?wkSales-weekBP:null,
    avgSfa:sfas.length?sfas.reduce((a,b)=>a+b,0)/sfas.length:null,
    bestDay:best?._day||null, bestSales:best?.sales||null,
    worstDay:worst?._day||null, worstSales:worst?.sales||null,
    daysEntered:with$.length };
}
export function calcForecast(entries,weekBP,total=7){
  const with$=entries.filter(e=>e?.sales>0); if(!with$.length) return null;
  const totalSales=sum(with$,'sales'), avg=totalSales/with$.length, proj=avg*total;
  return{ projected:proj, avgPerDay:avg, projectedPct:weekBP?(proj/weekBP)*100:null, daysIn:with$.length, daysLeft:total-with$.length, totalSoFar:totalSales };
}
function safe(n){ return isFinite(n)&&n!=null?n:null; }
function sum(arr,k){ return arr.reduce((a,e)=>a+(e?.[k]||0),0); }
export function achColor(pct){ if(pct==null) return 'var(--text-2)'; return pct>=100?'var(--mint-dark)':pct>=85?'var(--amber)':'var(--red)'; }
export function achBadgeClass(pct){ if(pct==null) return 'badge-blue'; return pct>=100?'badge-mint':pct>=85?'badge-amber':'badge-red'; }
export function forecastBadgeClass(pct){ if(pct==null) return ''; return pct>=100?'forecast-badge-good':pct>=85?'forecast-badge-warn':'forecast-badge-danger'; }
