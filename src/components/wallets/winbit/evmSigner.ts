import { type EVMChain, SwapKitError } from "@swapkit/helpers";
import type { JsonRpcProvider, Provider, TransactionRequest, TransactionResponse } from "@swapkit/toolbox-evm";
import { AbstractSigner } from "@swapkit/toolbox-evm";
import { DEFAULT_EIP155_METHODS } from "./constants.ts";
import { chainToChainId, getAddressByChain } from "./helpers.ts";
import type { WinbitWallet } from "./winbitWallet.ts";

interface WinbitEVMSignerParams {
  chain: EVMChain;
  winbit: WinbitWallet;
  provider: Provider | JsonRpcProvider;
}

class WinbitSigner extends AbstractSigner {
  address: string = "";
  private chain: EVMChain;
  private winbit: WinbitWallet;
  readonly provider: Provider | JsonRpcProvider;

  constructor({ chain, provider, winbit }: WinbitEVMSignerParams) {
    super(provider);
    this.chain = chain;
    this.winbit = winbit;
    this.provider = provider;
  }

  // Get the wallet address for the current chain
  async getAddress() {
    if (!this.address) {
      this.address = getAddressByChain(this.chain, this.winbit.toolboxes.map((tb) => tb.address));
      if (!this.address) {
        throw new SwapKitError("Address not found for the chain");
      }
    }
    return this.address;
  }

  // Sign a message using the QR-based signing system
  async signMessage(message: string): Promise<string> {
    const toolbox = this.winbit.toolboxes.find((tb) => tb.chain === this.chain);
    if (!toolbox) throw new SwapKitError("No toolbox found for the current chain");

    const signedMessage = await toolbox.signMessage(message);
    if (!signedMessage) throw new SwapKitError("Failed to sign message");
    return signedMessage;
  }

  // Sign a transaction using the QR-based signing system
  async signTransaction(transaction: TransactionRequest): Promise<string> {
    const unsignedTx = JSON.stringify(transaction); // Convert the transaction to a JSON string
    const toolbox = this.winbit.toolboxes.find((tb) => tb.chain === this.chain);
    if (!toolbox) throw new SwapKitError("No toolbox found for the current chain");

    const signedTx = await toolbox.signTransaction(unsignedTx);
    if (!signedTx) throw new SwapKitError("Failed to sign transaction");
    return signedTx;
  }

  // Send a signed transaction
  async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
    const signedTx = await this.signTransaction(transaction); // Get the signed transaction
    const serializedTx = `0x${signedTx}`; // Ensure it's in the correct hex format

    // Broadcast the transaction using the provider
    return this.provider.sendTransaction(serializedTx);
  }

  // Placeholder for signing typed data
  signTypedData() {
    throw new Error("signTypedData not implemented");
  }

  // Connect the signer to a new provider
  connect(provider: Provider | null): WinbitSigner {
    if (!provider) {
      throw new SwapKitError("Provider not found");
    }
    return new WinbitSigner({
      chain: this.chain,
      winbit: this.winbit,
      provider,
    });
  }
}

// Export a helper function to instantiate the WinbitSigner
export const getEVMSigner = async ({
  chain,
  winbit,
  provider,
}: WinbitEVMSignerParams): Promise<WinbitSigner> => new WinbitSigner({ chain, winbit, provider });
