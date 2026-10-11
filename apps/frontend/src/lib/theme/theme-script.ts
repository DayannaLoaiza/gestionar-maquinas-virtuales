import {
  DARK_CLASS,
  DARK_SCHEME_QUERY,
  DEFAULT_THEME_PREFERENCE,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
} from './theme-preference';

const literal = (value: unknown): string => JSON.stringify(value);

/**
 * Script inline del `<head>` del layout raíz (RF-app-shell-07). Corre antes del primer pintado y
 * pone la clase `dark` en `<html>` según la preferencia guardada, o según el sistema operativo si
 * es "system", falta o no es válida. Así la página nunca muestra primero el otro tema, aunque el
 * JavaScript de la app tarde en cargar.
 *
 * Es un string de JS plano (ES5, sin dependencias) y no `funcion.toString()`: el test ejecuta
 * exactamente el código que se envía, sin depender de lo que el compilador haga con una función.
 * Solo interpola constantes del código, nunca datos del usuario. Ante cualquier error (sin
 * `localStorage`, sin `matchMedia`) deja la página como está, en tema claro.
 */
export const THEME_INIT_SCRIPT = `(function () {
  var preference = ${literal(DEFAULT_THEME_PREFERENCE)};
  try {
    var stored = window.localStorage.getItem(${literal(THEME_STORAGE_KEY)});
    if (${literal(THEME_PREFERENCES)}.indexOf(stored) !== -1) preference = stored;
  } catch (error) {}
  try {
    var isDark =
      preference === 'dark' ||
      (preference === 'system' && window.matchMedia(${literal(DARK_SCHEME_QUERY)}).matches);
    document.documentElement.classList.toggle(${literal(DARK_CLASS)}, isDark);
  } catch (error) {}
})();`;
