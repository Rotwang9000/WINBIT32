import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  type AssetValue,
  Chain,
  type ConnectWalletParams,
  SwapKitError,
  WalletOption,
  type WalletTxParams,
  ensureEVMApiKeys,
  setRequestClientConfig,
} from "@swapkit/helpers";
import type { SolanaProvider } from "../../toolbox/solana";
import { createSolanaTokenTransaction, SOLToolbox, getTransferTransaction } from "../../toolbox/solana";
import { sign } from "mathjs";

export const PHANTOM_SUPPORTED_CHAINS = [Chain.Bitcoin, Chain.Ethereum, Chain.Solana, Chain.Base, Chain.Polygon] as const;
export type PhantomSupportedChains = (typeof PHANTOM_SUPPORTED_CHAINS)[number];

declare global {
  interface Window {
    phantom: {
      solana: SolanaProvider;
    };
  }
}

async function getWalletMethods<T extends PhantomSupportedChains>({
  chain,
  rpcUrl,
  covalentApiKey,
  ethplorerApiKey,
}: {
  rpcUrl?: string;
  chain: T;
  covalentApiKey?: string;
  ethplorerApiKey?: string;
}) {
  const phantom: any = window?.phantom;

  console.log("phantom", phantom);

  switch (chain) {
    case Chain.Bitcoin: {
      const provider = phantom?.bitcoin;
      if (!provider?.isPhantom) {
        throw new SwapKitError("wallet_phantom_not_found");
      }
      const [{ address }] = await provider.requestAccounts();

      const { getToolboxByChain } = await import("@swapkit/toolbox-utxo");
      const toolbox = getToolboxByChain(chain);

      return { ...toolbox({ rpcUrl }), address, signer: provider };
    }

    case Chain.Ethereum:
    case Chain.Base:
    case Chain.Polygon: {
      const { getToolboxByChain } = await import("@swapkit/toolbox-evm");
      const { BrowserProvider } = await import("ethers");

      const network = "any";

      //connect to the right network based on the chain
      const chainProvider = phantom?.ethereum;
      const provider = new BrowserProvider(chainProvider, network);
      const [address] = await provider.send("eth_requestAccounts", []);

      const toolbox = getToolboxByChain(chain);
      const keys = ensureEVMApiKeys({ chain, covalentApiKey, ethplorerApiKey });
      const signer = await provider.getSigner();

      return { ...toolbox({ ...keys, signer, provider }), address, signer };
    }

    case Chain.Solana: {
     
      const provider = phantom?.solana;
      if (!provider?.isPhantom) {
        throw new SwapKitError("wallet_phantom_not_found");
      }

      const providerConnection = await provider.connect();
      const address: string = providerConnection.publicKey.toString();

      const toolbox = SOLToolbox({ rpcUrl });

      const transfer = async ({
        recipient,
        assetValue,
        isProgramDerivedAddress,
      }: WalletTxParams & { assetValue: AssetValue; isProgramDerivedAddress?: boolean }) => {
        if (!(isProgramDerivedAddress || toolbox.validateAddress(recipient))) {
          throw new SwapKitError("core_transaction_invalid_recipient_address");
        }

        const fromPubkey = new PublicKey(address);

        const amount = assetValue.getBaseValue("number");

        console.log({
          amount,
          connection: toolbox.connection,
          decimals: assetValue.decimal as number,
          from: fromPubkey,
          recipient,
          tokenAddress: assetValue.address,
        });


        // const transaction = assetValue.isGasAsset
        //   ? new Transaction().add(
        //       SystemProgram.transfer({
        //         fromPubkey,
        //         lamports: amount,
        //         toPubkey: new PublicKey(recipient),
        //       }),
        //     )
        //   : assetValue.address
        //     ? await createSolanaTokenTransaction({
        //         amount,
        //         connection: toolbox.connection,
        //         decimals: assetValue.decimal as number,
        //         from: fromPubkey,
        //         recipient,
        //         tokenAddress: assetValue.address,
        //       })
        //     : undefined;

        // if (!transaction) {
        //   throw new SwapKitError("core_transaction_invalid_sender_address");
        // }

        // const blockHash = await toolbox.connection.getLatestBlockhash();
        // transaction.recentBlockhash = blockHash.blockhash;
        // transaction.feePayer = fromPubkey;
        //getTransferTransaction(connection: Connection, recipient: string, assetValue: AssetValue, fromKeypair: Keypair) {

        const transaction = await getTransferTransaction(toolbox.connection, recipient, assetValue, fromPubkey);

        const blockHash = await toolbox.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockHash.blockhash;
        transaction.feePayer = fromPubkey;

        console.log("transaction", transaction);

        const signedTransaction = await provider.signAndSendTransaction(transaction);

        console.log("signedTransaction", signedTransaction);

        const txid = signedTransaction.signature;

        // console.log("signedTransaction", signedTransaction);
        // //output as base64
        // console.log("signedTransaction", signedTransaction.serialize());


        // const txid = await toolbox.connection.sendRawTransaction(signedTransaction.serialize());

        return txid;
      };

      return { ...toolbox, transfer, address, signer: providerConnection };
    }

    default: {
      throw new SwapKitError("wallet_chain_not_supported", {
        wallet: WalletOption.PHANTOM,
        chain,
      });
    }
  }
}

function connectPhantom({
  addChain,
  config: { covalentApiKey, ethplorerApiKey, thorswapApiKey },
  rpcUrls,
}: ConnectWalletParams) {
  return async function connectPhantom(
    chainOrChains: PhantomSupportedChains | PhantomSupportedChains[],
  ) {
    setRequestClientConfig({ apiKey: thorswapApiKey });

    async function connectChain(chain: PhantomSupportedChains) {
      const rpcUrl = rpcUrls[chain];
      const { address, ...methods } = await getWalletMethods({
        chain,
        covalentApiKey,
        ethplorerApiKey,
        rpcUrl,
      });

      addChain({
        ...methods,
        chain,
        address,
        walletType: WalletOption.PHANTOM,
        balance: [],
      });
    }

    try {
      const chains = typeof chainOrChains === "string" ? [chainOrChains] : chainOrChains;

      for (const chain of chains) {
        await connectChain(chain);
      }

      return true;
    } catch (error) {
      if (error instanceof SwapKitError) throw error;

      throw new SwapKitError("wallet_connection_rejected_by_user");
    }
  };
}

export const phantomWallet = { connectPhantom } as const;
