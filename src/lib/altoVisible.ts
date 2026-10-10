/**
 * Mantiene `--alto-visible` con el alto de pantalla realmente disponible.
 *
 * Cuando se abre el teclado del celular, el viewport contra el que miden
 * `dvh` y los elementos fijos no cambia: el teclado se dibuja encima. Los
 * paneles seguían midiendo contra la pantalla entera y la lista de productos
 * terminaba debajo del teclado, invisible.
 *
 * El meta `interactive-widget=resizes-content` lo resuelve en Chrome y
 * derivados, pero Safari no lo implementa. `visualViewport` sí está en todos
 * lados y da el dato exacto, así que esto cubre el resto.
 */
export function seguirAltoVisible(): () => void {
  const vv = window.visualViewport

  const aplicar = () => {
    const alto = vv?.height ?? window.innerHeight
    document.documentElement.style.setProperty('--alto-visible', `${Math.round(alto)}px`)
  }

  aplicar()
  vv?.addEventListener('resize', aplicar)
  window.addEventListener('resize', aplicar)
  window.addEventListener('orientationchange', aplicar)

  return () => {
    vv?.removeEventListener('resize', aplicar)
    window.removeEventListener('resize', aplicar)
    window.removeEventListener('orientationchange', aplicar)
  }
}
