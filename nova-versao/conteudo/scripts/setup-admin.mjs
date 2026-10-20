import readline from 'node:readline';
import {randomBytes} from 'node:crypto';
import {passwordHash} from '../netlify/lib/security.mjs';
if(!process.stdin.isTTY){console.error('Execute este comando em um terminal interativo.');process.exit(1);}
console.log('Crie sua senha de administrador. Use pelo menos 12 caracteres.\nA senha não será exibida nem gravada.');
process.stdout.write('Senha: ');process.stdin.setRawMode(true);process.stdin.resume();let password='';
process.stdin.on('data',chunk=>{for(const c of chunk.toString()){if(c==='\u0003'){process.stdin.setRawMode(false);process.exit(1);}if(c==='\r'||c==='\n'){process.stdin.setRawMode(false);process.stdin.pause();console.log('');if(password.length<12){console.error('Use pelo menos 12 caracteres e execute novamente.');process.exit(1);}console.log('\nCopie estes dois valores para as variáveis de ambiente do Netlify (Functions). Não os publique no GitHub.\n');console.log('ADMIN_PASSWORD_HASH='+passwordHash(password));console.log('ADMIN_SESSION_SECRET='+randomBytes(48).toString('hex'));password='';process.exit(0);}if(c==='\u007f'){password=password.slice(0,-1);}else if(c>=' ')password+=c;}});
