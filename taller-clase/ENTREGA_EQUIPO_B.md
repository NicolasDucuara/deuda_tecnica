# Entrega — Equipo B: envío express VIP

## Ronda 1: funcionalidad
- Para pedidos locales VIP cuyo subtotal original supera USD 150, la tarifa de envío es USD 1.50.
- Para pedidos internacionales VIP, se descuentan USD 10 de la tarifa agrupada de envío/aduanas, sin permitir un valor negativo.
- Los pedidos regulares mantienen las reglas de envío existentes.
- Commit sugerido: `feat: logica envio express vip`.

**Limitación heredada:** el servicio original no separa el costo de transporte del costo de aduanas; ambos están representados por una única variable `shipping`. Por eso, el subsidio de USD 10 se aplica a esa tarifa agrupada. En una solución de producción conviene modelar `customsCost` y `shippingCost` por separado.

## Ronda 2: intercambio e integración
La integración con `feature/descuentos-flash` debe realizarse cuando la rama del Equipo A esté disponible. Ambas funcionalidades modifican la zona de descuentos/envío del mismo archivo, por lo que se debe resolver cualquier conflicto conservando las dos reglas y ejecutar `npm run simulate` y `npm test`. Esta entrega no crea ni simula una rama del Equipo A.

## Ronda 3: saneamiento
- Se renombraron variables crípticas a nombres de dominio y se separaron validación, descuentos, cálculo de impuestos/envío, reserva y reversión de inventario.
- La entrada no se modifica; el inventario se reserva solo después de validar el pedido y el pago.
- La configuración es constante e inmutable (`CONFIG`).
- Se agregaron pruebas de caracterización/regresión con `node:test` para envíos VIP, tarifas regulares, stock, tarjeta inválida, no mutación de la entrada y líneas repetidas.

## Preguntas de discusión

### 1. ¿Cuánto tiempo se perdió entendiendo variables de una letra?
Las variables `x`, `d` y `aux` no explican su propósito. El desarrollador debe rastrear cada asignación y uso, lo que retrasa el cambio y aumenta el riesgo de alterar una regla no relacionada. Los nombres `orderRequest`, `discountAmount` y `legacyCode` hacen explícita la intención.

### 2. ¿Por qué el merge falla dramáticamente?
Los dos equipos cambian el mismo archivo monolítico, donde descuentos, inventario, pagos y envío están acoplados. Git puede detectar conflictos textuales, pero no detecta conflictos semánticos: una resolución puede compilar y aun así borrar la regla del otro equipo. Separar responsabilidades en módulos pequeños, acompañar cambios con pruebas y revisar el diff reduce el riesgo.

### 3. ¿Cómo ayudan las pruebas de caracterización?
Registran resultados esperados para entradas representativas y permiten comparar el comportamiento antes y después de refactorizar. Detectan regresiones en descuentos, impuestos, tarifas, inventario y errores de pago. Deben cubrir casos normales, límites y fallos, y ejecutarse después de cada cambio.

## Ejecución
Desde `taller-clase/`:

```bash
npm run simulate
npm test
```
