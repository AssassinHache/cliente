export class NotaDebitoCreditoDto {
  facturaId: number;
  detalle: { productoId: number; cantidad: number }[];

  constructor(data: Partial<NotaDebitoCreditoDto>) {
    Object.assign(this, data);
  }
}
