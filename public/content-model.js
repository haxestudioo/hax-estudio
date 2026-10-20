import {upgradePresentation} from './presentation-model.js';
export const brandPalette={paper:'#faf8f3',ink:'#343b2e',accent:'#606b49',soft:'#efeee6',muted:'#707468',highlight:'#ded5bd'};
export const photoCategories={casamento:'Fotografia de casamento',prewedding:'Pré-wedding',gestante:'Gestantes',externo:'Ensaios externos',shows:'Fotografia de shows'};
export const videoCategories={casamento:'Casamento',prewedding:'Pré-wedding'};
export const editorialTexts={
 storyEyebrow:'CADA FASE TEM A SUA BELEZA',
 storyTitle:'Há momentos que passam.\nE histórias que ficam.',
 storyBody:'Do encontro antes do sim ao abraço de uma família que cresce. Da liberdade de um ensaio à energia de um palco. Meu olhar acompanha o que você vive e transforma esse sentimento em imagem.',
 preEyebrow:'01 / ANTES DO SIM',
 preTitle:'Pré-wedding.',
 preBody:'Antes da cerimônia, existe a história de vocês. O pré-wedding é um ensaio para viver esse encontro com calma, em um lugar que faça sentido para o casal. Uma oportunidade de se reconhecer nas imagens e chegar ao grande dia à vontade diante da câmera.',
 preNote:'Um passeio, uma conversa, o jeito de vocês. A direção é leve; o sentimento é real.',
 preCta:'Quero planejar nosso pré-wedding',
 weddingEyebrow:'02 / O DIA DE VOCÊS',
 weddingTitle:'Casamento,\nem movimento.',
 weddingBody:'A voz dos votos, os abraços, a música e a alegria de estar perto de quem importa. O filme reúne esses momentos em uma narrativa sensível, do preparo à celebração.',
 weddingCta:'Conhecer os pacotes de filme',
 photoEyebrow:'03 / O QUE O OLHAR GUARDA',
 photoTitle:'Fotografia\nde casamento.',
 photoBody:'O vestido, a espera, o sim. E tudo aquilo que acontece entre um momento e outro. Fotografias que preservam os gestos, a luz e as pessoas que fazem parte do seu dia.',
 photoCta:'Conhecer os pacotes de fotografia',
 maternityEyebrow:'04 / A VIDA GANHA UM NOVO CAPÍTULO',
 maternityTitle:'Gestante.\nAmor antes do abraço.',
 maternityBody:'Um ensaio para celebrar a espera e a beleza dessa transformação. Com direção tranquila e espaço para ser você, sozinha ou ao lado de quem já ama essa nova vida.',
 externalEyebrow:'05 / UM TEMPO PARA VOCÊ',
 externalTitle:'Ensaios externos.',
 externalBody:'Luz natural, movimento e um cenário que converse com a sua personalidade. Um ensaio ao ar livre para celebrar quem você é, com liberdade, presença e direção em cada detalhe.',
 externalCta:'Quero viver essa experiência',
 showsEyebrow:'06 / QUANDO A EMOÇÃO VIRA ENERGIA',
 showsTitle:'Fotografia\nde shows.',
 showsBody:'A força de uma apresentação está na presença do artista, na luz e na resposta do público. Registro essa conexão em fotografias para divulgação, portfólio e memória de quem faz o show acontecer.',
 showsCta:'Conversar sobre a cobertura',
 faqTitle:'Antes do nosso\nprimeiro encontro.',
 quickTitle:'Vamos começar pela sua data?',
 directoryTitle:'Encontre a sua história'
};
export const editorialPhotos=[
 {id:'pre-encontro',src:'/assets/prewedding-encontro.webp',alt:'Casal em ensaio pré-wedding ao ar livre, cercado por árvores',category:'prewedding',active:true},
 {id:'ext-jardim',src:'/assets/ensaio-jardim.webp',alt:'Retrato feminino em ensaio externo junto à vegetação',category:'externo',active:true},
 {id:'ext-caminho',src:'/assets/ensaio-caminho.webp',alt:'Ensaio externo com vestido vermelho em caminho arborizado',category:'externo',active:true},
 {id:'ext-natureza',src:'/assets/ensaio-natureza.webp',alt:'Retrato ao ar livre com vestido amarelo e luz natural',category:'externo',active:true},
 {id:'show-palco',src:'/assets/show-palco.webp',alt:'Artista no palco sob feixes de luz azul durante um show',category:'shows',active:true},
 {id:'show-voz',src:'/assets/show-voz.webp',alt:'Cantor ao microfone durante apresentação ao vivo',category:'shows',active:true},
 {id:'show-guitarra',src:'/assets/show-guitarra.webp',alt:'Guitarrista em apresentação com iluminação vermelha',category:'shows',active:true},
 {id:'show-encontro',src:'/assets/show-encontro.webp',alt:'Artistas dividindo o palco em uma apresentação musical',category:'shows',active:true}
];
export function upgradeContent(input){
 if(!input||typeof input!=='object')return input;
 const old=Number(input.version||1)<3;
 const photos=[...(input.photos||[])];
 if(old)editorialPhotos.forEach(p=>{if(!photos.some(x=>x.id===p.id))photos.push({...p});});
 const videos=(input.videos||[]).map(v=>{
  const pre=/81_ixFOdWSs|piCXHnJa9A8/.test(v.url||'');
  const next={...v,category:v.category||(pre?'prewedding':'casamento')};
  if(old&&pre&&['/assets/votos.webp','/assets/casamento-ar-livre.webp'].includes(v.poster))next.poster='/assets/prewedding-filme-'+(v.url.includes('81_ixFOdWSs')?'1':'2')+'.webp';
  if(old&&pre&&v.subtitle==='FILME DE CASAMENTO · HAX ESTÚDIO')next.subtitle='PRÉ-WEDDING · HAX ESTÚDIO';
  return next;
 });
 return upgradePresentation({...input,colors:old?{...brandPalette}:{...brandPalette,...input.colors},texts:{...editorialTexts,...input.texts},photos,videos});
}
export function reorder(items,from,to){if(!Array.isArray(items)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=items.length||to>=items.length||from===to)return false;const [item]=items.splice(from,1);items.splice(to,0,item);return true;}
