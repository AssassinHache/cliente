// src/dto/venta.dto.ts
export class DetalleVentaDto {
  codigoActividadSin: number;
  productoId: number;
  cantidad: number;
  montoDescuento?: number;
  subTotal: number;
  numeroSerie?: string;
  numeroImei?: string;
  datosExtra?: Record<string, any>;
  especialidad
  especialidadDetalle
  nroQuirofanoSalaOperaciones
  especialidadMedicoa
  nombreApellidoMedico
  nitDocumentoMedico
  nroMatriculaMedico
  nroFacturaMedico
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  constructor(data?: Partial<DetalleVentaDto>) {
    Object.assign(this, data);
  }
}

export class VentaDto {
  id?: number;
  clienteId: number;
  sucursalId: number;
  puntoVentaId?: number;
  codigoDocumentoSectorSin: number;
  codigoActividadEconomicaSin: number;
  codigoMetodoPagoSin: number;
  codigoMonedaSin: number;
  tipoCambioSin: number;
  numeroTarjeta?: number;
  montoTotal: number;
  montoTotalMoneda?: number;
  activo?: boolean;
  paciente: string;
  facturada: boolean;
  fechaEmision?: string | Date;
  montoGiftCard?: number;
  descuentoAdicional?: number;
  codigoExcepcion?: number;
  modalidadServicio?: string;
  detalle: DetalleVentaDto[];

  constructor(data?: Partial<VentaDto>) {
    if (data?.detalle && Array.isArray(data.detalle)) {
      this.detalle = data.detalle.map((d) => new DetalleVentaDto(d));
    }
    Object.assign(this, data);
  }
}
