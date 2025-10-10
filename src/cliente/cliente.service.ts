// src/services/cliente.service.ts
import axios from 'axios';
import { SignInDto } from 'src/dto/cliente.dto';
import { RegistrarFacturaDto } from 'src/dto/facturacion.dto';
import { VentaDto } from 'src/dto/venta.dto';
import { NotaDebitoCreditoDto } from 'src/dto/nota-debito-credito.dto';

export class ClienteService {
  private baseUrl = 'http://localhost:4000/api/v1';
  // private baseUrl = 'https://www.facturacion.oncoclinicbolivia.com/api/v1'; 

  private accessToken: string;

  // Hacer login y guardar token
  async login(dto: SignInDto): Promise<string> {
    const res = await axios.post(`${this.baseUrl}/auth/signin`, dto);
    this.accessToken = res.data.data.accessToken;
    return this.accessToken;
  }

  getToken(): string {
    if (!this.accessToken) {
      throw new Error('No hay token disponible. Llama a login primero.');
    }
    return this.accessToken;
  }

  async crearVenta(ventaData: VentaDto) {
    try {
      const response = await axios.post(`${this.baseUrl}/ventas`, ventaData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error al crear la venta:', error.response?.data || error.message);
      throw error;
    }
  }
  async facturarVenta(facturaData: RegistrarFacturaDto) {
  const response = await axios.post(
    `${this.baseUrl}/facturacion/registrar`,
    facturaData,
    {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    },
  );
  return response.data;
  }
async getFacturaById(facturaId: number) {
  try {
    const response = await axios.get(`${this.baseUrl}/facturacion/${facturaId}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
      params: {}, // vacíos si no necesitas include
    });
    return response.data.data; // devuelve solo la factura
  } catch (error: any) {
    console.error(`Error al obtener factura ${facturaId}:`, error.response?.data || error.message);
    return null;
  }
}

// cliente.service.ts
async getVentaById(ventaId: number, include: string[] = []) {
  try {
    const params: Record<string, any> = {};
    if (include.length > 0) {
      params.include = include.join(','); // ?include=detalle
    }

    const response = await axios.get(`${this.baseUrl}/ventas/${ventaId}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
      params,
    });

    return response.data.data;
  } catch (error: any) {
    console.error(`Error al obtener venta ${ventaId}:`, error.response?.data || error.message);
    return null;
  }
}


  async crearNotaDebitoCredito(notaData: any) {
    try {
      const response = await axios.post(`${this.baseUrl}/documento-ajuste/credito-debito`, notaData, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Error al crear nota de débito/crédito:', error.response?.data || error.message);
      throw error;
    }
  }
  async anularNotaDebitoCredito(id: number) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/documento-ajuste/credito-debito/${id}/anular`,
        { codigoMotivoAnulacion: 2 },
        {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        }
      );
      return response.data.data;
    } catch (error: any) {
      console.error(
        `Error al anular nota ${id}:`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async revertirNotaDebitoCredito(id: number) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/documento-ajuste/credito-debito/${id}/revertir`,
        {},
        {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        }
      );
      return response.data.data;
    } catch (error: any) {
      console.error(
        `Error al revertir nota ${id}:`,
        error.response?.data || error.message
      );
      throw error;
    }
  }


}
