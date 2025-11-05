import { ClienteService } from '../cliente/cliente.service';
import { AppConfig } from '../config';
import { NotaDebitoCreditoDto } from '../dto/nota-debito-credito.dto';

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export async function procesarNotas(
  clienteService: ClienteService,
  cfg: AppConfig
) {
  const {
    cantidad: cantidadNotas,
    facturaInicio,
    facturaFin,
    productoMin,
    productoMax,
    anular,
    revertir,
    reintentos,
    retrasoMs,
  } = cfg.notas;

  let notasGeneradas = 0;
  for (let facturaId = facturaFin; facturaId >= facturaInicio; facturaId--) {
    if (notasGeneradas >= cantidadNotas) break;
    try {
      const facturaResp = await clienteService.getFacturaById(facturaId);
      if (!facturaResp) {
        console.log(`Factura ${facturaId} no encontrada, saltando...`);
        continue;
      }

      const ventaId = facturaResp.ventaId;
      if (!ventaId) {
        console.log(`Factura ${facturaId} no tiene venta asociada, saltando...`);
        continue;
      }

      const ventaResp = await clienteService.getVentaById(ventaId, ['detalle']);
      if (!ventaResp?.detalle || ventaResp.detalle.length === 0) {
        console.log(`Venta ${ventaId} de factura ${facturaId} no tiene detalles, saltando...`);
        continue;
      }

      const detallesFiltrados = ventaResp.detalle
        .filter((d: any) => d.productoId >= productoMin && d.productoId <= productoMax)
        .map((d: any) => ({ productoId: d.productoId, cantidad: Number(d.cantidad) || 1 }));

      if (detallesFiltrados.length === 0) {
        console.log(`Factura ${facturaId} no tiene productos dentro del rango [${productoMin}-${productoMax}], saltando...`);
        continue;
      }

      const notaResp = await clienteService.crearNotaDebitoCredito(
        new NotaDebitoCreditoDto({ facturaId, detalle: detallesFiltrados })
      );
      const notaId = notaResp?.id || notaResp?.data?.id;
      if (!notaId) {
        console.log(`No se pudo obtener el ID de la nota para factura ${facturaId}, saltando...`);
        continue;
      }
  console.log(`Nota creada para factura ${facturaId}: ID ${notaId}`);

      if (anular) {
        if (retrasoMs > 0) {
          console.log(`Esperando ${retrasoMs} ms antes del primer intento de anulación para nota ${notaId}...`);
          await sleep(retrasoMs);
        }
        let anulada = false;
        for (let intento = 1; intento <= reintentos; intento++) {
          try {
            await clienteService.anularNotaDebitoCredito(notaId);
            console.log(`Nota ${notaId} anulada correctamente (intento ${intento}/${reintentos}).`);
            anulada = true;
            break;
          } catch (e: any) {
            const errores = e?.response?.data?.errors;
            const codigo924 = Array.isArray(errores) && errores.some((er: any) => er?.codigo === 924);
            if (codigo924 && intento < reintentos) {
              console.warn(`Nota ${notaId}: SIN aún no reconoce el documento (código 924). Reintentando en ${retrasoMs} ms... (intento ${intento}/${reintentos})`);
              await sleep(retrasoMs);
              continue;
            }
            throw e;
          }
        }
        if (!anulada) {
          console.error(`No se pudo anular la nota ${notaId} tras ${reintentos} intentos. Se omite la reversión.`);
          continue;
        }
      } else {
  console.log(`Anulación omitida para nota ${notaId}.`);
      }

      if (revertir) {
        if (!anular) {
          console.warn(`Advertencia: revirtiendo nota ${notaId} sin haberla anulado antes.`);
        }
        if (retrasoMs > 0) {
          console.log(`Esperando ${retrasoMs} ms antes del primer intento de reversión para nota ${notaId}...`);
          await sleep(retrasoMs);
        }
        let revertida = false;
        for (let intento = 1; intento <= reintentos; intento++) {
          try {
            await clienteService.revertirNotaDebitoCredito(notaId);
            console.log(`Nota ${notaId} revertida correctamente (intento ${intento}/${reintentos}).`);
            revertida = true;
            break;
          } catch (e: any) {
            const errores = e?.response?.data?.errors;
            const codigo924 = Array.isArray(errores) && errores.some((er: any) => er?.codigo === 924);
            if (codigo924 && intento < reintentos) {
              console.warn(`Nota ${notaId}: SIN aún no reconoce el estado para revertir (código 924). Reintentando en ${retrasoMs} ms... (intento ${intento}/${reintentos})`);
              await sleep(retrasoMs);
              continue;
            }
            throw e;
          }
        }
        if (!revertida) {
          console.error(`No se pudo revertir la nota ${notaId} tras ${reintentos} intentos.`);
        }
      } else {
  console.log(`Reversión omitida para nota ${notaId}.`);
      }

      notasGeneradas++;
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error(
        ` Error procesando factura ${facturaId}${status ? ` (status ${status})` : ''}:`,
        data ?? err?.message ?? err
      );
      continue;
    }
  }

  console.log(`Proceso finalizado. Notas generadas: ${notasGeneradas}`);
}
