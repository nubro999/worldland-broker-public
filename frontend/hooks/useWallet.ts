'use client';

import { useState, useCallback, useEffect } from 'react';
import { BrowserProvider, formatEther, parseEther } from 'ethers';

interface WalletState {
  address: string | null;
  balance: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
}

// BSC Testnet Chain Config
const BSC_TESTNET = {
  chainId: '0x61', // 97 in hex
  chainName: 'BSC Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
  blockExplorerUrls: ['https://testnet.bscscan.com/'],
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    error: null,
  });

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }, []);

  // Get provider
  const getProvider = useCallback(() => {
    if (!isMetaMaskInstalled()) return null;
    return new BrowserProvider(window.ethereum);
  }, [isMetaMaskInstalled]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      setState(prev => ({ ...prev, error: 'MetaMask is not installed' }));
      window.open('https://metamask.io/download/', '_blank');
      return null;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const provider = getProvider();
      if (!provider) throw new Error('Failed to get provider');

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      const balance = await provider.getBalance(address);
      const network = await provider.getNetwork();

      setState({
        address,
        balance: formatEther(balance),
        chainId: Number(network.chainId),
        isConnecting: false,
        isConnected: true,
        error: null,
      });

      return address;
    } catch (error: any) {
      const errorMessage = error.code === 4001 
        ? 'User rejected the connection'
        : error.message || 'Failed to connect wallet';
      
      setState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        error: errorMessage,
      }));
      return null;
    }
  }, [isMetaMaskInstalled, getProvider]);

  // Disconnect wallet (clear local state)
  const disconnect = useCallback(() => {
    setState({
      address: null,
      balance: null,
      chainId: null,
      isConnecting: false,
      isConnected: false,
      error: null,
    });
  }, []);

  // Switch to BSC Testnet
  const switchToBscTestnet = useCallback(async () => {
    if (!isMetaMaskInstalled()) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_TESTNET.chainId }],
      });
      return true;
    } catch (switchError: any) {
      // Chain not added, try to add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [BSC_TESTNET],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add BSC Testnet:', addError);
          return false;
        }
      }
      console.error('Failed to switch chain:', switchError);
      return false;
    }
  }, [isMetaMaskInstalled]);

  // Sign a message (for authentication)
  const signMessage = useCallback(async (message: string) => {
    const provider = getProvider();
    if (!provider || !state.address) {
      throw new Error('Wallet not connected');
    }

    const signer = await provider.getSigner();
    const signature = await signer.signMessage(message);
    return signature;
  }, [getProvider, state.address]);

  // Mock payment transaction
  const mockPayment = useCallback(async (amount: number, description: string): Promise<{
    success: boolean;
    txHash: string;
    amount: number;
  }> => {
    // Simulate signing and transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock tx hash
    const txHash = '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    return {
      success: true,
      txHash,
      amount,
    };
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState(prev => ({
          ...prev,
          address: accounts[0],
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      setState(prev => ({
        ...prev,
        chainId: parseInt(chainId, 16),
      }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [isMetaMaskInstalled, disconnect]);

  // Auto-connect if previously connected
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const checkConnection = async () => {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });
        
        if (accounts && accounts.length > 0) {
          const provider = getProvider();
          if (provider) {
            const balance = await provider.getBalance(accounts[0]);
            const network = await provider.getNetwork();
            
            setState({
              address: accounts[0],
              balance: formatEther(balance),
              chainId: Number(network.chainId),
              isConnecting: false,
              isConnected: true,
              error: null,
            });
          }
        }
      } catch (error) {
        console.error('Auto-connect check failed:', error);
      }
    };

    checkConnection();
  }, [isMetaMaskInstalled, getProvider]);

  return {
    ...state,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    connect,
    disconnect,
    switchToBscTestnet,
    signMessage,
    mockPayment,
    BSC_TESTNET_CHAIN_ID: 97,
  };
}

// Window type extension
declare global {
  interface Window {
    ethereum?: any;
  }
}
