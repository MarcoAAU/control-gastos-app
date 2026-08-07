/**
 * Descarga un texto como archivo.
 *
 * Estaba escrito a mano dentro de `SettingsScreen`. Al necesitarlo también
 * Reportes, se extrae: son seis líneas, pero dos de ellas son fáciles de
 * olvidar y el fallo que producen no se ve.
 *
 * · `revokeObjectURL` — sin él el blob se queda en memoria hasta recargar la
 *   página. Exportar diez veces seguidas deja diez copias del archivo
 *   retenidas, y en un móvil eso se nota.
 * · `charset=utf-8` en el tipo MIME — sin declararlo, algunos programas leen
 *   el archivo en la codificación del sistema y las tildes salen rotas.
 *
 * El `<a>` no se añade al documento a propósito: `click()` funciona sobre un
 * elemento desconectado en todos los navegadores actuales, y así no hay nada
 * que limpiar del DOM si algo falla en medio.
 */
export function downloadTextFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
