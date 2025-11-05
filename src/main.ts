import 'dotenv/config';
import { ClienteService } from './cliente/cliente.service';
import { SignInDto } from './dto/cliente.dto';
import { loadConfig } from './config';
import { procesarVentas } from './flows/ventas';
import { procesarNotas } from './flows/notas';

async function ejecutarFlujoConCliente(clienteService: ClienteService, cfg: ReturnType<typeof loadConfig>) {
  const { usuario, password } = cfg.auth;
  const loginDto = new SignInDto(usuario, password);

  const token = await clienteService.login(loginDto);
  console.log('Login exitoso, token:', token);

  if (cfg.ventas.run) {
    console.log(`Ejecución de ventas: tipo=${cfg.ventas.tipo}, contingencia=${cfg.ventas.contingencia}, facturaDirecta=${cfg.ventas.facturaDirecta}`);
    await procesarVentas(clienteService, cfg);
  }

  if (cfg.notas.run) {
    console.log(
      `Ejecución de notas: cantidad=${cfg.notas.cantidad}, rangoFacturas=[${cfg.notas.facturaInicio}-${cfg.notas.facturaFin}], productos=[${cfg.notas.productoMin}-${cfg.notas.productoMax}], anular=${cfg.notas.anular}, revertir=${cfg.notas.revertir}`
    );
    await procesarNotas(clienteService, cfg);
  }
}

async function bootstrap() {
  try {
    const cfg = loadConfig();
    const runLocal = cfg.baseUrls.runLocal;
    const runProd = cfg.baseUrls.runProd;

    if (!runLocal && !runProd) {
      console.warn('No se seleccionó ningún cliente.');
    }

    if (runLocal) {
      const baseUrlLocal = cfg.baseUrls.local;
      if (!baseUrlLocal) throw new Error('url local faltante');
      const clienteLocal = new ClienteService(baseUrlLocal);
      console.log(`Usando cliente LOCAL: ${baseUrlLocal}`);
      await ejecutarFlujoConCliente(clienteLocal, cfg);
    }

    if (runProd) {
      const baseUrlProd = cfg.baseUrls.prod;
      if (!baseUrlProd) throw new Error('url faltante');
      const clienteProd = new ClienteService(baseUrlProd);
      console.log(`Usando cliente PROD: ${baseUrlProd}`);
      await ejecutarFlujoConCliente(clienteProd, cfg);
    }

  } catch (err: any) {
    console.error('Error login o proceso:', err.response?.data?.message || err.message);
  }
}

bootstrap();

