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
  {
    slug: 'tipar-dto-check-in-asistencia',
    title: 'Tipar un DTO de check-in de asistencia',
    summary:
      'Convierte un JSON suelto de check-in en un objeto tipado, o en un error claro. Nada de array $data sin forma.',
    difficulty: 'warmup',
    language: 'php',
    tags: ['php', 'tipos', 'dto'],
    articleSlug: 'php-8-3-tipado-moderno-tipos-enums-readonly',
    articleTitle:
      'Cómo escribir PHP 8.3 tipado y moderno (tipos, enums, readonly y constructor promotion)',
    prompt: `Escribe una clase readonly CheckInAsistencia (o un DTO equivalente) en PHP 8.3 o superior, con declare(strict_types=1).

Debe construirse desde un arreglo que llega como JSON, por ejemplo:
{"estudiante_id": 7, "fecha": "2026-11-23", "presente": true}

Reglas:
- estudiante_id es un entero positivo.
- fecha es una cadena YYYY-MM-DD válida (puedes reutilizar la idea de FechaExamen del tutorial).
- presente es un booleano de verdad, no "1" ni "si".
- Si falta un campo, o el tipo no sirve, lanza InvalidArgumentException con un mensaje claro.
- No aceptes un array $data sin forma como estado interno: el objeto ya construido solo expone propiedades tipadas.

Un método estático desdeArreglo(array $entrada): self es una buena puerta de entrada.`,
    hint: `final readonly class CheckInAsistencia
{
    public function __construct(
        public int $estudianteId,
        public string $fecha,
        public bool $presente,
    ) {}

    public static function desdeArreglo(array $entrada): self
    {
        // valida cada clave y tipo antes de new self(...)
    }
}`,
    solution: `<?php

declare(strict_types=1);

final readonly class CheckInAsistencia
{
    public function __construct(
        public int $estudianteId,
        public string $fecha,
        public bool $presente,
    ) {
        if ($this->estudianteId < 1) {
            throw new InvalidArgumentException('estudiante_id debe ser un entero positivo.');
        }
        $fecha = DateTimeImmutable::createFromFormat('!Y-m-d', $this->fecha);
        if ($fecha === false || $fecha->format('Y-m-d') !== $this->fecha) {
            throw new InvalidArgumentException("fecha inválida: {$this->fecha}");
        }
    }

    public static function desdeArreglo(array $entrada): self
    {
        if (!array_key_exists('estudiante_id', $entrada) || !is_int($entrada['estudiante_id'])) {
            throw new InvalidArgumentException('estudiante_id debe ser un entero.');
        }
        if (!array_key_exists('fecha', $entrada) || !is_string($entrada['fecha'])) {
            throw new InvalidArgumentException('fecha debe ser una cadena.');
        }
        if (!array_key_exists('presente', $entrada) || !is_bool($entrada['presente'])) {
            throw new InvalidArgumentException('presente debe ser un booleano.');
        }

        return new self($entrada['estudiante_id'], $entrada['fecha'], $entrada['presente']);
    }
}`,
  },
  {
    slug: 'cazar-n-plus-1-en-asistencia-del-dojo',
    title: 'Cazar el N+1 en la asistencia del dojo',
    summary:
      'Reescribe una lista de grupos con estudiantes y asistencias para que no dispare una consulta por hijo.',
    difficulty: 'practice',
    language: 'php',
    tags: ['laravel', 'eloquent', 'n-plus-1'],
    articleSlug: 'modelar-relaciones-eloquent-y-cazar-el-n-plus-1',
    articleTitle: 'Cómo modelar relaciones en Eloquent y cazar el problema N+1',
    prompt: `Tienes este bucle en un controlador o comando:

foreach (Grupo::all() as $grupo) {
    foreach ($grupo->estudiantes as $estudiante) {
        $lineas[] = $grupo->nombre.' / '.$estudiante->nombre
            .' / asistencias: '.$estudiante->asistencias->count();
    }
}

Con 3 grupos y 8 estudiantes por grupo esto llegó a 28 consultas. Reescribe la consulta de entrada (una sola línea o un encadenado claro) para que Eloquent haga eager loading anidado y el recuento de consultas baje a un número fijo y pequeño (en el tutorial, 3).

Explica en un comentario por qué $estudiante->asistencias->count() (sin paréntesis de relación) está bien una vez cargada la relación, y qué pasaría si usaras $estudiante->asistencias()->count().`,
    hint: `Grupo::with('estudiantes.asistencias')->get()

// withCount('asistencias') también vale si solo necesitas el número.`,
    solution: `foreach (Grupo::with('estudiantes.asistencias')->get() as $grupo) {
    foreach ($grupo->estudiantes as $estudiante) {
        $lineas[] = $grupo->nombre.' / '.$estudiante->nombre
            .' / asistencias: '.$estudiante->asistencias->count();
    }
}

// $estudiante->asistencias->count() cuenta la colección ya cargada en memoria.
// $estudiante->asistencias()->count() dispara un SELECT count(*) por estudiante
// y vuelve a introducir un N+1 aunque hayas hecho with('asistencias').

// Si solo necesitas el recuento y no las filas:
// Grupo::with('estudiantes')->withCount(['estudiantes as ignorar' => ...]);
// o, en el estudiante: Grupo::with(['estudiantes' => fn ($q) => $q->withCount('asistencias')])->get();
// y entonces $estudiante->asistencias_count.`,
  },
  {
    slug: 'policy-de-asistencia-por-rol',
    title: 'Policy de asistencia por rol',
    summary:
      'Completa AsistenciaPolicy para sensei, recepción y estudiante, con un caso que deba devolver false.',
    difficulty: 'practice',
    language: 'php',
    tags: ['laravel', 'policies', 'autorizacion'],
    articleSlug: 'proteger-app-laravel-con-sanctum-policies-y-gates',
    articleTitle: 'Cómo proteger una app Laravel con Sanctum, Policies y Gates',
    prompt: `Implementa los métodos viewAny, view, create, update y delete de AsistenciaPolicy con estas reglas:

- sensei: puede ver, crear, actualizar y borrar cualquier asistencia.
- recepcion: puede ver, crear y actualizar; no puede borrar.
- estudiante: solo puede ver la asistencia cuyo estudiante_id coincide con user.estudiante_id; no lista el índice, no crea, no edita, no borra.

Asume que User tiene esSensei() y esRecepcion(), y el campo estudiante_id (nullable).

Además, escribe en dos o tres líneas un caso de prueba (en prosa o en Pest) que deba quedar en false o 403.`,
    hint: `public function delete(User $user, Asistencia $asistencia): bool
{
    return $user->esSensei();
}

public function view(User $user, Asistencia $asistencia): bool
{
    if ($user->esSensei() || $user->esRecepcion()) {
        return true;
    }

    return $user->estudiante_id !== null
        && $user->estudiante_id === $asistencia->estudiante_id;
}`,
    solution: `public function viewAny(User $user): bool
{
    return $user->esSensei() || $user->esRecepcion();
}

public function view(User $user, Asistencia $asistencia): bool
{
    if ($user->esSensei() || $user->esRecepcion()) {
        return true;
    }

    return $user->estudiante_id !== null
        && $user->estudiante_id === $asistencia->estudiante_id;
}

public function create(User $user): bool
{
    return $user->esSensei() || $user->esRecepcion();
}

public function update(User $user, Asistencia $asistencia): bool
{
    return $user->esSensei() || $user->esRecepcion();
}

public function delete(User $user, Asistencia $asistencia): bool
{
    return $user->esSensei();
}

// Caso negativo: un usuario con rol recepcion no puede borrar.
// it('impide a recepcion borrar', function () {
//     $recepcion = User::factory()->create(['rol' => 'recepcion']);
//     $asistencia = Asistencia::factory()->create();
//     expect($recepcion->can('delete', $asistencia))->toBeFalse();
// });`,
  },
  {
    slug: 'job-recordatorio-de-clase',
    title: 'Job de recordatorio de clase',
    summary:
      'Escribe un Job ShouldQueue que reciba el id del grupo y una fecha, y deje el trabajo fuera de la petición HTTP.',
    difficulty: 'practice',
    language: 'php',
    tags: ['laravel', 'colas', 'jobs'],
    articleSlug: 'trabajo-en-segundo-plano-jobs-colas-y-redis-laravel',
    articleTitle: 'Cómo poner trabajo en segundo plano con Jobs, colas y Redis en Laravel',
    prompt: `Crea el Job EnviarRecordatorioDeClase en el estilo de Laravel 13 (ShouldQueue y el trait Queueable).

Debe:
- Recibir int $grupoId y string $fechaIso en el constructor (no el modelo Eloquent completo).
- En handle(), cargar el grupo con withCount('estudiantes') y escribir un Log::info('recordatorio-de-clase', [...]) con nombre, horario, recuento y fecha.
- Mostrar una línea de cómo se despacha desde un controlador ya autorizado.

No hace falta enviar un correo real.`,
    hint: `class EnviarRecordatorioDeClase implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $grupoId, public string $fechaIso)
    {
    }
}`,
    solution: `<?php

namespace App\\Jobs;

use App\\Models\\Grupo;
use Illuminate\\Contracts\\Queue\\ShouldQueue;
use Illuminate\\Foundation\\Queue\\Queueable;
use Illuminate\\Support\\Facades\\Log;

class EnviarRecordatorioDeClase implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $grupoId, public string $fechaIso)
    {
    }

    public function handle(): void
    {
        $grupo = Grupo::query()->withCount('estudiantes')->findOrFail($this->grupoId);

        Log::info('recordatorio-de-clase', [
            'grupo' => $grupo->nombre,
            'horario' => $grupo->horario,
            'estudiantes' => $grupo->estudiantes_count,
            'fecha' => $this->fechaIso,
        ]);
    }
}

// En el controlador, después de autorizar:
// EnviarRecordatorioDeClase::dispatch($grupo->id, '2026-11-24');`,
  },
  {
    slug: 'primer-test-de-autorizacion-pest',
    title: 'Primer test de autorización con Pest',
    summary:
      'Escribe un test de Pest que cubra un caso negativo de la Policy: recepción no puede borrar una asistencia.',
    difficulty: 'practice',
    language: 'php',
    tags: ['laravel', 'pest', 'tests'],
    articleSlug: 'testear-laravel-con-pest-unitarias-feature-autorizacion',
    articleTitle:
      'Cómo testear de verdad con Pest: unitarias, de feature y el primer test de autorización',
    prompt: `Escribe un test de Pest (it(...)) que demuestre que un usuario con rol recepcion puede crear una Asistencia y no puede borrarla.

Usa factories (Grupo, Estudiante, Asistencia, User). No dependas de un seeder. Asume que tests/Pest.php ya aplica RefreshDatabase en Feature.

El test debe quedar en verde con al menos dos aserciones: can('create') verdadero y can('delete') falso.`,
    hint: `it('permite a recepcion crear y le impide borrar', function () {
    $recepcion = User::factory()->create(['rol' => 'recepcion']);
    // crea grupo, estudiante y asistencia con factories
});`,
    solution: `it('permite a recepcion crear y le impide borrar', function () {
    $recepcion = User::factory()->create(['rol' => 'recepcion']);
    $grupo = Grupo::factory()->create();
    $estudiante = Estudiante::factory()->for($grupo)->create();
    $asistencia = Asistencia::factory()->for($estudiante)->create([
        'fecha' => '2026-11-22',
    ]);

    expect($recepcion->can('create', Asistencia::class))->toBeTrue()
        ->and($recepcion->can('delete', $asistencia))->toBeFalse();
});`,
  },
  {
    slug: 'pagina-inertia-de-check-in',
    title: 'Página Inertia de check-in',
    summary:
      'Arma el controlador y las props tipadas de una pantalla de check-in con Inertia y React.',
    difficulty: 'stretch',
    language: 'typescript',
    tags: ['laravel', 'inertia', 'react'],
    articleSlug: 'fullstack-laravel-inertia-react-typescript-tailwind',
    articleTitle:
      'Cómo armar un fullstack Laravel con Inertia.js, React, TypeScript y Tailwind, paso a paso',
    prompt: `Escribe dos piezas, cortas y completas:

1. El método index de CheckInController: autoriza con create de Asistencia, carga un Grupo con with('estudiantes'), obtiene las asistencias del día y devuelve Inertia::render('CheckIn/Index', [...]).
2. El type Props de resources/js/Pages/CheckIn/Index.tsx, alineado con esas props.

No hace falta el JSX completo del listado, pero el tipo sí debe coincidir con lo que manda Laravel.`,
    hint: `return Inertia::render('CheckIn/Index', [
    'grupo' => $grupo,
    'fecha' => $fecha,
    'asistencias' => $asistencias,
]);

type Props = {
  grupo: Grupo;
  fecha: string;
  asistencias: Record<string, Asistencia>;
};`,
    solution: `// app/Http/Controllers/CheckInController.php (index)
public function index(Request $request): Response
{
    $this->authorize('create', Asistencia::class);

    $grupo = Grupo::query()
        ->with(['estudiantes' => fn ($query) => $query->orderBy('nombre')])
        ->findOrFail($request->integer('grupo') ?: Grupo::query()->value('id'));

    $fecha = now()->toDateString();
    $asistencias = Asistencia::query()
        ->where('fecha', $fecha)
        ->whereIn('estudiante_id', $grupo->estudiantes->pluck('id'))
        ->get()
        ->keyBy('estudiante_id');

    return Inertia::render('CheckIn/Index', [
        'grupo' => $grupo,
        'fecha' => $fecha,
        'asistencias' => $asistencias,
    ]);
}

// resources/js/Pages/CheckIn/Index.tsx
type Estudiante = { id: number; nombre: string; grado: string };
type Grupo = { id: number; nombre: string; horario: string; estudiantes: Estudiante[] };
type Asistencia = { id: number; estudiante_id: number; presente: boolean };

type Props = {
  grupo: Grupo;
  fecha: string;
  asistencias: Record<string, Asistencia>;
};`,
  },
  {
    slug: 'tabla-de-mapeo-aws-y-upload-local',
    title: 'Tabla de mapeo AWS y un upload local',
    summary:
      'Completa la tabla local → AWS → uso en la app y describe el walkthrough de un upload más un Job, sin llamadas de pago.',
    difficulty: 'stretch',
    language: 'text',
    tags: ['laravel', 'aws', 'minio'],
    articleSlug: 'mapear-laravel-a-aws-sin-gastar-sail-minio-redis',
    articleTitle: 'Cómo mapear Laravel a AWS sin gastar: Sail, MinIO, Redis y LocalStack',
    prompt: `Entrega dos cosas, en texto:

1. Una tabla de una página con al menos cinco filas: servicio local (gratis) → servicio AWS → qué hace en tu app Laravel del dojo. Incluye base de datos, cola, archivos, caché y la app misma.
2. Un walkthrough corto (pasos numerados) de un upload de CSV de asistencias que se guarda en el disco configurado (local o MinIO) y dispara un Job. El test debe usar Storage::fake(), nunca un bucket real.

No hace falta una cuenta de AWS. Si mencionas free tier, que sea opcional y consciente.`,
    hint: `SQLite o MySQL de Sail → RDS → tablas de Eloquent
Tabla jobs o Redis → SQS → recordatorios
MinIO o disco local → S3 → importaciones
Redis → ElastiCache → caché del horario
Sail / contenedor → ECS o EC2 → la app y el worker`,
    solution: `Tabla:

- SQLite o MySQL/Postgres de Sail → RDS → grupos, estudiantes, asistencias
- Redis de Sail o de Docker → ElastiCache → caché del horario semanal (y, si se quiere, la cola)
- Tabla jobs o Redis → SQS → recordatorios y reportes en segundo plano
- MinIO (o disco local) → S3 → CSV de importación y archivos del dojo
- php artisan serve + Vite, o un contenedor de Sail → ECS o EC2 (a veces Vapor) → la app y el queue:work
- LocalStack (opcional) → varios APIs de AWS → práctica del SDK, no producción

Walkthrough:

1. Un sensei entra a /importaciones y sube asistencias.csv.
2. El controlador autoriza, valida el archivo y lo guarda con store('importaciones', config('filesystems.default')).
3. Despacha ProcesarImportacionDeAsistencia::dispatch($ruta) y responde «quedó en cola».
4. php artisan queue:work --once procesa el Job y registra bytes y ruta en el log.
5. El test usa Storage::fake('local') y UploadedFile::fake(), y hace assertExists sobre el disco falso. Cero llamadas de pago.`,
  },
  {
    slug: 'pantalla-de-horarios-en-expo',
    title: 'Pantalla de horarios en Expo',
    summary: 'Pinta tres horarios del dojo con View, Text y StyleSheet, sin div ni texto suelto.',
    difficulty: 'warmup',
    language: 'typescript',
    tags: ['expo', 'react-native'],
    articleSlug: 'pasar-de-react-web-a-react-native-con-expo',
    articleTitle: 'Cómo pasar de React web a una app React Native con Expo',
    prompt: `Escribe una pantalla React Native (TypeScript) que muestre tres horarios: Infantil el sábado a las 10:00, Juvenil el lunes a las 18:00 y Adultos el miércoles a las 19:00.

Reglas:
- Usa View, Text y StyleSheet (o estilos en objeto). Nada de div, span o className.
- Todo texto visible va dentro de Text.
- Define un tipo Horario y un arreglo constante.

No hace falta navegación ni un backend.`,
    hint: `type Horario = { id: string; grupo: string; dia: string; hora: string };

{HORARIOS.map((horario) => (
  <View key={horario.id}>
    <Text>{horario.grupo}</Text>
  </View>
))}`,
    solution: `import { StyleSheet, Text, View } from 'react-native';

type Horario = {
  id: string;
  grupo: string;
  dia: string;
  hora: string;
};

const HORARIOS: Horario[] = [
  { id: 'infantil', grupo: 'Infantil', dia: 'Sábado', hora: '10:00' },
  { id: 'juvenil', grupo: 'Juvenil', dia: 'Lunes', hora: '18:00' },
  { id: 'adultos', grupo: 'Adultos', dia: 'Miércoles', hora: '19:00' },
];

export default function HorariosScreen() {
  return (
    <View style={styles.pantalla}>
      <Text style={styles.titulo}>Horarios de la semana</Text>
      {HORARIOS.map((horario) => (
        <View key={horario.id} style={styles.tarjeta}>
          <Text style={styles.grupo}>{horario.grupo}</Text>
          <Text style={styles.detalle}>
            {horario.dia} · {horario.hora}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, padding: 24, gap: 12 },
  titulo: { fontSize: 24, fontWeight: '600' },
  tarjeta: { padding: 16, borderRadius: 8, backgroundColor: '#f4f1ea' },
  grupo: { fontSize: 18, fontWeight: '600' },
  detalle: { fontSize: 16, marginTop: 4 },
});`,
  },
  {
    slug: 'stack-horarios-y-detalle',
    title: 'Stack de horarios y detalle',
    summary:
      'Conecta la lista y el detalle con Expo Router, y guarda el cupo reservado en un contexto.',
    difficulty: 'practice',
    language: 'typescript',
    tags: ['expo', 'expo-router', 'estado'],
    articleSlug: 'navegacion-y-estado-en-react-native',
    articleTitle:
      'Cómo pensar la navegación y el estado en React Native (sin pelearte con lo que ya sabes de React)',
    prompt: `Con Expo Router, arma:

1. Un Link (o router.push) desde la lista hacia /grupo/[id].
2. En app/grupo/[id].tsx, lee el id con useLocalSearchParams y normalízalo por si llega como arreglo.
3. Un botón «Reservar cupo de prueba» que guarde el id en un contexto compartido con la lista, de modo que al volver atrás se vea «Reservado».

No hace falta persistencia: si se recarga la app, la reserva puede borrarse.`,
    hint: `const params = useLocalSearchParams<{ id: string | string[] }>();
const id = Array.isArray(params.id) ? params.id[0] : params.id;

<Link href={\`/grupo/\${horario.id}\`} asChild>
  <Pressable>...</Pressable>
</Link>`,
    solution: `// Lista
<Link key={horario.id} href={\`/grupo/\${horario.id}\`} asChild>
  <Pressable>
    <Text>{horario.grupo}</Text>
    {grupoReservadoId === horario.id ? <Text>Reservado</Text> : null}
  </Pressable>
</Link>

// Detalle
const params = useLocalSearchParams<{ id: string | string[] }>();
const id = Array.isArray(params.id) ? params.id[0] : params.id;
const horario = HORARIOS.find((item) => item.id === id);
const { grupoReservadoId, reservar } = useReserva();

// En el botón:
<Pressable onPress={() => reservar(horario.id)} disabled={grupoReservadoId === horario.id}>
  <Text>{grupoReservadoId === horario.id ? 'Cupo reservado' : 'Reservar cupo de prueba'}</Text>
</Pressable>

// El ReservaProvider envuelve el Stack en app/_layout.tsx para que la lista vea el mismo estado.`,
  },
  {
    slug: 'contrato-de-eventos-del-embudo',
    title: 'Contrato de eventos del embudo',
    summary:
      'Define un union TypeScript de los eventos del embudo y una función track que sea la única puerta.',
    difficulty: 'practice',
    language: 'typescript',
    tags: ['typescript', 'metricas', 'posthog'],
    articleSlug: 'instrumentar-conversion-retencion-y-engagement',
    articleTitle:
      'Cómo instrumentar conversión, retención y engagement en un producto de consumidor',
    prompt: `Define un tipo EventoEmbudo (union discriminado) con al menos estos nombres: visita_horarios, reserva_iniciada, reserva_confirmada, asistencia_marcada y segunda_clase_reservada, cada uno con las propiedades mínimas que hagan falta (origen o grupoId o fecha).

Escribe también function track(evento: EventoEmbudo): void que llame a posthog.capture solo en el cliente, y que las páginas no importen posthog directo.

Un evento inventado como click_boton_azul no debe compilar.`,
    hint: `export type EventoEmbudo =
  | { nombre: 'visita_horarios'; props: { origen: 'web' | 'app' } }
  | { nombre: 'reserva_iniciada'; props: { grupoId: string } };
// ...

export function track(evento: EventoEmbudo): void {
  posthog.capture(evento.nombre, evento.props);
}`,
    solution: `export type EventoEmbudo =
  | { nombre: 'visita_horarios'; props: { origen: 'web' | 'app' } }
  | { nombre: 'reserva_iniciada'; props: { grupoId: string } }
  | { nombre: 'reserva_confirmada'; props: { grupoId: string } }
  | { nombre: 'asistencia_marcada'; props: { grupoId: string; fecha: string } }
  | { nombre: 'segunda_clase_reservada'; props: { grupoId: string } };

export function track(evento: EventoEmbudo): void {
  if (typeof window === 'undefined') {
    return;
  }
  posthog.capture(evento.nombre, evento.props);
}

// track({ nombre: 'click_boton_azul', props: {} }) // no compila`,
  },
  {
    slug: 'disenar-experimento-ab-del-cta',
    title: 'Diseñar el experimento A/B del CTA',
    summary:
      'Traduce un flag checkout_cta a un texto de botón y escribe la regla para no cantar ganador el día uno.',
    difficulty: 'stretch',
    language: 'typescript',
    tags: ['ab-testing', 'feature-flags', 'posthog'],
    articleSlug: 'experimentos-ab-y-feature-flags-con-posthog',
    articleTitle:
      'Cómo diseñar un experimento A/B y feature flags con PostHog o GrowthBook (y un poco de estadística para no mentirte)',
    prompt: `Escribe:

1. Las funciones varianteCta() y textoCta(variante) para un flag checkout_cta con valores control y urgente. control → «Reservar cupo de prueba». urgente → «Reserva tu primera clase hoy». Si el flag no está, usa control. Nada de Math.random().
2. En un párrafo corto, la métrica primaria del experimento y tres reglas para no mentirte con el resultado (cuándo se mira, qué no cuenta como victoria, qué pasa si no hay diferencia clara).`,
    hint: `const valor = posthog.getFeatureFlag('checkout_cta');
return valor === 'urgente' ? 'urgente' : 'control';`,
    solution: `export type VarianteCta = 'control' | 'urgente';

export function varianteCta(): VarianteCta {
  const valor = posthog.getFeatureFlag('checkout_cta');
  return valor === 'urgente' ? 'urgente' : 'control';
}

export function textoCta(variante: VarianteCta): string {
  return variante === 'urgente'
    ? 'Reserva tu primera clase hoy'
    : 'Reservar cupo de prueba';
}

// Métrica primaria: reserva_confirmada (no visita_horarios).
// Reglas: no se mira el mismo día del lanzamiento; no se declara ganador con pocas
// decenas de exposiciones; si el intervalo todavía cruza el «no hay diferencia»,
// el resultado es «todavía no sabemos». El tiempo de carrera se escribe antes de mirar.`,
  },
  {
    slug: 'test-del-embudo-reserva',
    title: 'Test del embudo de reserva',
    summary:
      'Escribe un test de componente o de Playwright que cubra pulsar Reservar y ver la confirmación.',
    difficulty: 'practice',
    language: 'typescript',
    tags: ['playwright', 'testing-library', 'tests'],
    articleSlug: 'probar-embudo-consumidor-jest-rtl-playwright',
    articleTitle:
      'Cómo probar un embudo de consumidor con Jest, React Testing Library y Playwright',
    prompt: `Elige una de las dos (o ambas, si quieres):

A) Un test de React Testing Library del botón BotonReservar: al pulsar, track se llama con reserva_iniciada y el grupoId. Mockea track. No abras la red.

B) Un test de Playwright que visita /, entra a Juvenil, pulsa un botón cuyo nombre incluye «Reservar» y espera un texto /reservado/i. Sin waitForTimeout fijos.

El test debe usar roles accesibles (getByRole), no clases CSS.`,
    hint: `await user.click(screen.getByRole('button'));
expect(track).toHaveBeenCalledWith({
  nombre: 'reserva_iniciada',
  props: { grupoId: 'juvenil' },
});`,
    solution: `// A) Testing Library
test('al pulsar se dispara reserva_iniciada', async () => {
  const user = userEvent.setup();
  render(<BotonReservar grupoId="juvenil" />);
  await user.click(screen.getByRole('button'));
  expect(track).toHaveBeenCalledWith({
    nombre: 'reserva_iniciada',
    props: { grupoId: 'juvenil' },
  });
});

// B) Playwright
test('una visitante reserva un cupo de prueba', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Juvenil/i }).click();
  await page.getByRole('button', { name: /Reservar/i }).click();
  await expect(page.getByText(/reservado/i)).toBeVisible();
});`,
  },
  {
    slug: 'workflow-eas-preview-y-apk',
    title: 'Workflow de preview EAS y un APK de testers',
    summary:
      'Escribe un eas.json con tres perfiles y un job de GitHub Actions que encola un preview de Android sin esperar el build nativo.',
    difficulty: 'stretch',
    language: 'yaml',
    tags: ['eas', 'github-actions', 'expo'],
    articleSlug: 'pipeline-de-liberacion-con-eas-y-github-actions',
    articleTitle:
      'Cómo armar un pipeline de liberación con EAS y GitHub Actions (preview, testers internos y el camino a las tiendas)',
    prompt: `Escribe:

1. Un eas.json (puede ser un recorte) con los perfiles preview, testers y production. preview y testers deben poder entregar un APK de Android. iOS en preview, si aparece, usa simulador.
2. El paso de GitHub Actions que corre eas-cli build para Android con el perfil preview, en modo no interactivo y sin dejar el runner esperando el compilado nativo. El token va en un secreto, no en el YAML.

No hace falta la cuenta de Apple.`,
    hint: `npx eas-cli build --platform android --profile preview --non-interactive --no-wait
env:
  EXPO_TOKEN: \${{ secrets.EXPO_TOKEN }}`,
    solution: `{
  "build": {
    "preview": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": true }
    },
    "testers": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" }
    }
  }
}

# En el workflow:
- run: npx eas-cli build --platform android --profile preview --non-interactive --no-wait
  env:
    EXPO_TOKEN: \${{ secrets.EXPO_TOKEN }}`,
  },
  {
    slug: 'informe-antes-y-despues-de-rendimiento',
    title: 'Informe antes y después de rendimiento',
    summary:
      'Completa un mini informe de una sola pantalla: métrica base, hipótesis, un cambio y la métrica nueva, aunque el número casi no se mueva.',
    difficulty: 'stretch',
    language: 'text',
    tags: ['rendimiento', 'nextjs', 'react-native'],
    articleSlug: 'medir-y-mejorar-rendimiento-nextjs-y-react-native',
    articleTitle: 'Cómo medir y mejorar el rendimiento en web (Next.js) y en móvil (React Native)',
    prompt: `Llena esta plantilla para UNA sola pantalla (web o app). Puedes usar números reales si ya mediste, o dejar los huecos y describir exactamente cómo los obtendrías (herramienta, comando, condiciones). No inventes un Lighthouse de 100.

Pantalla:
Condiciones (dispositivo, red, build de producción o no, fecha):
Métrica de base:
Hipótesis:
Cambio (uno solo: RSC, imagen, lista virtualizada u otro concreto):
Métrica nueva:
Conclusión (si casi no se mueve, dilo):

La evidencia es la tabla (y, si tienes, una captura). No hace falta optimizar las dos plataformas a la vez.`,
    hint: `Pantalla: landing de horarios (web)
Condiciones: Next 16, npm run start, Chrome, red local
Hipótesis: el SDK de analítica se está yendo al bundle de la página
Cambio: el botón de reservar es el único Client Component`,
    solution: `Pantalla: landing de horarios (web)
Condiciones: Next 16, npm run start (producción local), Chrome, red local, 23 nov 2026
Métrica de base: tamaño JS de la ruta / según \`npm run build\`, más LCP en Lighthouse (se anotan los valores medidos, no un 100 inventado)
Hipótesis: posthog-js se está importando en la página y se va al bundle
Cambio: la lista queda como Server Component; solo BotonReservar es Client Component
Métrica nueva: se vuelve a correr \`npm run build\` y Lighthouse en las mismas condiciones
Conclusión: se escribe la diferencia. Si el LCP casi no se mueve, se dice «no hubo cambio apreciable»; el tamaño de JS sí puede bajar y eso también cuenta.

(Una tabla equivalente vale para la app, midiendo scroll o tiempo de apertura con React Native DevTools, y cambiando un .map en ScrollView por FlatList.)`,
  },
  {
    slug: 'crear-base-api-dotnet-bloqueo-de-cuenta',
    title: 'Bloqueo de cuenta tras intentos fallidos en .NET',
    summary:
      'Bloquea la cuenta 15 minutos después de cinco contraseñas incorrectas seguidas en la API base de .NET 10.',
    difficulty: 'practice',
    tags: ['dotnet', 'csharp', 'efcore', 'seguridad', 'crear-base-api'],
    language: 'C#',
    articleSlug: 'crear-base-api-dotnet',
    articleTitle: 'Crear base API: .NET 10 con EF Core, FluentValidation y MailKit',
    prompt: `Agrega a User las propiedades FailedLogins (int) y LockedUntil (DateTimeOffset?), con su migración. En LoginAsync: si la cuenta está bloqueada responde 401 con el mismo mensaje genérico; si la clave falla, suma un intento y al quinto bloquea 15 minutos; si entra bien, reinicia el contador. Escribe una prueba con un TimeProvider que puedas adelantar.`,
    hint: `Pon la lógica en métodos del dominio (RegisterFailedLogin, ResetFailedLogins, IsLocked) para que el servicio siga delgado. Para la prueba, una clase que herede de TimeProvider con un campo Now modificable.`,
    solution: `// User.cs
public int FailedLogins { get; private set; }
public DateTimeOffset? LockedUntil { get; private set; }

public bool IsLocked(DateTimeOffset now) => LockedUntil is not null && LockedUntil > now;

public void RegisterFailedLogin(DateTimeOffset now)
{
    FailedLogins++;
    if (FailedLogins >= 5) { LockedUntil = now.AddMinutes(15); FailedLogins = 0; }
    UpdatedAt = now;
}

public void ResetFailedLogins() { FailedLogins = 0; LockedUntil = null; }

// AuthService.LoginAsync
var now = clock.GetUtcNow();
var user = await users.FindByEmailAsync(email, ct);
if (user is null) throw DomainException.InvalidCredentials();
if (user.IsLocked(now)) throw DomainException.InvalidCredentials();
if (!hasher.Verify(req.Password, user.PasswordHash))
{
    user.RegisterFailedLogin(now);
    await users.UpdateAsync(user, ct);
    throw DomainException.InvalidCredentials();
}
user.ResetFailedLogins();
await users.UpdateAsync(user, ct);

// AppDbContext: e.Property(x => x.FailedLogins).HasColumnName("failed_logins");
//               e.Property(x => x.LockedUntil).HasColumnName("locked_until");
// dotnet ef migrations add AccountLockout -p src/BaseApi.Infrastructure -s src/BaseApi.Api`,
  },
  {
    slug: 'crear-base-api-contrato-resend-verification',
    title: 'Diseña el endpoint resend-verification',
    summary:
      'Agrega al contrato OpenAPI y a e2e.sh un endpoint que reenvía el correo de verificación sin revelar qué cuentas existen.',
    difficulty: 'warmup',
    tags: ['api', 'openapi', 'seguridad', 'crear-base-api'],
    language: 'YAML',
    articleSlug: 'crear-base-api-introduccion',
    articleTitle: 'Crear base API: el diseño común (DDD, DI, JWT y correo)',
    prompt:
      'Agrega a openapi.yaml la ruta POST /api/v1/auth/resend-verification. Recibe {email} y debe responder igual exista o no la cuenta. Después agrega a e2e.sh un paso que registre un usuario, llame al endpoint y compruebe en Mailpit que llegaron dos correos de bienvenida.',
    hint: 'Copia la forma de forgot-password: mismo cuerpo, mismo 202. Para contar correos en Mailpit, la búsqueda devuelve messages_count.',
    solution: `# openapi.yaml (dentro de paths)
  /api/v1/auth/resend-verification:
    post:
      tags: [auth]
      summary: Reenvía el correo de verificación
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/EmailRequest' }
      responses:
        '202': { description: Aceptado (exista o no la cuenta) }
        '400': { $ref: '#/components/responses/Problem' }

# e2e.sh (después del registro)
expect "$(status POST /api/v1/auth/resend-verification "{\\"email\\":\\"$EMAIL\\"}")" 202 "reenviar verificación"
sleep 1
COUNT=$(curl -s "$MAIL/api/v1/search?query=to:$EMAIL%20subject:confirma" | jq .messages_count)
[ "$COUNT" = "2" ] && ok "llegaron dos correos" || fail "esperaba 2 correos y hay $COUNT"`,
  },
  {
    slug: 'crear-base-api-express-rate-limit-login',
    title: 'Frena los ataques de fuerza bruta al login',
    summary:
      'Agrega un límite de intentos por IP a /login en la API base de Express, con respuesta Problem Details.',
    difficulty: 'practice',
    tags: ['express', 'typescript', 'seguridad', 'crear-base-api'],
    language: 'TypeScript',
    articleSlug: 'crear-base-api-node-express',
    articleTitle: 'Crear base API: Node.js y TypeScript con Express 5',
    prompt:
      'Escribe un middleware rateLimit(max, windowMs) sin librerías externas que cuente las peticiones por IP en una ventana de tiempo. Aplícalo solo a POST /login con 5 intentos por minuto. Al pasarse, responde 429 con Problem Details y la cabecera Retry-After en segundos.',
    hint: 'Un Map<string, { count: number; resetAt: number }> alcanza. La IP está en req.ip. Usa la misma forma de error que errorHandler.',
    solution: `import type { RequestHandler } from 'express';

export function rateLimit(max: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'desconocida';
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).type('application/problem+json').json({
        type: 'about:blank', title: 'Demasiadas peticiones', status: 429,
        detail: 'Espera un momento antes de volver a intentarlo',
      });
    }
    next();
  };
}

// routes.ts
r.post('/login', rateLimit(5, 60_000), validate(LoginSchema), async (req, res) => {
  res.json(await auth.login(req.body));
});`,
  },
];

export function challengeBySlug(slug: string): Challenge | undefined {
  return CHALLENGES.find((item) => item.slug === slug);
}
