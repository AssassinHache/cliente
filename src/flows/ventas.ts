import { ClienteService } from '../cliente/cliente.service';
import { AppConfig } from '../config';
import { VentaDto, DetalleVentaDto } from '../dto/venta.dto';
import { RegistrarFacturaDto } from '../dto/facturacion.dto';

function fechaAleatoriaEntre(inicio: string, fin: string): string {
  const start = new Date(inicio).getTime();
  const end = new Date(fin).getTime();
  const fechaRandom = new Date(start + Math.random() * (end - start));
  return fechaRandom.toISOString();
}

function fechaEnvContingencia(cfg: AppConfig['contingencia']): string | undefined {
  const ini = cfg.fechaIni;
  const fin = cfg.fechaFin;
  const iniOk = !!ini && !Number.isNaN(new Date(ini).getTime());
  const finOk = !!fin && !Number.isNaN(new Date(fin).getTime());
  if (iniOk && finOk) {
    return fechaAleatoriaEntre(ini as string, fin as string);
  }
  return undefined;
}

function idProductoAleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function idClienteDesdeConfig(ventas: AppConfig['ventas']): number {
  if (ventas.clienteIdMin !== undefined && ventas.clienteIdMax !== undefined) {
    return idProductoAleatorio(ventas.clienteIdMin, ventas.clienteIdMax);
  }
  return ventas.clienteId as number;
}

export async function procesarVentas(
  clienteService: ClienteService,
  cfg: AppConfig
) {
  const { ventas, contingencia } = cfg;
  const productoIdMin = ventas.productoMin;
  const productoIdMax = ventas.productoMax;
  const cantidad = ventas.cantidad;

  for (let i = 1; i <= cantidad; i++) {
    const numeroFactura = ((i - 1) % 1000) + 1;
    const productoId = idProductoAleatorio(productoIdMin, productoIdMax);

    let codigoDocumentoSectorSin = 1; // normal
    let modalidadServicio: string | undefined = undefined;

    const detalleData: Partial<DetalleVentaDto> = {
      codigoActividadSin: 100 + Math.floor(Math.random() * 50),
      productoId,
      cantidad: Math.floor(Math.random() * 5) + 1,
      subTotal: Math.floor(Math.random() * 2000) + 100,
    };

    if (ventas.tipo === 'hospital' && ventas.medico) {
      codigoDocumentoSectorSin = 17;
      modalidadServicio = 'Hospitalización';
      Object.assign(detalleData, {
        especialidad: ventas.medico.especialidad,
        especialidadDetalle: ventas.medico.especialidadDetalle,
        nroQuirofanoSalaOperaciones: ventas.medico.nroQuirofano,
        especialidadMedico: ventas.medico.especialidad,
        nombreApellidoMedico: ventas.medico.nombre,
        nitDocumentoMedico: ventas.medico.nit,
        nroMatriculaMedico: ventas.medico.matricula,
        nroFacturaMedico: numeroFactura,
      });
    }

    const venta = new VentaDto({
      clienteId: idClienteDesdeConfig(ventas),
      sucursalId: ventas.sucursalId,
      puntoVentaId: ventas.puntoVentaId,
      codigoDocumentoSectorSin,
      codigoActividadEconomicaSin: ventas.codActEcon,
      codigoMetodoPagoSin: ventas.codMetodoPago,
      codigoMonedaSin: ventas.codMoneda,
      tipoCambioSin: 1,
      paciente: ventas.pacienteNombre,
      montoTotal: Math.floor(Math.random() * 5000) + 500,
      facturada: true,
      modalidadServicio,
      detalle: [new DetalleVentaDto(detalleData)],
    });

    try {
      if (ventas.facturaDirecta) {
        const ventaBase: any = {
          clienteId: venta.clienteId,
          sucursalId: venta.sucursalId,
          puntoVentaId: venta.puntoVentaId,
          codigoDocumentoSectorSin: venta.codigoDocumentoSectorSin,
          codigoActividadEconomicaSin: (venta as any).codigoActividadEconomicaSin,
          codigoMetodoPagoSin: (venta as any).codigoMetodoPagoSin,
          codigoMonedaSin: (venta as any).codigoMonedaSin,
          tipoCambioSin: (venta as any).tipoCambioSin,
          paciente: (venta as any).paciente,
          montoTotal: venta.montoTotal,
          facturada: true,
          modalidadServicio: venta.modalidadServicio,
          detalle: venta.detalle,
        };

        const facturaExtras: any = {};
        if (ventas.contingencia) {
          const fecha = fechaEnvContingencia(contingencia);
          if (fecha) {
            facturaExtras.fechaEmision = fecha;
          }
          facturaExtras.numero = numeroFactura;
          facturaExtras.idEventoSignificativo = contingencia.eventoSinId;
          facturaExtras.idCafc = contingencia.cafcId;
          console.log(`Registrando FACTURA DIRECTA en contingencia con número de factura ${facturaExtras.numero}...`);
        } else {
          console.log('Registrando FACTURA DIRECTA en modo normal...');
        }

        const ventaFacturaData = { ...ventaBase, ...facturaExtras };
        const resp = await clienteService.registrarFacturaDirecto(ventaFacturaData);
        const facturaId = resp?.data?.id ?? resp?.id;
        console.log(`Factura directa registrada correctamente. ID: ${facturaId ?? 'N/A'}`);
      } else {
        const ventaResponse = await clienteService.crearVenta(venta);
        const ventaId = ventaResponse.data?.id;
        console.log(`Venta ${i} creada:`, ventaId || 'OK');

        if (ventaId) {
          const facturaData = new RegistrarFacturaDto(ventaId);
          if (ventas.contingencia) {
            const fecha = fechaEnvContingencia(contingencia);
            if (fecha) {
              (facturaData as any).fechaEmision = fecha;
            }
            (facturaData as any).numero = numeroFactura;
            (facturaData as any).idEventoSignificativo = contingencia.eventoSinId;
            (facturaData as any).idCafc = contingencia.cafcId;
            console.log(`Facturando venta ${ventaId} en contingencia con número ${numeroFactura}...`);
          } else {
            console.log(`Facturando venta ${ventaId} normalmente...`);
          }

          await clienteService.facturarVenta(facturaData);
          console.log(`Venta ${ventaId} facturada correctamente.`);
        }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      console.error(
        `Error venta/factura ${i}${status ? ` (status ${status})` : ''}:`,
        data ?? err?.message ?? err
      );
    }
  }
}
