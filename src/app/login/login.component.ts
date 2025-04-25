import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // 👈 Necesario para *ngIf
import { ethers } from 'ethers';

@Component({
  selector: 'app-login',
  standalone: true, // 👈 Esto lo convierte en standalone
  imports: [CommonModule], // 👈 Aquí se habilita *ngIf
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  address: string | null = null;
  balance: string | null = null;
  error: string | null = null;

  async connectWallet() {
    this.error = null;
    try {
      if (!window.ethereum) {
        this.error = 'MetaMask no está instalado';
        return;
      }

      // Conectar a la wallet de MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.address = accounts[0];

      // Obtener el saldo de ETH de la cuenta conectada
      const ethBalance = await provider.getBalance(this.address as string); // Asegúrate de usar 'as string' para evitar el error de tipo
      this.balance = ethers.formatEther(ethBalance); // Usar ethers.formatEther para obtener el balance en ETH

    } catch (err: any) {
      this.error = err.message;
      this.address = null;
      this.balance = null;
    }
  }
}
