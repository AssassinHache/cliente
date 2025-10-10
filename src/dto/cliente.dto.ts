// src/dto/cliente.dto.ts
export class SignInDto {
  usuario: string;
  password: string;

  constructor(usuario: string, password: string) {
    this.usuario = usuario;
    this.password = password;
  }
}
