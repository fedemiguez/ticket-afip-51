# Ticket AFIP 51mm

Proyecto **independiente** y enfocado en un solo problema: tomar una factura PDF emitida en ARCA/AFIP (formato A4) y **reestructurarla** en un ticket térmico de 51mm con logo y datos comerciales personalizados.

No reescala el PDF original. Lee los datos fiscales, reconstruye el QR ARCA y arma un layout nuevo optimizado para impresora térmica.

## Qué hace

1. Subís el PDF de la factura generada en la app ARCA.
2. La app extrae texto fiscal: CAE, CUIT, importes, número de comprobante, etc.
3. Detecta la URL del QR o la reconstruye con los datos del CAE.
4. Genera una vista previa de ticket 51mm con tu logo y datos comerciales.
5. Imprimís directamente desde el navegador.

## Qué NO es obligatorio del PDF A4

Según la normativa AFIP/ARCA:

- El **código QR** es **obligatorio** en comprobantes electrónicos (RG 4291 y actualizaciones).
- El **código de barras tradicional** es **opcional** para facturas electrónicas; desde 2021 fue reemplazado en la práctica por el QR.

Por eso este proyecto prioriza extraer/regenerar el **QR**, no copiar la hoja A4 entera.

## Desarrollo

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Impresión

- Configurá tu impresora térmica a 51mm (o el ancho que uses).
- Usá el botón **Imprimir** en la vista previa.
- Si el QR no se detecta automáticamente, podés pegar manualmente la URL del QR del PDF.

## Próximos pasos posibles

- Mejorar parsers para formatos específicos de la app ARCA.
- Exportar ESC/POS nativo.
- Guardar plantillas de ticket por comercio.
