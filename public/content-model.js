import {upgradePresentation} from './presentation-model.js';
export const brandPalette={paper:'#faf8f3',ink:'#343b2e',accent:'#606b49',soft:'#efeee6',muted:'#707468',highlight:'#ded5bd'};
export const photoCategories={casamento:'Fotografia de casamento',prewedding:'Pré-wedding',gestante:'Gestantes',externo:'Ensaios externos',shows:'Fotografia de shows'};
export const videoCategories={casamento:'Casamento',prewedding:'Pré-wedding'};
export const serviceCategories={video:'Filmes & Storymaker',foto:'Fotografia de casamento',gestante:'Ensaios gestantes',externo:'Ensaios externos',shows:'Fotografia de shows'};
export const additionalPackages=[
 {id:'brisa',category:'externo',name:'Brisa',subtitle:'Um encontro leve com a sua melhor versão.',price:350,active:true,featured:false,features:['Até 1 hora de ensaio externo','20 fotos tratadas e editadas','Uma locação e uma produção de roupa','Direção de poses durante todo o ensaio','Entrega digital em alta resolução'],details:'Fotos entregues em até 7 dias úteis após o ensaio, pelo Google Drive. Local escolhido em conjunto. Roupas, maquiagem, taxas de locação e deslocamento fora da cidade não estão incluídos. Em caso de chuva, combinamos uma nova data.'},
 {id:'horizonte',category:'externo',name:'Horizonte',subtitle:'Mais tempo, mais possibilidades de ser você.',price:550,active:true,featured:true,features:['Até 1h30 de ensaio externo','40 fotos tratadas e editadas','Uma locação e até duas produções de roupa','Ensaio individual ou de casal','Orientação de looks e direção de poses','Entrega digital em alta resolução'],details:'Fotos entregues em até 7 dias úteis após o ensaio, pelo Google Drive. Uma experiência com mais variedade de luz, cenários e composições na mesma locação. Roupas, maquiagem, taxas de locação e deslocamento fora da cidade não estão incluídos. Em caso de chuva, combinamos uma nova data.'},
 {id:'liberdade',category:'externo',name:'Liberdade',subtitle:'Uma experiência para explorar a sua história.',price:750,active:true,featured:false,features:['Até 2 horas de ensaio externo','60 fotos tratadas e editadas','Até duas locações próximas, na mesma cidade','Até três produções de roupa','Ensaio individual, de casal ou em família','Planejamento dos cenários e direção de poses','Entrega digital em alta resolução'],details:'Fotos entregues em até 10 dias úteis após o ensaio, pelo Google Drive. O deslocamento entre as locações faz parte das duas horas de sessão. Roupas, maquiagem, taxas de locação e deslocamento fora da cidade não estão incluídos. Em caso de chuva, combinamos uma nova data.'},
 {id:'show-presenca',category:'shows',name:'Presença de palco',subtitle:'A energia do seu show em cada imagem.',price:0,quoteOnly:true,active:true,featured:true,features:['Cobertura fotográfica da apresentação','Registros do artista, da atmosfera e do público','Seleção e tratamento das imagens','Entrega digital em alta resolução','Duração e quantidade de fotos definidas na proposta'],details:'Valor a combinar conforme duração, local e necessidades da produção. Credenciamento, acesso ao palco e aos bastidores e prazo de entrega são alinhados antes da contratação.'}
];
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
function renameCampaignAcrossContent(value){
 if(typeof value==='string')return value.replace(/black[\s-]+friday/gi,match=>match===match.toUpperCase()?'BLACK NOVEMBER':match===match.toLowerCase()?'black november':'Black November');
 if(Array.isArray(value))return value.map(renameCampaignAcrossContent);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,renameCampaignAcrossContent(item)]));
 return value;
}
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
 const next=upgradePresentation({...input,colors:old?{...brandPalette}:{...brandPalette,...input.colors},texts:{...editorialTexts,...input.texts},photos,videos});
 if(Number(input.version||1)<5){
  next.packages=[...(input.packages||[])];
  for(const p of additionalPackages)if(!next.packages.some(x=>x.id===p.id))next.packages.push(structuredClone(p));
  if(next.promotion.headline==='O seu sim.\nUma condição especial.')next.promotion.headline='Fotografia e filme\npara o seu casamento.';
  if(next.promotion.image==='/assets/noiva-luz.webp')next.promotion.image='/assets/noiva-retrato.webp';
  if(next.texts.investmentBody?.includes('Para ensaios externos e shows'))next.texts.investmentBody='Escolha o seu momento e conheça os planos. Compare as opções com calma e vamos encontrar a cobertura que combina com a sua história.';
 }
 return renameCampaignAcrossContent({...next,version:Math.max(5,Number(next.version)||1)});
}
export function reorder(items,from,to){if(!Array.isArray(items)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=items.length||to>=items.length||from===to)return false;const [item]=items.splice(from,1);items.splice(to,0,item);return true;}
