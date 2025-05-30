import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ethers } from 'ethers';
import { BehaviorSubject } from 'rxjs';

export interface Network {
  name: string;
  chainId: number;
  rpcUrl: string;
  symbol: string;
  explorerUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  currentAccount = new BehaviorSubject<string>('');
  balance = new BehaviorSubject<string>('0');
  currentNetwork = new BehaviorSubject<Network | null>(null);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.checkIfWalletIsConnected();
      this.setupEventListeners();
    }
  }

  async connectWallet() {
    if (isPlatformBrowser(this.platformId) && typeof window.ethereum !== 'undefined') {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

        this.signer = await this.provider.getSigner();
        this.currentAccount.next(accounts[0]);

        await this.getBalance(accounts[0]);
        await this.getCurrentNetwork();
      } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        throw error;
      }
    } else {
      throw new Error('MetaMask is not installed or not in browser context.');
    }
  }

  disconnectWallet() {
    this.provider = null;
    this.signer = null;
    this.currentAccount.next('');
    this.balance.next('0');
    this.currentNetwork.next(null);
  }

  async checkIfWalletIsConnected() {
    if (isPlatformBrowser(this.platformId) && typeof window.ethereum !== 'undefined') {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });

        if (accounts.length > 0) {
          this.signer = await this.provider.getSigner();
          this.currentAccount.next(accounts[0]);
          await this.getBalance(accounts[0]);
          await this.getCurrentNetwork();
        }
      } catch (error) {
        console.error('Error checking connected accounts:', error);
      }
    }
  }

  private async getBalance(address: string) {
    if (!this.provider) return;

    try {
      const balance = await this.provider.getBalance(address);
      this.balance.next(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error getting balance:', error);
      this.balance.next('0');
    }
  }

  private async getCurrentNetwork() {
    if (!this.provider) return;

    try {
      const network = await this.provider.getNetwork();
      const networkInfo = this.getNetworkInfo(Number(network.chainId));
      this.currentNetwork.next(networkInfo);
    } catch (error) {
      console.error('Error getting current network:', error);
    }
  }

  private getNetworkInfo(chainId: number): Network | null {
    const networks: { [key: number]: Network } = {
      11155111: {
        name: 'Sepolia',
        chainId: 11155111,
        rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
        symbol: 'SepoliaETH',
        explorerUrl: 'https://sepolia.etherscan.io'
      },
      17000: {
        name: 'Holesky',
        chainId: 17000,
        rpcUrl: 'https://ethereum-holesky.publicnode.com',
        symbol: 'HolETH',
        explorerUrl: 'https://holesky.etherscan.io'
      },
      39438000: {
        name: 'Ephemery',
        chainId: 39438146,
        rpcUrl: 'https://otter.bordel.wtf/erigon',
        symbol: 'EphETH',
        explorerUrl: 'https://explorer.ephemery.dev'
      },
      5: {
        name: 'Goerli',
        chainId: 5,
        rpcUrl: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY',
        symbol: 'GoerliETH',
        explorerUrl: 'https://goerli.etherscan.io'
      }
    };

    return networks[chainId] || null;
  }

  async switchNetwork(network: Network) {
    if (!isPlatformBrowser(this.platformId) || typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not available');
    }

    try {
      // Intentar cambiar a la red
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${network.chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // Si la red no está agregada, agregarla
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${network.chainId.toString(16)}`,
                chainName: network.name,
                nativeCurrency: {
                  name: network.symbol,
                  symbol: network.symbol,
                  decimals: 18,
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.explorerUrl],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
          throw addError;
        }
      } else {
        console.error('Error switching network:', switchError);
        throw switchError;
      }
    }

    // ⚠️ IMPORTANTE: Eliminar esta parte porque el evento chainChanged se encarga de esto
    // await this.getCurrentNetwork();
    // const currentAccount = this.currentAccount.value;
    // if (currentAccount) {
    //   await this.getBalance(currentAccount);
    // }
  }

  async sendTransaction(
  to: string, 
  amount: number, 
  gasSpeed: 'slow' | 'standard' | 'fast' = 'standard'
): Promise<string> {
  if (!this.signer) {
    throw new Error('Wallet not connected');
  }

  try {
    // Obtener precio de gas sugerido
    const feeData = await this.provider!.getFeeData();
    let gasPrice = feeData.gasPrice;

    // Ajustar precio de gas según velocidad
    if (gasPrice) {
      switch (gasSpeed) {
        case 'slow':
          gasPrice = gasPrice * BigInt(80) / BigInt(100); // -20%
          break;
        case 'fast':
          gasPrice = gasPrice * BigInt(150) / BigInt(100); // +50%
          break;
        // 'standard' usa el precio sugerido
      }
    }

    const transaction = {
      to: to,
      value: ethers.parseEther(amount.toString()),
      gasPrice: gasPrice,
      gasLimit: 21000 // Gas límite estándar para transferencias simples
    };

    const txResponse = await this.signer.sendTransaction(transaction);
    
    // ⚠️ CORREGIDO: Solo actualizar balance después de la confirmación, no inmediatamente
    const currentAccount = this.currentAccount.value;
    
    // Esperar confirmación y actualizar balance
    txResponse.wait().then(() => {
      if (currentAccount) {
        this.getBalance(currentAccount);
      }
    }).catch(err => {
      console.error('Error waiting for transaction confirmation:', err);
    });

    return txResponse.hash;
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
}
// ⚠️ NUEVO: Método para verificar estado de transacción en blockchain
async checkTransactionStatus(txHash: string): Promise<'pending' | 'confirmed' | 'failed'> {
  if (!this.provider) {
    throw new Error('Provider not available');
  }

  try {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    
    if (receipt === null) {
      // Transacción aún no minada
      return 'pending';
    } else if (receipt.status === 1) {
      // Transacción exitosa
      return 'confirmed';
    } else {
      // Transacción falló
      return 'failed';
    }
  } catch (error) {
    console.error('Error checking transaction status:', error);
    // Si hay error al verificar, mantener como pendiente
    return 'pending';
  }
}

  async getTransactionHistory(address: string, network: Network): Promise<any[]> {
    // Esta función requeriría integración con APIs de exploradores
    // Por ahora retorna un array vacío, pero podrías integrar con:
    // - Etherscan API
    // - Alchemy API
    // - Moralis API
    try {
      // Ejemplo de implementación con Etherscan API
      // const apiKey = 'YOUR_ETHERSCAN_API_KEY';
      // const baseUrl = network.explorerUrl.includes('etherscan') 
      //   ? network.explorerUrl.replace('https://', 'https://api.') + '/api'
      //   : null;
      
      // if (baseUrl) {
      //   const response = await fetch(
      //     `${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`
      //   );
      //   const data = await response.json();
      //   return data.result || [];
      // }
      
      return [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  async estimateGas(to: string, amount: number): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    try {
      const gasEstimate = await this.provider.estimateGas({
        to: to,
        value: ethers.parseEther(amount.toString())
      });
      return gasEstimate;
    } catch (error) {
      console.error('Error estimating gas:', error);
      return BigInt(21000); // Fallback al gas estándar
    }
  }

  async getGasPrices(): Promise<{slow: string, standard: string, fast: string}> {
    if (!this.provider) {
      throw new Error('Provider not available');
    }

    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || BigInt(0);
      
      return {
        slow: ethers.formatUnits(gasPrice * BigInt(80) / BigInt(100), 'gwei'),
        standard: ethers.formatUnits(gasPrice, 'gwei'),
        fast: ethers.formatUnits(gasPrice * BigInt(150) / BigInt(100), 'gwei')
      };
    } catch (error) {
      console.error('Error getting gas prices:', error);
      return {
        slow: '10',
        standard: '20', 
        fast: '30'
      };
    }
  }

  private setupEventListeners() {
    if (isPlatformBrowser(this.platformId) && typeof window.ethereum !== 'undefined') {
      // ⚠️ CORREGIDO: Remover listeners existentes para evitar duplicados
      if (window.ethereum.removeAllListeners) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }

      window.ethereum.on('accountsChanged', async (accounts: string[]) => {
        console.log('Account changed:', accounts);
        if (accounts.length === 0) {
          this.disconnectWallet();
        } else {
          this.currentAccount.next(accounts[0]);
          await this.getBalance(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', async (chainId: string) => {
        console.log('Chain changed to:', chainId);
        
        // ⚠️ CORREGIDO: Recrear provider después del cambio de red
        this.provider = new ethers.BrowserProvider(window.ethereum);
        
        // Actualizar red actual
        await this.getCurrentNetwork();
        
        // Actualizar balance con la nueva red
        const currentAccount = this.currentAccount.value;
        if (currentAccount) {
          await this.getBalance(currentAccount);
        }
      });
    }
  }

  truncateAddress(address: string | null): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }
}