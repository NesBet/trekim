declare module "@paystack/inline-js" {
  interface PaystackPop {
    new (): PaystackPop;
    resumeTransaction(
      accessCode: string,
      callbacks?: {
        onSuccess?: () => void;
        onCancel?: () => void;
        onError?: () => void;
      }
    ): void;
  }

  const PaystackPop: PaystackPop;
  export default PaystackPop;
}
