// src/main.ts
import { ClienteService } from './cliente/cliente.service';
import { SignInDto } from './dto/cliente.dto';
import { VentaDto, DetalleVentaDto } from './dto/venta.dto';
import { RegistrarFacturaDto } from './dto/facturacion.dto';
import { NotaDebitoCreditoDto } from './dto/nota-debito-credito.dto';

function fechaAleatoriaEntre(inicio: string, fin: string): string {
  const start = new Date(inicio).getTime();
  const end = new Date(fin).getTime();
  const fechaRandom = new Date(start + Math.random() * (end - start));
  return fechaRandom.toISOString();
}

function idProductoAleatorio(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Procesa ventas y facturación
async function procesarVentas(
  clienteService: ClienteService,
  tipoVenta: 'normal' | 'hospital',
  contingencia: boolean
) {
  const productoIdMin = 31;
  const productoIdMax = 33;

  const cantidad = 500;
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

    // Si es venta hospital
    if (tipoVenta === 'hospital') {
      codigoDocumentoSectorSin = 17;
      modalidadServicio = 'Hospitalización';
      Object.assign(detalleData, {
        especialidad: 'Cardiología',
        especialidadDetalle: 'Procedimiento de cateterismo',
        nroQuirofanoSalaOperaciones: 12,
        especialidadMedico: 'Cardiología',
        nombreApellidoMedico: 'Juan Pérez',
        nitDocumentoMedico: 6144520017,
        nroMatriculaMedico: '987654',
        nroFacturaMedico: numeroFactura,
      });
    }

    const venta = new VentaDto({
      clienteId: 1,
      sucursalId: 0,
      puntoVentaId: 3,
      codigoDocumentoSectorSin,
      codigoActividadEconomicaSin: 6201000,
      codigoMetodoPagoSin: 1,
      codigoMonedaSin: 1,
      tipoCambioSin: 1,
      montoTotal: Math.floor(Math.random() * 5000) + 500,
      facturada: true,
      modalidadServicio,
      detalle: [new DetalleVentaDto(detalleData)],
    });

    try {
      const ventaResponse = await clienteService.crearVenta(venta);
      const ventaId = ventaResponse.data?.id;
      console.log(`Venta ${i} creada:`, ventaId || 'OK');

      if (ventaId) {
        const facturaData = new RegistrarFacturaDto(ventaId);

    
        if (contingencia) {
          
          facturaData.fechaEmision = fechaAleatoriaEntre(
          '2025-10-06T12:22:01',
          '2025-10-06T12:40:59'
          );
        facturaData.numero = numeroFactura;
          facturaData.idEventoSignificativo = 115; // Ejemplo de evento significativo
          facturaData.idCafc = 5  ; // Ejemplo de CAFC en contingencia
          console.log(`Facturando venta ${ventaId} en contingencia con número de factura ${facturaData.numero}...`);
        } else {
          console.log(`Facturando venta ${ventaId} normalmente...`);
        }

        await clienteService.facturarVenta(facturaData);
        console.log(`Venta ${ventaId} facturada correctamente.`);
      }
    } catch (err: any) {
      console.error(`Error venta/factura ${i}:`, err);
    }
  }
}

// Función para generar notas de débito/crédito automáticamente
async function procesarNotas(
  clienteService: ClienteService,
  cantidadNotas: number,        
  facturaIdInicio: number,      
  facturaIdFin: number,         
  productoIdMin: number,        
  productoIdMax: number         
) {
  let notasGeneradas = 0;

  for (let facturaId = facturaIdFin; facturaId >= facturaIdInicio; facturaId--) {
    if (notasGeneradas >= cantidadNotas) break;

    try {
      // 1️⃣ Obtener la factura
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

      // 2️⃣ Obtener la venta con sus detalles
      const ventaResp = await clienteService.getVentaById(ventaId, ['detalle']);
      if (!ventaResp?.detalle || ventaResp.detalle.length === 0) {
        console.log(`Venta ${ventaId} de factura ${facturaId} no tiene detalles, saltando...`);
        continue;
      }

      // 3️⃣ Filtrar los productos válidos
      const detallesFiltrados = ventaResp.detalle
        .filter((d: any) => d.productoId >= productoIdMin && d.productoId <= productoIdMax)
        .map((d: any) => ({
          productoId: d.productoId,
          cantidad: Number(d.cantidad) || 1,
        }));

      if (detallesFiltrados.length === 0) {
        console.log(`Factura ${facturaId} no tiene productos dentro del rango [${productoIdMin}-${productoIdMax}], saltando...`);
        continue;
      }

      // 4️⃣ Crear la nota
      const notaData = new NotaDebitoCreditoDto({
        facturaId,
        detalle: detallesFiltrados,
      });

      const notaResp = await clienteService.crearNotaDebitoCredito(notaData);
      const notaId = notaResp?.id || notaResp?.data?.id;

      if (!notaId) {
        console.log(`No se pudo obtener el ID de la nota para factura ${facturaId}, saltando...`);
        continue;
      }

      console.log(`✅ Nota creada para factura ${facturaId}: ID ${notaId}`);

      // 5️⃣ Anular la nota
      await clienteService.anularNotaDebitoCredito(notaId);
      console.log(`🔄 Nota ${notaId} anulada correctamente.`);

      // 6️⃣ Revertir la nota
      await clienteService.revertirNotaDebitoCredito(notaId);
      console.log(` Nota ${notaId} revertida correctamente.`);

      notasGeneradas++;
    } catch (err: any) {
      console.error(` Error procesando factura ${facturaId}:`, err.response?.data || err.message);
      continue;
    }
  }

  console.log(` Proceso finalizado. Notas generadas: ${notasGeneradas}`);
}


async function bootstrap() {
  const clienteService = new ClienteService();
  const loginDto = new SignInDto('wall2', 'wall122');

  try {
    const token = await clienteService.login(loginDto);
    console.log('Login exitoso, token:', token);

    // await procesarVentas(clienteService, 'normal', false); 
    // await procesarVentas(clienteService, 'normal', true);  
    // await procesarVentas(clienteService, 'hospital', true); 
    // await procesarVentas(clienteService, 'hospital', false);  

    // Procesar notas de débito/crédito masivas
    await procesarNotas(
      clienteService,
      150,       // cantidad de notas a generar
      3100,     // id factura inicio
      38315 ,     // id factura fin
      31,        // productoId min
      33         // productoId max
    );

  } catch (err: any) {
    console.error('Error login o proceso:', err.response?.data?.message || err.message);
  }
}

bootstrap();

