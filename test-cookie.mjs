import { serialize } from 'cookie';
console.log(serialize('foo', 'bar', { maxAge: 604800 }));
