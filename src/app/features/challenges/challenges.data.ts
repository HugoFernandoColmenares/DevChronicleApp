import { Challenge } from '@core/models/challenge.model';

export const CHALLENGES: Challenge[] = [
  {
    slug: 'suma-numeros-pares',
    title: 'Suma de números pares',
    summary:
      'Escribe una función que sume todos los números pares desde 2 hasta un entero positivo dado.',
    difficulty: 'warmup',
    tags: ['javascript', 'bucles', 'fundamentos'],
    language: 'javascript',
    prompt: `Escribe una función llamada \`sumaNumerosPares\` que tome un número entero positivo como argumento y devuelva la suma de todos los números pares desde 2 hasta ese número.

Si el valor no es un número válido o es menor que 2, la función debe devolver \`0\`.`,
    hint: `function sumaNumerosPares(numero) {
	
	while (actual <= numero) {

	}

	return suma;
}`,
    solution: `function sumaNumerosPares(numero) {
	if (typeof numero !== 'number' || Number.isNaN(numero) || numero < 2) {
		return 0;
	}

	let suma = 0;
	let actual = 2;

	while (actual <= numero) {
		suma += actual;
		actual += 2;
	}

	return suma;
}`,
  },
  {
    slug: 'contar-vocales',
    title: 'Contar vocales',
    summary:
      'Cuenta cuántas vocales (a, e, i, o, u) aparecen en una cadena, sin distinguir mayúsculas.',
    difficulty: 'warmup',
    tags: ['javascript', 'cadenas', 'fundamentos'],
    language: 'javascript',
    prompt: `Escribe una función llamada \`contarVocales\` que reciba una cadena y devuelva cuántas vocales contiene (\`a\`, \`e\`, \`i\`, \`o\`, \`u\`), sin importar mayúsculas o minúsculas.

Caracteres con tilde no cuentan como vocal en este reto. Si el argumento no es una cadena, devuelve \`0\`.`,
    hint: `function contarVocales(texto) {
	const vocales = new Set(['a', 'e', 'i', 'o', 'u']);
	let total = 0;

	for (const caracter of ...) {
		
	}

	return total;
}`,
    solution: `function contarVocales(texto) {
	if (typeof texto !== 'string') {
		return 0;
	}

	const vocales = new Set(['a', 'e', 'i', 'o', 'u']);
	let total = 0;

	for (const caracter of texto.toLowerCase()) {
		if (vocales.has(caracter)) {
			total += 1;
		}
	}

	return total;
}`,
  },
  {
    slug: 'invertir-palabras',
    title: 'Invertir palabras',
    summary: 'Invierte el orden de las palabras de una frase sin alterar las letras de cada una.',
    difficulty: 'practice',
    tags: ['javascript', 'cadenas', 'arreglos'],
    language: 'javascript',
    prompt: `Escribe una función llamada \`invertirPalabras\` que reciba una frase y devuelva las mismas palabras en orden inverso.

Los espacios múltiples deben colapsarse a uno. Si el argumento no es una cadena, o queda vacía tras recortar, devuelve una cadena vacía.`,
    hint: `function invertirPalabras(frase) {
	const partes = frase.trim().split(/\\s+/);

	return partes.reverse().join(' ');
}`,
    solution: `function invertirPalabras(frase) {
	if (typeof frase !== 'string') {
		return '';
	}

	const limpia = frase.trim();
	if (!limpia) {
		return '';
	}

	return limpia.split(/\\s+/).reverse().join(' ');
}`,
  },
];

export function challengeBySlug(slug: string): Challenge | undefined {
  return CHALLENGES.find((item) => item.slug === slug);
}
