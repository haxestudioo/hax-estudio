import fotos from './fotos.mjs';
// Limite separado para evitar spam de pedidos, sem impedir muitas miniaturas na galeria.
export default fotos;
export const config={
 path:'/api/fotos/checkout',
 rateLimit:{windowLimit:25,windowSize:60,aggregateBy:'ip',action:'rate_limit'}
};
