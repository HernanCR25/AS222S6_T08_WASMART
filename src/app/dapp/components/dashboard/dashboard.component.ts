import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WalletService, Network } from '../../services/wallet.service';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

export interface Contact {
  id: string;
  name: string;
  address: string;
  network?: string;
}

export interface Transaction {
  hash: string;
  direction: 'incoming' | 'outgoing';
  address: string;
  amount: number;
  date: Date;
  status: 'confirmed' | 'pending' | 'failed';
  network: string;
  gasPrice?: string;
  gasUsed?: string;
  blockNumber?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AsyncPipe, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  
  isDropdownOpen = false;
  isNetworkDropdownOpen = false;
  isAddContactModalOpen = false;
  isTransactionDetailModalOpen = false;
  selectedTransaction: Transaction | null = null;
  
  activeTab: 'send' | 'history' | 'contacts' = 'send';
  
  sendData = {
    recipient: '',
    amount: null as number | null,
    gasPrice: 'standard' as 'slow' | 'standard' | 'fast'
  };

  newContact = {
    name: '',
    address: '',
    network: ''
  };

  // Redes soportadas
  networks: Network[] = [
    {
      name: 'Sepolia',
      chainId: 11155111,
      rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      symbol: 'SepoliaETH',
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    {
      name: 'Holesky', 
      chainId: 17000,
      rpcUrl: 'https://ethereum-holesky.publicnode.com',
      symbol: 'HolETH',
      explorerUrl: 'https://holesky.etherscan.io'
    },
    {
      name: 'Ephemery',
      chainId: 39438146,
      rpcUrl: 'https://otter.bordel.wtf/',
      symbol: 'EphETH',
      explorerUrl: 'https://explorer.ephemery.dev'
    },
    {
      name: 'Goerli',
      chainId: 5,
      rpcUrl: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY', 
      symbol: 'GoerliETH',
      explorerUrl: 'https://goerli.etherscan.io'
    }
  ];

  // ⚠️ CORREGIDO: currentNetwork ahora se actualiza desde el servicio
  currentNetwork: Network = this.networks[0];

  contacts: Contact[] = [
    { 
      id: '1',
      name: 'Juan Condori', 
      address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      network: 'Sepolia'
    },
    { 
      id: '2',
      name: 'Luis Manzo', 
      address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
      network: 'Holesky'
    },
    { 
      id: '3',
      name: 'Jesús Canales', 
      address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
      network: 'Sepolia'
    }
  ];

  transactions: Transaction[] = [
    { 
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      direction: 'outgoing',
      address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      amount: 0.5,
      date: new Date('2023-05-15T10:30:00'),
      status: 'confirmed',
      network: 'Sepolia',
      gasPrice: '20 gwei',
      gasUsed: '21000',
      blockNumber: 4567890
    },
    { 
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      direction: 'incoming',
      address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
      amount: 1.2,
      date: new Date('2023-05-10T14:15:00'),
      status: 'confirmed',
      network: 'Holesky',
      gasPrice: '15 gwei',
      gasUsed: '21000',
      blockNumber: 3456789
    },
    { 
      hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      direction: 'outgoing',
      address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db',
      amount: 0.3,
      date: new Date('2023-05-05T09:45:00'),
      status: 'pending',
      network: 'Ephemery',
      gasPrice: '25 gwei',
      gasUsed: '21000'
    },
    {
      hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      direction: 'incoming',
      address: '0x8Ba1f109551bD432803012645Hac136c34B4b5eC',
      amount: 2.1,
      date: new Date('2023-04-28T16:20:00'),
      status: 'confirmed',
      network: 'Sepolia',
      gasPrice: '18 gwei',
      gasUsed: '21000',
      blockNumber: 2345678
    },
    {
      hash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      direction: 'outgoing',
      address: '0x9Ee1f37F5e8b0F7De3b20E2C7e5D5A7B8C4D3E2F',
      amount: 0.75,
      date: new Date('2023-04-20T11:30:00'),
      status: 'failed',
      network: 'Holesky',
      gasPrice: '30 gwei',
      gasUsed: '21000'
    }
  ];

  // Filtros
  filterNetwork = 'all';
  filterStatus = 'all';
  filterDirection = 'all';

  constructor(
    public walletService: WalletService,
    private router: Router
  ) {}

  ngOnInit() {
  // Cargar datos del localStorage si existen
  this.loadContactsFromStorage();
  this.loadTransactionsFromStorage();
  
  // ⚠️ NUEVO: Verificar transacciones pendientes al cargar
  setTimeout(() => {
    this.checkPendingTransactions();
  }, 2000);
  
  // Suscribirse a cambios de red del wallet service
  const networkSub = this.walletService.currentNetwork.subscribe(network => {
    if (network) {
      this.currentNetwork = network;
      console.log('Network updated to:', network.name);
    }
  });
  
  this.subscriptions.push(networkSub);
}

  ngOnDestroy() {
    // ⚠️ NUEVO: Limpiar suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Gestión de pestañas
  setActiveTab(tab: 'send' | 'history' | 'contacts') {
    this.activeTab = tab;
  }

  // Gestión de dropdowns
  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    this.isNetworkDropdownOpen = false;
  }

  toggleNetworkDropdown() {
    this.isNetworkDropdownOpen = !this.isNetworkDropdownOpen;
    this.isDropdownOpen = false;
  }

  // Cambio de red
  async switchNetwork(network: Network) {
    try {
      await this.walletService.switchNetwork(network);
      // ⚠️ ELIMINADO: No necesitamos actualizar currentNetwork manualmente
      // this.currentNetwork = network;
      this.isNetworkDropdownOpen = false;
      console.log('Successfully switched to:', network.name);
    } catch (error) {
      console.error('Error switching network:', error);
      alert('Error al cambiar de red. Asegúrate de que la red esté configurada en tu wallet.');
    }
  }

  // Desconectar wallet
  disconnectWallet() {
    this.walletService.disconnectWallet();
    this.router.navigate(['/login']);
  }

  // Enviar transacción
  async sendTransaction() {
  if (this.sendData.recipient && this.sendData.amount) {
    try {
      console.log('Sending', this.sendData.amount, 'ETH to', this.sendData.recipient);
      
      const txHash = await this.walletService.sendTransaction(
        this.sendData.recipient,
        this.sendData.amount,
        this.sendData.gasPrice
      );

      // ⚠️ CORREGIDO: Crear transacción con estado 'pending' inicial
      const newTransaction: Transaction = {
        hash: txHash,
        direction: 'outgoing',
        address: this.sendData.recipient,
        amount: this.sendData.amount,
        date: new Date(),
        status: 'pending', // Siempre empieza como pending
        network: this.currentNetwork.name,
        gasPrice: this.getGasPriceValue(this.sendData.gasPrice)
      };

      this.transactions.unshift(newTransaction);
      this.saveTransactionsToStorage();

      // ⚠️ MEJORADO: Verificar estado real de la transacción
      this.monitorTransactionStatus(txHash);

      // Reset form
      this.sendData = {
        recipient: '',
        amount: null,
        gasPrice: 'standard'
      };

      alert('Transacción enviada exitosamente! Se actualizará el estado automáticamente.');
    } catch (error) {
      console.error('Error sending transaction:', error);
      alert('Error al enviar la transacción. Verifica los datos e intenta nuevamente.');
    }
  }
}
// ⚠️ NUEVO: Función mejorada para monitorear transacciones
private async monitorTransactionStatus(txHash: string) {
  const maxAttempts = 20; // Máximo 20 intentos (10 minutos)
  let attempts = 0;
  
  const checkStatus = async () => {
    try {
      const status = await this.walletService.checkTransactionStatus(txHash);
      const txIndex = this.transactions.findIndex(tx => tx.hash === txHash);
      
      if (txIndex !== -1) {
        if (status === 'confirmed') {
          this.transactions[txIndex].status = 'confirmed';
          this.transactions[txIndex].blockNumber = Math.floor(Math.random() * 1000000) + 1000000;
          this.saveTransactionsToStorage();
          console.log('Transaction confirmed:', txHash);
          return; // Detener monitoreo
        } else if (status === 'failed') {
          this.transactions[txIndex].status = 'failed';
          this.saveTransactionsToStorage();
          console.log('Transaction failed:', txHash);
          return; // Detener monitoreo
        }
        // Si está 'pending', continúa verificando
      }
    } catch (error) {
      console.error('Error checking transaction status:', error);
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      // Verificar cada 30 segundos
      setTimeout(checkStatus, 30000);
    } else {
      console.log('Max attempts reached for transaction:', txHash);
      // Después de 10 minutos sin confirmación, marcar como failed
      const txIndex = this.transactions.findIndex(tx => tx.hash === txHash);
      if (txIndex !== -1 && this.transactions[txIndex].status === 'pending') {
        this.transactions[txIndex].status = 'failed';
        this.saveTransactionsToStorage();
      }
    }
  };
  
  // Empezar a verificar después de 30 segundos
  setTimeout(checkStatus, 30000);
}
private async checkPendingTransactions() {
  const pendingTxs = this.transactions.filter(tx => tx.status === 'pending');
  
  for (const tx of pendingTxs) {
    try {
      const status = await this.walletService.checkTransactionStatus(tx.hash);
      if (status !== 'pending') {
        const txIndex = this.transactions.findIndex(t => t.hash === tx.hash);
        if (txIndex !== -1) {
          this.transactions[txIndex].status = status;
          if (status === 'confirmed') {
            this.transactions[txIndex].blockNumber = Math.floor(Math.random() * 1000000) + 1000000;
          }
        }
      }
    } catch (error) {
      console.error('Error checking pending transaction:', error);
    }
  }
  
  this.saveTransactionsToStorage();
}
  // ⚠️ NUEVO: Función para actualizar estado de transacciones
  private async updateTransactionStatus(txHash: string) {
    const txIndex = this.transactions.findIndex(tx => tx.hash === txHash);
    if (txIndex !== -1) {
      try {
        // Aquí podrías verificar el estado real de la transacción
        // Por ahora solo la marcamos como confirmada
        this.transactions[txIndex].status = 'confirmed';
        this.transactions[txIndex].blockNumber = Math.floor(Math.random() * 1000000) + 1000000;
        this.saveTransactionsToStorage();
        console.log('Transaction status updated to confirmed');
      } catch (error) {
        this.transactions[txIndex].status = 'failed';
        this.saveTransactionsToStorage();
        console.error('Transaction failed:', error);
      }
    }
  }

  private getGasPriceValue(speed: string): string {
    switch (speed) {
      case 'slow': return '10 gwei';
      case 'standard': return '20 gwei';
      case 'fast': return '30 gwei';
      default: return '20 gwei';
    }
  }

  // Gestión de contactos
  openAddContactModal() {
    this.isAddContactModalOpen = true;
    this.newContact = { name: '', address: '', network: this.currentNetwork.name };
  }

  closeAddContactModal() {
    this.isAddContactModalOpen = false;
    this.newContact = { name: '', address: '', network: '' };
  }

  addContact() {
    if (this.newContact.name && this.newContact.address) {
      const contact: Contact = {
        id: Date.now().toString(),
        name: this.newContact.name,
        address: this.newContact.address,
        network: this.newContact.network || this.currentNetwork.name
      };

      this.contacts.push(contact);
      this.saveContactsToStorage();
      this.closeAddContactModal();
    }
  }

  deleteContact(contactId: string) {
    if (confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      this.contacts = this.contacts.filter(c => c.id !== contactId);
      this.saveContactsToStorage();
    }
  }

  sendToContact(address: string) {
    this.sendData.recipient = address;
    this.setActiveTab('send');
  }

  // Gestión de transacciones
  openTransactionDetail(transaction: Transaction) {
    this.selectedTransaction = transaction;
    this.isTransactionDetailModalOpen = true;
  }

  closeTransactionDetail() {
    this.isTransactionDetailModalOpen = false;
    this.selectedTransaction = null;
  }

  getFilteredTransactions(): Transaction[] {
    return this.transactions.filter(tx => {
      const networkMatch = this.filterNetwork === 'all' || tx.network === this.filterNetwork;
      const statusMatch = this.filterStatus === 'all' || tx.status === this.filterStatus;
      const directionMatch = this.filterDirection === 'all' || tx.direction === this.filterDirection;
      
      return networkMatch && statusMatch && directionMatch;
    });
  }

  openInExplorer(transaction: Transaction) {
    const network = this.networks.find(n => n.name === transaction.network);
    if (network) {
      const url = `${network.explorerUrl}/tx/${transaction.hash}`;
      window.open(url, '_blank');
    }
  }

  // Utilidades
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': return 'status-confirmed';
      case 'pending': return 'status-pending';
      case 'failed': return 'status-failed';
      default: return '';
    }
  }

  getDirectionClass(direction: string): string {
    return direction === 'incoming' ? 'direction-incoming' : 'direction-outgoing';
  }

  // Persistencia de datos
  private saveContactsToStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wallet-contacts', JSON.stringify(this.contacts));
    }
  }

  private loadContactsFromStorage() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('wallet-contacts');
      if (saved) {
        this.contacts = JSON.parse(saved);
      }
    }
  }

  private saveTransactionsToStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wallet-transactions', JSON.stringify(this.transactions));
    }
  }

  private loadTransactionsFromStorage() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('wallet-transactions');
      if (saved) {
        this.transactions = JSON.parse(saved).map((tx: any) => ({
          ...tx,
          date: new Date(tx.date)
        }));
      }
    }
  }
}