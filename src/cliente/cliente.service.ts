// src/services/cliente.service.ts
import axios from 'axios';
import { SignInDto } from 'src/dto/cliente.dto';
import { RegistrarFacturaDto } from 'src/dto/facturacion.dto';
import { VentaDto } from 'src/dto/venta.dto';

export class ClienteService {
  // Base URL estrictamente desde .env
    private baseUrl: string;

    constructor(baseUrl?: string) {
      this.baseUrl = (baseUrl ?? (process.env.API_BASE_URL_LOCAL as string)) || '';
      if (!this.baseUrl || this.baseUrl.trim() === '') {
        throw new Error('Variable de entorno faltante: API_BASE_URL_LOCAL (o pasar baseUrl al constructor)');
    }
  }

  private accessToken: string;

  private logAxiosError(
    error: any,
    ctx: { op: string; url: string; payload?: Record<string, any> }
  ) {
    const status = error?.response?.status;
    const statusText = error?.response?.statusText;
    const data = error?.response?.data;
    const code = error?.code;
    console.error(
      `[${ctx.op}] ${ctx.url} failed${status ? ` (${status}${statusText ? ` ${statusText}` : ''})` : ''}${code ? ` code=${code}` : ''}: ${error?.message}`
    );
    if (ctx.payload) {
      console.error(`[${ctx.op}] payload:`, ctx.payload);
    }
    if (data !== undefined) {
      console.error(`[${ctx.op}] response:`, data);
    } else if (error?.request) {
      console.error(`[${ctx.op}] no response received (network/timeout)`);
    }
  }

  // Hacer login y guardar token
  async login(dto: SignInDto): Promise<string> {
    const url = `${this.baseUrl}/auth/signin`;
    try {
      const res = await axios.post(url, dto);
      this.accessToken = res.data.data.accessToken;
      return this.accessToken;
    } catch (error: any) {
      // No loguear credenciales
      this.logAxiosError(error, { op: 'login', url });
      throw error;
    }
  }

  getToken(): string {
    if (!this.accessToken) {
      throw new Error('No hay token disponible. Llama a login primero.');
    }
    return this.accessToken;
  }

  async crearVenta(ventaData: VentaDto) {
    const url = `${this.baseUrl}/ventas`;
    try {
      const response = await axios.post(url, ventaData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error: any) {
      // Loguear contexto mínimo de la venta, no todo el objeto
      const payload = {
        clienteId: ventaData?.clienteId,
        puntoVentaId: ventaData?.puntoVentaId,
        codigoDocumentoSectorSin: ventaData?.codigoDocumentoSectorSin,
        montoTotal: ventaData?.montoTotal,
        detalleItems: ventaData?.detalle?.length,
      } as Record<string, any>;
      this.logAxiosError(error, { op: 'crearVenta', url, payload });
      throw error;
    }
  }
  async facturarVenta(facturaData: RegistrarFacturaDto) {
    const url = `${this.baseUrl}/facturacion/registrar`;
    try {
      const response = await axios.post(url, facturaData, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      return response.data;
    } catch (error: any) {
      const payload = { ventaId: (facturaData as any) };
      this.logAxiosError(error, { op: 'facturarVenta', url, payload });
      throw error;
    }
  }

  async registrarFacturaDirecto(ventaFacturaData: any) {
    const url = `${this.baseUrl}/facturacion/registrar-directo`;
    try {
      const response = await axios.post(url, ventaFacturaData, {
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data; // se espera RestResponseDto<Factura>
    } catch (error: any) {
      const payload = {
        clienteId: ventaFacturaData?.clienteId,
        puntoVentaId: ventaFacturaData?.puntoVentaId,
        detalleItems: Array.isArray(ventaFacturaData?.detalle)
          ? ventaFacturaData.detalle.length
          : undefined,
        numero: ventaFacturaData?.numero,
        idEventoSignificativo: ventaFacturaData?.idEventoSignificativo,
        idCafc: ventaFacturaData?.idCafc,
      } as Record<string, any>;
      this.logAxiosError(error, { op: 'registrarFacturaDirecto', url, payload });
      throw error;
    }
  }
async getFacturaById(facturaId: number) {
  const url = `${this.baseUrl}/facturacion/${facturaId}`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
      params: {},
    });
    return response.data.data;
  } catch (error: any) {
    this.logAxiosError(error, { op: 'getFacturaById', url });
    return null;
  }
}

// cliente.service.ts
async getVentaById(ventaId: number, include: string[] = []) {
  const url = `${this.baseUrl}/ventas/${ventaId}`;
  try {
    const params: Record<string, any> = {};
    if (include.length > 0) {
      params.include = include.join(',');
    }

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
      params,
    });

    return response.data.data;
  } catch (error: any) {
    this.logAxiosError(error, { op: 'getVentaById', url });
    return null;
  }
}


  async crearNotaDebitoCredito(notaData: any) {
    const url = `${this.baseUrl}/documento-ajuste/credito-debito`;
    try {
      const response = await axios.post(url, notaData, {
        headers: { Authorization: `Bearer ${this.getToken()}` },
      });
      return response.data.data;
    } catch (error: any) {
      const payload = {
        facturaId: notaData?.facturaId,
        detalleItems: Array.isArray(notaData?.detalle) ? notaData.detalle.length : undefined,
      };
      this.logAxiosError(error, { op: 'crearNotaDebitoCredito', url, payload });
      throw error;
    }
  }
  async anularNotaDebitoCredito(id: number) {
    const url = `${this.baseUrl}/documento-ajuste/credito-debito/${id}/anular`;
    try {
      const response = await axios.post(
        url,
        { codigoMotivoAnulacion: 2 },
        {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        }
      );
      return response.data.data;
    } catch (error: any) {
      this.logAxiosError(error, { op: 'anularNotaDebitoCredito', url, payload: { id } });
      throw error;
    }
  }

  async revertirNotaDebitoCredito(id: number) {
    const url = `${this.baseUrl}/documento-ajuste/credito-debito/${id}/revertir`;
    try {
      const response = await axios.post(
        url,
        {},
        {
          headers: { Authorization: `Bearer ${this.getToken()}` },
        }
      );
      return response.data.data;
    } catch (error: any) {
      this.logAxiosError(error, { op: 'revertirNotaDebitoCredito', url, payload: { id } });
      throw error;
    }
  }


}
