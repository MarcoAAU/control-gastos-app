import type { AppData } from '@/models';

/**
 * Una migración lleva los datos de una versión de esquema a la siguiente.
 *
 * La cadena se aplica en orden desde la versión detectada hasta
 * `CURRENT_SCHEMA_VERSION`. Añadir una v2→v3 en el futuro es crear un archivo,
 * registrarlo en el array y escribir su test — nada más.
 */
export interface Migration {
  from: number;
  to: number;
  description: string;
  /** Recibe `unknown` porque la forma de entrada es, por definición, la vieja. */
  run(input: unknown): MigrationOutcome;
}

export interface MigrationOutcome {
  data: AppData;
  /**
   * Incidencias no fatales, en lenguaje del usuario. Se guardan en
   * `meta.migrationWarnings` y se muestran una vez tras migrar.
   *
   * Una migración NUNCA aborta por un registro malo: descartar 400
   * movimientos buenos porque uno tiene el importe corrupto sería mucho peor
   * que perder ese uno y avisar.
   */
  warnings: string[];
}
