'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faWallet, faCheck, faSpinner, faExternalLink,
  faShieldHalved, faCircleCheck, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import BackgroundTerminal from '@/components/BackgroundTerminal';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useJobs } from '@/hooks/useJobs';

type CheckoutStep = 'connect' | 'review' | 'payment' | 'processing' | 'success' | 'error';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { createJob, loading: jobLoading } = useJobs();
  const wallet = useWallet();

  const [step, setStep] = useState<CheckoutStep>('connect');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse job config from URL params
  const jobConfig = {
    gpuType: searchParams.get('gpu_type') || 'NVIDIA RTX 4090',
    gpuCount: parseInt(searchParams.get('gpu_count') || '1'),
    cpuCores: searchParams.get('cpu_cores') || '4',
    memoryGb: searchParams.get('memory_gb') || '16',
    storageGb: searchParams.get('storage_gb') || '50',
    durationHours: parseInt(searchParams.get('duration') || '1'),
    sshPassword: searchParams.get('ssh_password') || '',
    image: searchParams.get('image') || 'pytorch/pytorch:latest',
  };

  // Calculate price (mock)
  const hourlyRate = 1.20; // $1.20/hr per GPU
  const totalPrice = hourlyRate * jobConfig.gpuCount * jobConfig.durationHours;
  const platformFee = totalPrice * 0.05; // 5% fee
  const grandTotal = totalPrice + platformFee;

  // Mock USDT balance
  const mockUsdtBalance = 150.00;

  // Auth check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Auto-advance when wallet connects
  useEffect(() => {
    if (wallet.isConnected && step === 'connect') {
      setStep('review');
    }
  }, [wallet.isConnected, step]);

  const handleConnectWallet = async () => {
    await wallet.connect();
  };

  const handleProceedToPayment = () => {
    setStep('payment');
  };

  const [processingStep, setProcessingStep] = useState<number>(0);

  const handleConfirmPayment = async () => {
    setStep('processing');
    setProcessingStep(0);
    setError(null);

    try {
      // Step 1: Verify wallet (2 seconds)
      setProcessingStep(1);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Approve USDT (3 seconds)
      setProcessingStep(2);
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Process payment transaction (3 seconds)
      setProcessingStep(3);
      const result = await wallet.mockPayment(grandTotal, `GPU Rental - ${jobConfig.gpuType}`);
      setTxHash(result.txHash);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Create GPU instance (2 seconds)
      setProcessingStep(4);
      await createJob({
        gpu_type: jobConfig.gpuType,
        gpu_count: jobConfig.gpuCount,
        cpu_cores: jobConfig.cpuCores,
        memory_gb: jobConfig.memoryGb,
        storage_gb: jobConfig.storageGb,
        ssh_password: jobConfig.sshPassword,
        duration_hours: jobConfig.durationHours,
        image: jobConfig.image,
      });

      // Step 5: Finalize (1 second)
      setProcessingStep(5);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setStep('error');
    }
  };

  const handleRetry = () => {
    setStep('payment');
    setProcessingStep(0);
    setError(null);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/90 to-black/95 z-10 pointer-events-none" />
        <BackgroundTerminal />
      </div>

      <div className="relative z-20">
        {/* Header */}
        <header className="px-8 py-4 border-b border-[#111]">
          <div className="max-w-[900px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/"><Image src="/worldland-logo.png" alt="Worldland" width={120} height={32} /></Link>
              <Link href="/jobs/create" className="text-gray-500 hover:text-white text-sm flex items-center gap-2">
                <FontAwesomeIcon icon={faArrowLeft} className="text-xs" /> Back
              </Link>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {wallet.isConnected && (
                <span className="text-green-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  {shortenAddress(wallet.address!)}
                </span>
              )}
              <span className="text-gray-500">{user.email || user.name}</span>
              <button onClick={logout} className="text-gray-500 hover:text-white">Logout</button>
            </div>
          </div>
        </header>

        <main className="px-8 py-8">
          <div className="max-w-[700px] mx-auto">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {['connect', 'review', 'payment'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s ? 'bg-red-500 text-white' :
                    ['review', 'payment', 'processing', 'success'].indexOf(step) > ['connect', 'review', 'payment'].indexOf(s)
                      ? 'bg-green-500 text-white' : 'bg-[#222] text-gray-500'
                  }`}>
                    {['review', 'payment', 'processing', 'success'].indexOf(step) > ['connect', 'review', 'payment'].indexOf(s)
                      ? <FontAwesomeIcon icon={faCheck} />
                      : i + 1}
                  </div>
                  {i < 2 && <div className={`w-12 h-0.5 mx-2 ${
                    ['review', 'payment', 'processing', 'success'].indexOf(step) > i ? 'bg-green-500' : 'bg-[#222]'
                  }`} />}
                </div>
              ))}
            </div>

            {/* Step: Connect Wallet */}
            {step === 'connect' && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FontAwesomeIcon icon={faWallet} className="text-2xl text-orange-400" />
                </div>
                <h1 className="text-2xl font-medium mb-2">Connect Your Wallet</h1>
                <p className="text-gray-400 mb-8">Connect MetaMask to proceed with payment</p>

                {!wallet.isMetaMaskInstalled ? (
                  <button
                    onClick={() => window.open('https://metamask.io/download/', '_blank')}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-3"
                  >
                    <Image src="/metamask-fox.svg" alt="MetaMask" width={24} height={24} onError={(e) => e.currentTarget.style.display = 'none'} />
                    Install MetaMask
                    <FontAwesomeIcon icon={faExternalLink} />
                  </button>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    disabled={wallet.isConnecting}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 text-white py-4 rounded-lg font-medium flex items-center justify-center gap-3"
                  >
                    {wallet.isConnecting ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <span className="text-xl">🦊</span>
                        Connect MetaMask
                      </>
                    )}
                  </button>
                )}

                {wallet.error && (
                  <p className="text-red-400 mt-4 text-sm">{wallet.error}</p>
                )}

                <p className="text-gray-600 text-xs mt-6">
                  By connecting, you agree to our Terms of Service
                </p>
              </div>
            )}

            {/* Step: Review Order */}
            {step === 'review' && (
              <div className="space-y-4">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faShieldHalved} className="text-blue-400" />
                    Order Summary
                  </h2>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-[#222]">
                      <span className="text-gray-400">GPU</span>
                      <span>{jobConfig.gpuCount}x {jobConfig.gpuType}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[#222]">
                      <span className="text-gray-400">CPU / Memory / Storage</span>
                      <span>{jobConfig.cpuCores} cores / {jobConfig.memoryGb}GB / {jobConfig.storageGb}GB</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[#222]">
                      <span className="text-gray-400">Duration</span>
                      <span>{jobConfig.durationHours} hour(s)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[#222]">
                      <span className="text-gray-400">Hourly Rate</span>
                      <span>${hourlyRate.toFixed(2)} × {jobConfig.gpuCount} GPU</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[#222]">
                      <span className="text-gray-400">Subtotal</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-[#222]">
                      <span className="text-gray-400">Platform Fee (5%)</span>
                      <span>${platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-3 text-lg font-bold">
                      <span>Total</span>
                      <span className="text-green-400">${grandTotal.toFixed(2)} USDT</span>
                    </div>
                  </div>
                </div>

                {/* Wallet Info */}
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Payment Wallet</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🦊</span>
                      <div>
                        <p className="font-mono">{wallet.address && shortenAddress(wallet.address)}</p>
                        <p className="text-xs text-gray-500">
                          {wallet.chainId === 97 ? 'BSC Testnet' : 'Switch to BSC Testnet'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-medium">${mockUsdtBalance.toFixed(2)} USDT</p>
                      <p className="text-xs text-gray-500">Available Balance</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-lg font-medium"
                >
                  Proceed to Payment
                </button>
              </div>
            )}

            {/* Step: Payment Confirmation */}
            {step === 'payment' && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-2xl text-green-400" />
                </div>
                <h1 className="text-2xl font-medium mb-2">Confirm Payment</h1>
                <p className="text-gray-400 mb-6">
                  You are about to pay <span className="text-green-400 font-bold">${grandTotal.toFixed(2)} USDT</span>
                </p>

                <div className="bg-[#111] rounded-lg p-4 mb-6 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm">From</span>
                    <span className="font-mono text-sm">{wallet.address && shortenAddress(wallet.address)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-sm">To</span>
                    <span className="font-mono text-sm text-yellow-400">GPUVault Contract</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">Network</span>
                    <span className="text-sm">BSC Testnet</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep('review')}
                    className="flex-1 bg-[#222] hover:bg-[#333] text-white py-3 rounded-lg font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium"
                  >
                    Confirm & Pay
                  </button>
                </div>

                <p className="text-gray-600 text-xs mt-6 flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faShieldHalved} />
                  Secured by GPUVault Smart Contract
                </p>
              </div>
            )}

            {/* Step: Processing */}
            {step === 'processing' && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FontAwesomeIcon icon={faSpinner} className="text-2xl text-blue-400 animate-spin" />
                </div>
                <h1 className="text-2xl font-medium mb-2">Processing Payment</h1>
                <p className="text-gray-400 mb-6">Please wait while we process your transaction...</p>
                
                {/* Progress Bar */}
                <div className="w-full bg-[#222] rounded-full h-2 mb-6">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(processingStep / 5) * 100}%` }}
                  />
                </div>
                
                <div className="space-y-3 text-sm text-left max-w-sm mx-auto">
                  <div className={`flex items-center gap-3 ${processingStep >= 1 ? 'text-green-400' : 'text-gray-500'}`}>
                    {processingStep > 1 ? <FontAwesomeIcon icon={faCircleCheck} /> : 
                     processingStep === 1 ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> :
                     <div className="w-4 h-4 rounded-full border border-gray-500" />}
                    <span>Verifying wallet connection</span>
                  </div>
                  <div className={`flex items-center gap-3 ${processingStep >= 2 ? 'text-green-400' : processingStep === 2 ? 'text-blue-400' : 'text-gray-500'}`}>
                    {processingStep > 2 ? <FontAwesomeIcon icon={faCircleCheck} /> : 
                     processingStep === 2 ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> :
                     <div className="w-4 h-4 rounded-full border border-gray-500" />}
                    <span>Approving USDT transfer</span>
                  </div>
                  <div className={`flex items-center gap-3 ${processingStep >= 3 ? 'text-green-400' : processingStep === 3 ? 'text-blue-400' : 'text-gray-500'}`}>
                    {processingStep > 3 ? <FontAwesomeIcon icon={faCircleCheck} /> : 
                     processingStep === 3 ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> :
                     <div className="w-4 h-4 rounded-full border border-gray-500" />}
                    <span>Processing blockchain transaction</span>
                  </div>
                  <div className={`flex items-center gap-3 ${processingStep >= 4 ? 'text-green-400' : processingStep === 4 ? 'text-blue-400' : 'text-gray-500'}`}>
                    {processingStep > 4 ? <FontAwesomeIcon icon={faCircleCheck} /> : 
                     processingStep === 4 ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> :
                     <div className="w-4 h-4 rounded-full border border-gray-500" />}
                    <span>Creating GPU instance</span>
                  </div>
                  <div className={`flex items-center gap-3 ${processingStep >= 5 ? 'text-green-400' : 'text-gray-500'}`}>
                    {processingStep >= 5 ? <FontAwesomeIcon icon={faCircleCheck} /> : 
                     <div className="w-4 h-4 rounded-full border border-gray-500" />}
                    <span>Finalizing setup</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <div className="bg-[#0a0a0a] border border-green-500/30 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-3xl text-green-400" />
                </div>
                <h1 className="text-2xl font-medium mb-2 text-green-400">Payment Successful!</h1>
                <p className="text-gray-400 mb-6">Your GPU instance is being provisioned</p>

                {txHash && (
                  <div className="bg-[#111] rounded-lg p-4 mb-6">
                    <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
                    <p className="font-mono text-xs text-blue-400 break-all">{txHash}</p>
                    <a
                      href={`https://testnet.bscscan.com/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-white mt-2 inline-flex items-center gap-1"
                    >
                      View on BSCScan <FontAwesomeIcon icon={faExternalLink} />
                    </a>
                  </div>
                )}

                <div className="flex gap-4">
                  <Link
                    href="/jobs"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium"
                  >
                    View My Jobs
                  </Link>
                </div>
              </div>
            )}

            {/* Step: Error */}
            {step === 'error' && (
              <div className="bg-[#0a0a0a] border border-red-500/30 rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="text-2xl text-red-400" />
                </div>
                <h1 className="text-2xl font-medium mb-2 text-red-400">Payment Failed</h1>
                <p className="text-gray-400 mb-6">{error || 'An error occurred during payment'}</p>

                <div className="flex gap-4">
                  <button
                    onClick={handleRetry}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/jobs/create"
                    className="flex-1 bg-[#222] hover:bg-[#333] text-white py-3 rounded-lg font-medium"
                  >
                    Go Back
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
