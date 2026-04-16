declare module '@alexssmusica/node-printer' {
  type PrintDirectOptions = {
    printer: string;
    data: Buffer;
    type: 'RAW' | string;
    success: () => void;
    error: (err: Error | string) => void;
  };

  const printer: {
    printDirect: (options: PrintDirectOptions) => void;
  };

  export default printer;
}
