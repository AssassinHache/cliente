export type VentasTipo = 'normal' | 'hospital';

export interface AppConfig {
  baseUrls: {
    local?: string;
    prod?: string;
    runLocal: boolean;
    runProd: boolean;
  };
  auth: {
    usuario: string;
    password: string;
  };
  ventas: {
    run: boolean;
    tipo: VentasTipo;
    contingencia: boolean;
    facturaDirecta: boolean;
    cantidad: number;
    productoMin: number;
    productoMax: number;
    clienteId: number;
    sucursalId: number;
    puntoVentaId: number;
    codActEcon: number;
    codMetodoPago: number;
    codMoneda: number;
    pacienteNombre?: string;
    medico?: {
      especialidad: string;
      especialidadDetalle: string;
      nroQuirofano: number;
      nombre: string;
      nit: number;
      matricula: string;
    };
  };
  contingencia: {
    fechaIni?: string;
    fechaFin?: string;
    eventoSinId?: number;
    cafcId?: number;
  };
  notas: {
    run: boolean;
    cantidad: number;
    facturaInicio: number;
    facturaFin: number;
    productoMin: number;
    productoMax: number;
    anular: boolean;
    revertir: boolean;
    reintentos: number;
    retrasoMs: number;
  };
}

function parseString(name: string, required = true): string | undefined {
  const v = process.env[name];
  if (required && (!v || v.trim() === '')) {
    throw new Error(`Variable de entorno faltante: ${name}`);
  }
  return v;
}

function parseNumber(name: string, required = true): number | undefined {
  const s = parseString(name, required);
  if (s === undefined) return undefined;
  const n = Number(s);
  if (Number.isNaN(n)) throw new Error(`Variable de entorno inválida (número esperado): ${name}`);
  return n;
}

function parseBool(name: string, defaultVal = false): boolean {
  const v = parseString(name, false);
  if (v === undefined) return defaultVal;
  const l = v.toLowerCase();
  return l === 'true' || l === '1' || l === 'yes';
}

export function loadConfig(): AppConfig {
  const baseUrls = {
    local: process.env.API_BASE_URL_LOCAL,
    prod: process.env.API_BASE_URL_PROD || process.env.API_BASE_URL,
    runLocal: parseBool('RUN_CLIENTE_LOCAL', false),
    runProd: parseBool('RUN_CLIENTE_PROD', false),
  };

  const auth = {
    usuario: parseString('CLIENTE_USUARIO')!,
    password: parseString('CLIENTE_PASSWORD')!,
  };

  const tipoRaw = (parseString('VENTAS_TIPO') as VentasTipo) || 'normal';
  if (tipoRaw !== 'normal' && tipoRaw !== 'hospital') {
    throw new Error('VENTAS_TIPO debe ser "normal" o "hospital"');
  }

  const ventas: AppConfig['ventas'] = {
    run: parseBool('RUN_VENTAS', false),
    tipo: tipoRaw,
    contingencia: parseBool('VENTAS_CONTINGENCIA', false),
    facturaDirecta: parseBool('VENTAS_FACTURA_DIRECTA', true),
    cantidad: parseNumber('VENTAS_CANTIDAD')!,
    productoMin: parseNumber('VENTA_PRODUCTO_MIN')!,
    productoMax: parseNumber('VENTA_PRODUCTO_MAX')!,
    clienteId: parseNumber('CLIENTE_ID')!,
    sucursalId: parseNumber('SUCURSAL_ID')!,
    puntoVentaId: parseNumber('PUNTO_VENTA_ID')!,
    codActEcon: parseNumber('COD_ACT_ECON')!,
    codMetodoPago: parseNumber('COD_MET_PAGO')!,
    codMoneda: parseNumber('COD_MONEDA')!,
    pacienteNombre: parseString('PACIENTE_NOMBRE', false),
  };

  if (ventas.tipo === 'hospital') {
    ventas.medico = {
      especialidad: parseString('MEDICO_ESPECIALIDAD')!,
      especialidadDetalle: parseString('MEDICO_ESPECIALIDAD_DETALLE')!,
      nroQuirofano: parseNumber('MEDICO_NRO_QUIROFANO')!,
      nombre: parseString('MEDICO_NOMBRE')!,
      nit: parseNumber('MEDICO_NIT')!,
      matricula: parseString('MEDICO_MATRICULA')!,
    };
  }

  const contingencia = {
    fechaIni: process.env.FECHA_CONT_INI,
    fechaFin: process.env.FECHA_CONT_FIN,
    eventoSinId: parseNumber('EVENTO_SIN_ID', false),
    cafcId: parseNumber('CAFC_ID', false),
  };

  const notas = {
    run: parseBool('RUN_NOTAS', false),
    cantidad: parseNumber('NOTAS_CANTIDAD')!,
    facturaInicio: parseNumber('NOTAS_FACTURA_INICIO')!,
    facturaFin: parseNumber('NOTAS_FACTURA_FIN')!,
    productoMin: parseNumber('NOTAS_PRODUCTO_MIN')!,
    productoMax: parseNumber('NOTAS_PRODUCTO_MAX')!,
    anular: parseBool('NOTAS_ANULAR', false),
    revertir: parseBool('NOTAS_REVERTIR', false),
    reintentos: parseNumber('NOTAS_REINTENTOS', false) ?? 3,
    retrasoMs: parseNumber('NOTAS_RETRASO_MS', false) ?? 2000,
  };

  return { baseUrls, auth, ventas, contingencia, notas };
}
