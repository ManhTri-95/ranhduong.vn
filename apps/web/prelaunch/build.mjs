import { cp, mkdir } from 'node:fs/promises';

const output = new URL('./dist/', import.meta.url);
await mkdir(output, { recursive: true });
await cp(new URL('./src/', import.meta.url), output, { recursive: true });
await cp(new URL('../../../packages/ui/src/tokens.css', import.meta.url), new URL('tokens.css', output));
await cp(new URL('../../../packages/ui/src/components.css', import.meta.url), new URL('components.css', output));
console.log('Trang sắp ra mắt đã được tạo tại apps/web/prelaunch/dist.');
