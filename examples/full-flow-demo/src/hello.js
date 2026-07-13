export function hello(name) {
  if (!name || typeof name !== 'string') return 'Hello, World';
  return `Hello, ${name}`;
}
