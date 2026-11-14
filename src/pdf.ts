import{saveFile}from'./files';
import {jsPDF} from 'jspdf';
import {type Database,type Bird,today} from './data';
import {regular,bold} from './pdf-fonts';
import{getSettings}from'./settings';
import {roosterPaths} from './rooster-art';

const C={ivory:'#F7F8F2',green:'#284E3E',ink:'#304537',muted:'#78846F',line:'#E3E8DA',soft:'#EEF2E7',terra:'#AC7257',white:'#FFFFFF'};
const LEFT=16, WIDTH=178, BOTTOM=276;
const date=(value:string)=>value?new Date(value+'T12:00:00').toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'}):'';

/** The same vector paths used by the web placeholder, kept sharp at any PDF scale. */
export function drawRooster(pdf:jsPDF,x:number,y:number,w:number,h:number){
  const scale=Math.min(w/320,h/290),ox=x+(w-320*scale)/2,oy=y+(h-290*scale)/2;
  const tx=(n:number)=>ox+n*scale,ty=(n:number)=>oy+n*scale;
  pdf.setFillColor('#DBE2D2');pdf.ellipse(tx(170),ty(268),94*scale,10*scale,'F');
  for(const p of roosterPaths){
    const tokens=p.d.match(/[MCLZ]|-?\d*\.?\d+/g)||[];
    const ops:{op:string;c:number[]}[]=[];let i=0;
    while(i<tokens.length){const command=tokens[i++];if(command==='Z'){ops.push({op:'h',c:[]});continue}const count=command==='C'?6:2;const values=tokens.slice(i,i+count).map(Number);i+=count;ops.push({op:command==='M'?'m':command==='L'?'l':'c',c:values.map((n,j)=>j%2?ty(n):tx(n))})}
    pdf.path(ops);
    if(p.fill){pdf.setFillColor(p.fill);pdf.fill()}else if(p.stroke){pdf.setDrawColor(p.stroke);pdf.setLineWidth(Number(p.strokeWidth||1)*scale);pdf.setLineCap('round');pdf.stroke()}
  }
  pdf.setFillColor('#203F34');pdf.circle(tx(225),ty(77),4*scale,'F');
}

