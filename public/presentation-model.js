export const heroDefaults={height:'full',alignment:'center',overlay:48,showInquiry:true};
export const portraitDefaults={size:220,positionX:50,positionY:20};
export const promotionDefaults={autoOpen:true,delaySeconds:5,frequency:'session',showBadge:true,image:'/assets/noiva-luz.webp',eyebrow:'MEMÓRIAS PARA SEMPRE',whatsappMessage:'Olá, Leanderson! Quero reivindicar o desconto de {desconto}% da Black November em um dos pacotes {pacotes}. Podemos conversar?'};
export const presentationTexts={heroSecondaryCta:'Conheça nossas histórias',testimonialsEyebrow:'PALAVRAS DE QUEM VIVEU',testimonialsTitle:'O que fica,\nna voz de vocês.',testimonialsBody:'Depois do grande dia, a emoção encontra um jeito de voltar. Estas são algumas das palavras que recebi de quem confiou sua história à Hax Estúdio.'};
// Depoimentos e retratos já publicados pelo proprietário em haxestudio.com.br.
export const originalTestimonials=[
 {id:'leticia-eduardo',name:'Leticia e Eduardo',context:'Filme de casamento',quote:'Quando assistimos o vídeo pela primeira vez, foi impossível não chorar. Vocês conseguiram captar exatamente o que a gente sentiu naquele dia.',photo:'/assets/depoimento-leticia-eduardo.jpg',positionX:50,positionY:20,active:true},
 {id:'maria-jeferson',name:'Maria Vitoria e Jeferson',context:'Filme de casamento',quote:'Mostramos o vídeo pra família inteira e todo mundo se emocionou. É uma lembrança que vai ficar pra sempre.',photo:'/assets/depoimento-maria-jeferson.jpg',positionX:50,positionY:30,active:true}
];
export const bounded=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
export function upgradePresentation(input){
 const previous=Number(input.version||1)<4;
 return {...input,version:Math.max(4,Number(input.version)||1),hero:{...heroDefaults,...input.hero},aboutAppearance:{...portraitDefaults,...input.aboutAppearance},promotion:{...promotionDefaults,...input.promotion},testimonialSettings:{enabled:true,...input.testimonialSettings},testimonials:(input.testimonials??(previous?originalTestimonials:[])).map(t=>({positionX:50,positionY:50,...t})),texts:{...presentationTexts,...input.texts}};
}
export function validatePresentation(d){
 const fail=message=>{throw Error(message);};
 const range=(v,min,max,label)=>{if(!Number.isFinite(v)||v<min||v>max)fail(label+': use um valor entre '+min+' e '+max+'.');};
 if(!d.hero||!['full','compact'].includes(d.hero.height)||!['center','left'].includes(d.hero.alignment)||typeof d.hero.showInquiry!=='boolean')fail('Confira as opções do banner principal.');
 range(d.hero.overlay,0,80,'Sombra do banner');
 const a=d.aboutAppearance;if(!a)fail('Configuração do retrato ausente.');range(a.size,140,320,'Tamanho do retrato');range(a.positionX,0,100,'Enquadramento horizontal do retrato');range(a.positionY,0,100,'Enquadramento vertical do retrato');
 const p=d.promotion;if(!p||typeof p.autoOpen!=='boolean'||typeof p.showBadge!=='boolean'||!['session','visit'].includes(p.frequency))fail('Confira as opções do pop-up.');range(p.delaySeconds,0,120,'Espera do pop-up');range(p.discount,0,100,'Desconto');
 for(const [key,max] of [['eyebrow',200],['whatsappMessage',2000]])if(typeof p[key]!=='string'||p[key].length>max)fail('Texto do pop-up inválido.');
 if(!d.testimonialSettings||typeof d.testimonialSettings.enabled!=='boolean'||!Array.isArray(d.testimonials)||d.testimonials.length>50)fail('Confira a seção de depoimentos.');
 const ids=new Set();for(const t of d.testimonials){
  if(!/^[a-zA-Z0-9-]{1,64}$/.test(t.id)||ids.has(t.id))fail('Identificação de depoimento inválida ou duplicada.');ids.add(t.id);
  if(typeof t.active!=='boolean')fail('Situação do depoimento inválida.');
  for(const [k,max] of [['name',150],['context',150],['quote',2000],['photo',4000000]])if(typeof t[k]!=='string'||t[k].length>max)fail('Confira os campos do depoimento.');
  if(t.active&&(!t.name.trim()||!t.quote.trim()))fail('Preencha o nome e o texto antes de exibir um depoimento.');
  range(t.positionX,0,100,'Enquadramento horizontal do depoimento');range(t.positionY,0,100,'Enquadramento vertical do depoimento');
 }
 return d;
}
