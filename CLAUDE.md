# Valera Sport: reglas del proyecto

## Versión del sistema (admin.html)

El panel tiene un apartado **Versión** que muestra la versión actual y el historial de cambios.
Los datos viven en `HISTORIAL_VERSIONES` dentro de `admin.html` (la primera entrada es la versión actual).

**Cada vez que se haga un cambio en `admin.html`, antes de terminar hay que subir la versión.**
No se edita `HISTORIAL_VERSIONES` a mano: se usa el script de la raíz del proyecto.

```
node subir-version.js <novedad|mejora|arreglo> "Título corto" "Qué cambió 1" "Qué cambió 2"
```

- `novedad`: función nueva (sube el número del medio: 1.2.1 -> 1.3.0)
- `mejora`: ajuste o mejora de algo que ya existe (sube el último: 1.2.1 -> 1.2.2)
- `arreglo`: corrección de un error (sube el último: 1.2.1 -> 1.2.2)

Reglas para los textos:
- En español, cortos y claros, escritos para quien usa el panel (sin términos técnicos).
- Una línea por cosa que cambió, contando lo que se nota, no cómo se hizo.
- Un solo comando por cambio completo (no uno por cada archivo tocado).
- Después de correrlo, avisar en una frase qué versión quedó (por ejemplo: "Quedó la v1.2.2").
