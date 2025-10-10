// src/dto/factura.dto.ts
export class RegistrarFacturaDto {
  ventaId: number;
  idEventoSignificativo: number;
  idCafc: number;
  fechaEmision: string;
  numero: number;

  constructor(ventaId: number) {
    this.ventaId = ventaId;
  }
}
