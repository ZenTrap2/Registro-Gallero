let locks=0,previousOverflow='';
const layers:HTMLElement[]=[];const listeners=new Set<()=>void>();
export function lockPage(){if(locks++===0){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden'}return()=>{locks=Math.max(0,locks-1);if(!locks)document.body.style.overflow=previousOverflow}}
export function registerLayer(element:HTMLElement){const unlock=lockPage();layers.push(element);document.body.dataset.modalOpen='true';listeners.forEach(fn=>fn());return()=>{const i=layers.indexOf(element);if(i>=0)layers.splice(i,1);if(!layers.length)delete document.body.dataset.modalOpen;unlock();listeners.forEach(fn=>fn())}}
export const subscribeLayers=(callback:()=>void)=>{listeners.add(callback);return()=>{listeners.delete(callback)}};
export const topLayer=()=>layers.at(-1)||null;
