/* v1: read-only analytics; the approved storage key, save and export are untouched. */
(function(){'use strict';
const KEY='vedi-vibe-daily-preview-v1',q=id=>document.getElementById(id);
const all={morning:['massage','noPhoneAM','joints','curtains','hygiene','oilWater','breathAM','tapping','contrast','cocktail'],food:['breakfast','lunch','dinner','mineral'],move:['walk'],evening:['dim','noWork','noPhonePM','leftBreath','bed23']};
const week=['strength','kundalini','chakra'];
let range=7;
function ymd(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const asDate=s=>new Date(s+'T12:00:00');
function shift(s,n){let d=asDate(s);d.setDate(d.getDate()+n);return ymd(d)}
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!Number.isNaN(asDate(s).getTime());
const short=s=>asDate(s).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
const long=s=>asDate(s).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
const valid=v=>Number.isInteger(v)&&v>=1&&v<=5?v:null;
const avg=nums=>nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null;
const form=x=>x===null?'—':x.toFixed(1).replace('.',',');
const html=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function records(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v?.records&&typeof v.records==='object'&&!Array.isArray(v.records)?v.records:{}}catch{return{}}}
const nums=(rows,key)=>rows.map(x=>valid(x.rec.scores?.[key])).filter(x=>x!==null);
function dataset(){const end=validDate(q('selectedDate').value)?q('selectedDate').value:ymd(new Date()),start=shift(end,1-range),db=records();return{db,end,start,rows:Array.from({length:range},(_,i)=>{const stamp=shift(start,i);return{stamp,rec:db[stamp]||{}}})}}
function summary(rows){
 const group=[['Энергия',nums(rows,'morningEnergy')],['Тревога',nums(rows,'anxiety')],['Опора',nums(rows,'support')]];
 const best=rows.filter(x=>valid(x.rec.scores?.morningEnergy)!==null).sort((a,b)=>b.rec.scores.morningEnergy-a.rec.scores.morningEnergy||b.stamp.localeCompare(a.stamp))[0];
 const entries=group.map(([name,data])=>[name,form(avg(data)),data.length+' оценок']);entries.push(['Пик энергии',best?short(best.stamp):'—',best?best.rec.scores.morningEnergy+'/5':'Нет оценок']);
 q('aSummary').innerHTML=entries.map(([n,v,foot])=>`<article><span>${html(n)}</span><strong>${html(v)}</strong><small>${html(foot)}</small></article>`).join('');
}
function chart(rows){
 const colors=[['morningEnergy','#9C5348','Энергия'],['anxiety','#D7A095','Тревога'],['support','#849B7D','Опора']];
 if(colors.every(([k])=>!nums(rows,k).length)){q('aChart').innerHTML='<div class="a-empty">Пока нет оценок состояния за этот период. График появится, когда ты заполнишь шкалы.</div>';q('aChart').setAttribute('aria-label','Нет оценок за период');return;}
 const width=780,height=270,l=42,r=20,t=17,b=42,w=width-l-r,h=height-t-b;
 const x=i=>l+(rows.length===1?w/2:w*i/(rows.length-1));const y=v=>t+(5-v)/4*h;
 let out='';for(let i=1;i<=5;i++){out+=`<line x1="${l}" y1="${y(i)}" x2="${width-r}" y2="${y(i)}" stroke="#E7DED6" stroke-dasharray="4 6"/><text x="${l-17}" y="${y(i)+5}" text-anchor="end" fill="#776C69" font-size="15">${i}</text>`;}
 for(const i of [...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])]){out+=`<text x="${x(i)}" y="${height-8}" font-size="13" text-anchor="${i===0?'start':i===rows.length-1?'end':'middle'}" fill="#776C69">${html(short(rows[i].stamp))}</text>`;}
 for(const [key,color,label] of colors){let line=[];function flush(){if(line.length>1)out+=`<polyline fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${line.join(' ')}"/>`;line=[]}
 rows.forEach((entry,i)=>{const v=valid(entry.rec.scores?.[key]);if(v===null){flush()}else{line.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`)}});flush();
 rows.forEach((entry,i)=>{const v=valid(entry.rec.scores?.[key]);if(v!==null)out+=`<circle cx="${x(i)}" cy="${y(v)}" r="5.5" fill="${color}"><title>${html(label)} · ${html(long(entry.stamp))}: ${v}/5</title></circle>`});
 }
 q('aChart').innerHTML=`<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">${out}</svg>`;
 q('aChart').setAttribute('aria-label',`Значения энергии ${nums(rows,'morningEnergy').length} дней, тревоги ${nums(rows,'anxiety').length}, опоры ${nums(rows,'support').length}. Неуказанные дни отсутствуют на графике.`);
}
function extra(rows){q('aExtra').innerHTML=[['sleepQuality','Качество сна'],['tension','Напряжение'],['water','Питьевой режим']].map(([key,title])=>{const x=nums(rows,key);return `<div>${html(title)}<strong>${form(avg(x))} / 5</strong><small>Среднее · ${x.length} оценок</small></div>`}).join('')}
function practices(rows,end,db){
 const names=[['morning','Утро'],['evening','Вечер'],['move','Ходьба'],['food','Питание']];
 q('aPractices').innerHTML=names.map(([key,name])=>{const tasks=all[key];const observed=rows.filter(x=>tasks.some(id=>Object.prototype.hasOwnProperty.call(x.rec.checks||{},id)));
 const total=observed.length*tasks.length,done=observed.reduce((sum,x)=>sum+tasks.filter(id=>x.rec.checks?.[id]===true).length,0),p=total?Math.round(100*done/total):0;
 return `<div class="a-row"><div><strong>${html(name)}</strong><small>${observed.length} дней с отметками</small></div><div class="a-progress" role="progressbar" aria-label="${html(name)}: ${done} из ${total}" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div><div class="a-value">${total?p+'%':'—'}<small>${total?`${done}/${total}`:'Нет данных'}</small></div></div>`}).join('');
 const d=asDate(end);d.setDate(d.getDate()-(d.getDay()+6)%7);const monday=ymd(d);
 const counts=week.map(k=>Array.from({length:7},(_,i)=>{const stamp=shift(monday,i);return stamp<=end&&db[stamp]?.checks?.[k]===true?1:0}).reduce((a,b)=>a+b,0));
 q('aWeekly').innerHTML=`<div class="a-weekly"><strong>Недельные практики · ${html(short(monday))}–${html(short(shift(monday,6)))}</strong><div>Мышечная нагрузка — ${counts[0]} раз (ориентир 2–3)</div><div>Кундалини — ${counts[1]} раз (ориентир 1)</div><div>Чакровое дыхание — ${counts[2]} раз (ориентир 1)</div></div>`;
}
function insight(rows,title,metric,fn1,fn2,label1,label2){const a=[],b=[];for(const {rec} of rows){const v=valid(rec.scores?.[metric]);if(v===null)continue;if(fn1(rec))a.push(v);else if(fn2(rec))b.push(v)}if(a.length<3||b.length<3)return null;const first=avg(a),second=avg(b);if(Math.abs(first-second)<.4)return null;return {title,text:`${label1}: ${form(first)}/5; ${label2}: ${form(second)}/5.`,days:`Сравнено ${a.length} и ${b.length} дней. Совпадение, не причина.`}}
function insights(rows){
 const list=[
 insight(rows,'Сон и энергия','morningEnergy',r=>valid(r.scores?.sleepQuality)>=4,r=>{const n=valid(r.scores?.sleepQuality);return n!==null&&n<=3},'При качестве сна 4–5','При качестве сна 1–3'),
 insight(rows,'Прогулки и напряжение','tension',r=>r.checks?.walk===true,r=>r.checks?.walk===false,'Когда прогулка отмечена','Когда явно не выполнена'),
 insight(rows,'Утренние практики и опора','support',r=>all.morning.filter(id=>r.checks?.[id]===true).length>=7,r=>all.morning.some(id=>Object.hasOwn(r.checks||{},id))&&all.morning.filter(id=>r.checks?.[id]===true).length<=3,'7+ выполненных практик','0–3 с отметками')
 ].filter(Boolean);
 q('aInsights').innerHTML=list.length?list.map(x=>`<div class="a-insight"><span aria-hidden="true">↗</span><div><strong>${html(x.title)}</strong><br>${html(x.text)}<small>${html(x.days)}</small></div></div>`).join(''):'<div class="a-empty">Пока мало сопоставимых записей. Здесь появятся наблюдения по сну, прогулкам, энергии и опоре — только на основе твоих данных.</div>';
}
function ascetic(end,db){const stamps=Object.keys(db).filter(s=>validDate(s)&&s>='2026-10-17'&&s<='2026-12-31'&&s<=end),extra=stamps.filter(s=>db[s]?.ascesis?.mantra===true).length,total=35+extra,pct=Math.min(100,Math.round(100*total/45));const tasks=[['learn','Учиться'],['presence','Проявленность'],['sales','Продажа']];const allDone=stamps.filter(s=>tasks.every(([key])=>db[s]?.ascesis?.[key]===true)).length;
 q('aAscesis').innerHTML=`<div class="a-ring" style="--a-progress:${pct}%"><span>${pct}%<small>ЛЯМ · цель 45</small></span></div><div class="a-asc-row">Мантра ЛЯМ<strong>${total}/45</strong></div>${tasks.map(([key,label])=>`<div class="a-asc-row">${html(label)}<strong>${stamps.filter(s=>db[s]?.ascesis?.[key]===true).length} дн.</strong></div>`).join('')}<div class="a-asc-row">Все 3 направления<strong>${allDone} дн.</strong></div><p class="a-micro">Включены 35 исторических выполнений мантры без восстановленных дат. Новые отметки считаются с 17 октября.</p>`;
}
function render(){const {rows,db,start,end}=dataset();q('aPeriodLabel').textContent=`${long(start)} — ${long(end)} · ${range} дней. Учитываются только записи в этом браузере.`;summary(rows);chart(rows);extra(rows);practices(rows,end,db);insights(rows);ascetic(end,db);}
function init(){if(!q('aSummary'))return;document.querySelectorAll('[data-analytics-range]').forEach(btn=>btn.addEventListener('click',()=>{range=Number(btn.dataset.analyticsRange);document.querySelectorAll('[data-analytics-range]').forEach(b=>{const yes=b===btn;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes))});render()}));
 document.querySelectorAll('[data-page="analytics"]').forEach(btn=>btn.addEventListener('click',render));['prevDay','nextDay','todayBtn'].forEach(id=>q(id).addEventListener('click',render));q('selectedDate').addEventListener('change',render);render();}
init();
})();