export function createBirdPDF(birds:Bird[],db:Database){
  if(!birds.length)throw Error('No hay fichas para exportar.');
  const cfg=getSettings(db);
  const pdf=new jsPDF({unit:'mm',format:'a4'});
  pdf.addFileToVFS('RG-Regular.ttf',regular);pdf.addFont('RG-Regular.ttf','RG','normal');pdf.addFileToVFS('RG-Bold.ttf',bold);pdf.addFont('RG-Bold.ttf','RG','bold');
  pdf.setProperties({title:'Registro Gallero · Fichas individuales',subject:'Identificación, genealogía y cuidados responsables',creator:'Registro Gallero'});
  let y=0,current:Bird=birds[0],first=true;
  const pageBirds:Bird[]=[];
  const text=(value:string,x:number,baseline:number,size=10,color=C.ink,bold=false)=>{pdf.setFont('RG',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(color);pdf.text(value,x,baseline)};
  const wrapped=(value:string,width:number,size=9)=>{pdf.setFont('RG','normal');pdf.setFontSize(size);return pdf.splitTextToSize(value,width) as string[]};
  function newPage(continuation=false){
    if(!first)pdf.addPage();first=false;pageBirds.push(current);
    pdf.setFillColor(C.ivory);pdf.rect(0,0,210,297,'F');
    pdf.setFillColor(C.green);pdf.roundedRect(LEFT,14,7,9,2,2,'F');
    pdf.setDrawColor('#D7DFCA');pdf.setLineWidth(.5);pdf.line(18,20,20,17);pdf.line(20,17,21,19);
    text('Registro Gallero',27,20.3,14,C.green,true);
    text('IDENTIFICACIÓN Y CUIDADO RESPONSABLE',27,25.5,6.2,C.muted);
    text(date(today()),169,19,8,C.muted);
    text(continuation?'CONTINUACIÓN':'FICHA INDIVIDUAL',161,24.5,6.5,C.terra,true);
    pdf.setDrawColor(C.line);pdf.setLineWidth(.25);pdf.line(LEFT,31,194,31);y=39;
    if(continuation){const lines=wrapped(`${current.name} · ${current.code}`,172,10);for(const line of lines){text(line,LEFT,y,10,C.green,true);y+=5}y+=6}
  }
  function ensure(height:number){if(y+height>BOTTOM)newPage(true)}
  function section(number:string,title:string){ensure(29);text(number,LEFT,y+3,8,C.terra,true);text(title,25,y+3,11,C.green,true);pdf.setDrawColor(C.line);pdf.line(25,y+6,194,y+6);y+=10}
  function fields(items:[string,string|undefined][],columns=3){
    const gap=3,w=(WIDTH-gap*(columns-1))/columns;
    for(let offset=0;offset<items.length;offset+=columns){const row=items.slice(offset,offset+columns);const blocks=row.map(([label,value])=>({label,lines:wrapped(value||'Sin datos registrados',w-8,8.7)}));const height=Math.max(16,...blocks.map(b=>10+b.lines.length*4.3));
      // Imported text can be arbitrarily long: split exceptionally tall cards across pages.
      if(height>190){for(const [label,value] of row)paragraph(label,value||'Sin datos registrados');continue}
      ensure(height+2);blocks.forEach((b,i)=>{const x=LEFT+i*(w+gap);pdf.setFillColor(C.white);pdf.setDrawColor(C.line);pdf.setLineWidth(.2);pdf.roundedRect(x,y,w,height,1.8,1.8,'FD');text(b.label.toLocaleUpperCase('es'),x+4,y+5.5,6.2,C.muted,true);b.lines.forEach((line,j)=>text(line,x+4,y+11+j*4.3,8.7))});y+=height+2;
    }y+=2;
  }
  function paragraph(label:string,value:string){const lines=wrapped(value,WIDTH-12,9);let index=0;while(index<lines.length){ensure(22);const max=Math.max(1,Math.floor((BOTTOM-y-13)/4.8)),part=lines.slice(index,index+max),height=12+part.length*4.8;pdf.setFillColor(C.white);pdf.setDrawColor(C.line);pdf.setLineWidth(.2);pdf.roundedRect(LEFT,y,WIDTH,height,2,2,'FD');if(label)text(label,LEFT+6,y+6.5,7,C.terra,true);part.forEach((line,j)=>text(line,LEFT+6,y+11+j*4.8,9));y+=height+4;index+=part.length;if(index<lines.length)newPage(true)}}
  function image(photo:string,x:number,top:number,w:number,h:number){try{const info=pdf.getImageProperties(photo),scale=Math.min(w/info.width,h/info.height);pdf.addImage(photo,info.fileType,x+(w-info.width*scale)/2,top+(h-info.height*scale)/2,info.width*scale,info.height*scale,undefined,'FAST');return true}catch{return false}}
  for(const b of birds){current=b;newPage();
    // Editorial identity card. Reserve enough space even for unusually long names or codes.
    const names=wrapped(b.name,113,22),codes=wrapped(b.code,113,9);
    const heroHeight=Math.max(51,16+names.length*8+codes.length*4.5+18);
    pdf.setFillColor(C.green);pdf.roundedRect(LEFT,y,WIDTH,heroHeight,3,3,'F');
    text('CADA REGISTRO, UNA HISTORIA',LEFT+7,y+9,6.5,'#BFCDB4',true);
    names.forEach((line,i)=>text(line,LEFT+7,y+20+i*8,22,'#F6F5E8',true));
    const codeY=y+23+names.length*8;codes.forEach((line,i)=>text(line,LEFT+7,codeY+i*4.5,9,'#D5DFCD'));
    const reviewY=codeY+codes.length*4.5+3;
    text(b.status,LEFT+7,reviewY,8.5,'#F1E7D2');text(`Última revisión: ${date(b.lastReview)||'Sin datos'}`,LEFT+7,reviewY+6,7,'#CAD5C2');
    const photoX=148,photoY=y+5,photoW=40,photoH=heroHeight-15;
    pdf.setFillColor(C.soft);pdf.roundedRect(photoX,photoY,photoW,photoH,2,2,'F');
    const hasPhoto=b.photos.length>0&&image(b.photos[0],photoX+2,photoY+2,photoW-4,photoH-4);
    if(!hasPhoto)drawRooster(pdf,photoX+1,photoY+1,photoW-2,photoH-2);
    text(hasPhoto?'FOTOGRAFÍA PRINCIPAL':'ILUSTRACIÓN DE REFERENCIA',photoX,photoY+photoH+4,5.2,'#D2DCC8');
    y+=heroHeight+9;
    if(b.demo){text('REGISTRO FICTICIO DE EJEMPLO',LEFT,y,7,C.terra,true);y+=8}
    section('01','Identificación');fields([[cfg.catalogs.breed.label,b.breed],[cfg.catalogs.color.label,b.color],['Marca',b.mark],['Nacimiento',date(b.birth)],['Edad aproximada',b.age],['Peso',b.weightKg?`${Number(b.weightKg).toLocaleString('es',{maximumFractionDigits:3})} kg`:'']]);
    section('02','Procedencia y criadero');fields([['Criadero actual',db.farms?.find(f=>f.id===b.farmId)?.name],['Procedencia',b.origin],['Fecha de ingreso',date(b.arrival)],[cfg.catalogs.purpose.label,b.purpose],[cfg.plLabel,b.pl]]);
    section('03','Genealogía');const parent=(id:string)=>{const p=db.birds.find(x=>x.id===id);return p?`${p.name} · ${p.code}`:''};fields([['Padre',parent(b.father)],['Madre',parent(b.mother)]],2);
    section('04','Notas generales');paragraph('',b.notes||'Sin datos registrados');
    const events=db.events.filter(e=>e.birdId===b.id).sort((a,b)=>b.date.localeCompare(a.date));
    if(events.length)section('05','Salud y cuidados');
    else{ensure(17);text('05',LEFT,y+4,8,C.terra,true);text('Salud y cuidados',25,y+4,10,C.green,true);text('Sin datos registrados',25,y+10,8,C.muted);y+=17}
    for(const e of events){ensure(43);const status=e.done?'Completado':(e.followUp||e.date)<today()?'Vencido':'Próximo';fields([[cfg.catalogs.eventType.label,e.type],['Fecha',date(e.date)],['Estado',status]]);if(e.followUp)fields([['Próximo control',date(e.followUp)]],1);paragraph('Observaciones',e.notes||'Sin datos registrados')}
    if(b.photos.length>1){section('06','Galería de fotografías');for(let i=0;i<b.photos.length;i+=2){ensure(74);for(let j=i;j<Math.min(i+2,b.photos.length);j++){const x=LEFT+(j-i)*91;pdf.setFillColor(C.white);pdf.setDrawColor(C.line);pdf.roundedRect(x,y,87,70,2,2,'FD');if(!image(b.photos[j],x+4,y+4,79,56)){drawRooster(pdf,x+20,y+5,47,50);text('Imagen no disponible',x+4,y+56,7,C.terra)}text(`FOTOGRAFÍA ${j+1}`,x+4,y+65,6.5,C.muted,true)}y+=75}}
  }
  const count=pdf.getNumberOfPages();for(let i=1;i<=count;i++){pdf.setPage(i);pdf.setDrawColor(C.line);pdf.setLineWidth(.25);pdf.line(LEFT,282,194,282);const code=pageBirds[i-1].code;const short=pdf.splitTextToSize(code,90)[0];text(`Registro Gallero · ${short}`,LEFT,288,7,C.muted);text(`${i} / ${count}`,182,288,7,C.muted);text('Documento generado localmente · Identificación y cuidados responsables',LEFT,292,6,C.muted)}return pdf;
}
export async function exportBirdPDF(birds:Bird[],db:Database){const pdf=createBirdPDF(birds,db);const name=birds.length===1?birds[0].code.replace(/[^a-zA-Z0-9_-]/g,'_'):'fichas';return saveFile(`registro-gallero-${name}-${today()}.pdf`,new Blob([pdf.output('arraybuffer')],{type:'application/pdf'}))}
